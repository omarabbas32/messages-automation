import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import OpenAI from "openai";
import dotenv from "dotenv";
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import * as db from "./database.js";
import { requireAuth } from './middleware/requireAuth.js';
import { initPgVector, query as pgQuery } from './pg_database.js';
import { getEmbedding } from './embedding_service.js';
import multer from 'multer';
import { processExcelInventory } from './excel_processor.js';

// Setup Multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

// Global Crash Diagnostics
process.on('uncaughtException', (err) => {
    console.error('🔴 CRITICAL: Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔴 CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

const app = express();
app.use(express.json());
app.use(cookieParser());

// Support for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the React app's build directory
app.use(express.static(path.join(__dirname, 'dashboard-react/dist')));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "mytoken123";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;


let openai;
if (OPENAI_API_KEY && OPENAI_API_KEY !== "هنا_تحط_API_بتاع_OpenAI") {
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

console.log("🚀 Server starting...");

// Initialize pgvector extension (no-op if Postgres not available)
(async () => {
    try {
        await initPgVector();
    } catch (err) {
        console.warn('pgvector init skipped or failed:', err?.message || err);
    }
})();

// ==================== WEBHOOK ENDPOINTS ====================

/**
 * Webhook verification (GET)
 * Facebook uses this to verify your webhook URL
 */
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verified successfully");
        res.send(challenge);
    } else {
        console.log("❌ Webhook verification failed");
        res.sendStatus(403);
    }
});

/**
 * Webhook event handler (POST)
 * Receives messages from ALL connected Facebook Pages
 */
app.post("/webhook", async (req, res) => {
    const body = req.body;

    // DEBUG: Log every incoming request to see what Facebook/Instagram is sending
    console.log("🔍 [DEBUG WEBHOOK] Incoming POST request:");
    console.log(JSON.stringify(body, null, 2));

    if (body.object === "page" || body.object === "instagram") {
        const isInstagram = body.object === "instagram";
        
        // Process each entry
        for (const entry of body.entry) {
            // For FB, id is the pageId. For IG, it's also the account ID.
            const accountId = entry.id;

            // Process each messaging event
            for (const event of entry.messaging || []) {
                const senderId = event.sender.id;
                const message = event.message?.text;
                const isEcho = event.message?.is_echo;

                if (isEcho) {
                    console.log(`↩️ [${isInstagram ? 'IG' : 'FB'}] Ignoring echo message from ${senderId}`);
                    continue;
                }

                if (message) {
                    console.log(`📨 [${isInstagram ? 'IG' : 'FB'}] Message from ${senderId} to ${accountId}: "${message}"`);
                    await handleMessage(accountId, senderId, message);
                }
            }
        }

        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

/**
 * Handle incoming message with page-specific rules
 */
async function handleMessage(pageId, senderId, message) {
  try {
    // 1. Get page information from PostgreSQL
    const page = await db.getPage(pageId);
    if (!page) {
      console.log(`⚠️ Page ${pageId} not found in database`);
      return;
    }

    console.log(`📄 Processing message for: ${page.page_name}`);

    // 2. Fetch owner's API key if available
    const ownerSettings = await db.getUserSettings(page.owner_id);
    const userApiKey = ownerSettings?.openai_api_key;
    
    // Create a local OpenAI client if user has their own key
    let activeOpenai = openai;
    if (userApiKey) {
      console.log(`🔑 Using user's personal OpenAI API key for ${page.owner_id}`);
      activeOpenai = new OpenAI({ apiKey: userApiKey });
    }

    // 3. Check keyword rules first
    const rules = await db.getRules(pageId);
    console.log(`📋 Found ${rules.length} rules for this page`);

    const msgLower = message.toLowerCase();
    for (const rule of rules) {
      if (msgLower.includes(rule.keyword.toLowerCase())) {
        console.log(`✅ Keyword matched: "${rule.keyword}"`);
        await sendMessage(page.page_token, senderId, rule.reply, page.platform, pageId);
        return;
      }
    }

    // 4. No keyword matched — use AI
    console.log("🤖 No keyword matched");

    if (!page.ai_enabled || !activeOpenai) {
      const fallback = page.ai_enabled
        ? "شكراً لرسالتك! سيتم الرد عليك قريباً."
        : "شكراً لرسالتك! سيتم الرد عليك من قبل فريق الدعم قريباً.";
      await sendMessage(page.page_token, senderId, fallback, page.platform, pageId);
      return;
    }

    try {
      console.log("🧠 Using AI with RAG...");

      // 4a. RAG — find top 3 most relevant knowledge chunks for this message
      let knowledgeContext = '';
      if (page.knowledge_base && page.knowledge_base.trim().length > 0) {
        try {
          // Pass userApiKey to getEmbedding so it uses their quota
          const qEmbedding = await getEmbedding(message, userApiKey);
          const vecLiteral = '[' + qEmbedding.join(',') + ']';

          const ragResult = await pgQuery(
            `SELECT content, 1 - (embedding <#> $1::vector) AS score
             FROM page_documents
             WHERE page_id = $2 AND (doc_type = 'knowledge_chunk' OR doc_type = 'excel_inventory') AND embedding IS NOT NULL
             ORDER BY embedding <#> $1::vector
             LIMIT 5`,
            [vecLiteral, pageId]
          );

          if (ragResult.rows.length > 0) {
            const chunks = ragResult.rows.map(r => r.content).join('\n\n---\n\n');
            knowledgeContext = `\n\n📚 معلومات ذات صلة:\n${chunks}`;
            console.log(`📎 RAG: injected ${ragResult.rows.length} chunks`);
          }
        } catch (ragErr) {
          // If RAG fails, fall back to no knowledge context rather than crashing
          console.warn('⚠️ RAG lookup failed, continuing without knowledge:', ragErr.message);
        }
      }

      // 4b. Get conversation messages for context (limited by page settings)
      const contextLimit = page.ai_context_limit || 5;
      const historyRes = await db.getConversation(pageId, senderId);
      const history = historyRes.slice(-contextLimit);
      console.log(`💬 Context: sending last ${history.length} messages to AI`);

      // 4c. Build the prompt
      const globalInstructions = ownerSettings?.ai_global_instructions ? `${ownerSettings.ai_global_instructions}\n\n` : '';
      const systemPrompt =
        globalInstructions +
        `أنت مساعد خدمة عملاء لصفحة "${page.page_name}" على فيسبوك.` +
        `${knowledgeContext}\n\n` +
        `التعليمات: ${page.ai_instructions || 'أجب بشكل محترف ومفيد.'}\n` +
        `ملاحظة: رد بنفس لغة العميل.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message }
      ];

      // Use user-defined defaults or system fallback
      const gptReply = await activeOpenai.chat.completions.create({
        model: ownerSettings?.ai_default_model || "gpt-4o-mini",
        messages,
        temperature: ownerSettings?.ai_default_temperature !== undefined ? parseFloat(ownerSettings.ai_default_temperature) : 0.7,
        max_tokens: ownerSettings?.ai_default_max_tokens ? parseInt(ownerSettings.ai_default_max_tokens) : 250
      });

      const aiResponse = gptReply.choices[0].message.content;
      const tokensUsed = gptReply.usage?.total_tokens || 0;
      console.log(`📊 AI Usage: ${tokensUsed} tokens`);

      // 4d. Save both messages in conversation history
      await db.saveConversation(pageId, senderId, "user", message);
      await db.saveConversation(pageId, senderId, "assistant", aiResponse);

      await sendMessage(page.page_token, senderId, aiResponse, page.platform, pageId);
      console.log("✅ AI response sent");

      // 4e. Increment user usage count
      await db.incrementUserUsage(page.owner_id, tokensUsed);

    } catch (error) {
      console.error("❌ OpenAI error:", error.message);
      await sendMessage(
        page.page_token, senderId,
        "عذراً، حدث خطأ مؤقت. يرجى المحاولة لاحقاً.",
        page.platform, pageId
      );
    }

  } catch (error) {
    console.error("❌ Error handling message:", error);
  }
}

async function sendMessage(pageToken, senderId, text, platform = 'facebook', accountId = null) {
    try {
        let url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`;
        
        // Instagram uses a different endpoint format
        if (platform === 'instagram' && accountId) {
            url = `https://graph.facebook.com/v19.0/${accountId}/messages?access_token=${pageToken}`;
        }

        await axios.post(
            url,
            {
                recipient: { id: senderId },
                message: { text },
            }
        );
        console.log(`✉️ [${platform}] Reply sent to ${senderId}`);
    } catch (error) {
        console.error(`❌ Error sending ${platform} message:`, error.response?.data || error.message);
    }
}

// ==================== AUTHENTICATION ====================

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, userId: user.clerk_id, email: user.email, plan: user.plan },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id, userId: user.clerk_id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );
}

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`📝 Registration attempt for: ${email}`);
        
        if (!email || !password) {
            console.log('❌ Registration failed: Missing email or password');
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }

        const existing = await db.getUserByEmail(email);
        if (existing) {
            console.log(`❌ Registration failed: User ${email} already exists`);
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        console.log('⏳ Creating user in database...');
        const user = await db.createUser(email, password);
        console.log(`✅ User created with ID: ${user.id}`);
        
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
        
        console.log('⏳ Saving refresh token...');
        await db.saveRefreshToken(user.id, refreshToken, expiresAt);
        console.log('✅ Refresh token saved');

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        });

        console.log('🎉 Registration successful');
        res.json({ success: true, user, accessToken });
    } catch (error) {
        console.error('❌ Registration Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`🔑 Login attempt for: ${email}`);
        
        const user = await db.getUserByEmail(email);
        
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            console.log(`❌ Login failed for: ${email}`);
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
        await db.saveRefreshToken(user.id, refreshToken, expiresAt);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        });

        console.log(`✅ Login successful for: ${email}`);
        res.json({ success: true, user: { id: user.id, userId: user.clerk_id, email: user.email, plan: user.plan }, accessToken });
    } catch (error) {
        console.error('❌ Login Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
});

app.post('/api/auth/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json({ success: false, error: 'No refresh token' });

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const isValid = await db.verifyRefreshToken(decoded.id, refreshToken);

        if (!isValid) return res.status(401).json({ success: false, error: 'Invalid refresh token' });

        const user = await db.getUserSettings(decoded.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        await db.revokeRefreshToken(refreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
        await db.saveRefreshToken(user.id, newRefreshToken, expiresAt);

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        });

        res.json({ success: true, accessToken: newAccessToken, user });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Session expired' });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        await db.revokeRefreshToken(refreshToken);
    }
    res.clearCookie('refreshToken');
    res.json({ success: true });
});

// ==================== FACEBOOK OAUTH FLOW ====================

app.get('/api/auth/facebook/url', requireAuth, (req, res) => {
    const appId = process.env.FB_APP_ID;
    const redirectUri = process.env.FB_REDIRECT_URI; 
    const state = req.userId;
    
    const scopes = [
        'pages_messaging',
        'pages_manage_metadata',
        'pages_read_engagement',
        'public_profile',
        'email'
    ];

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes.join(',')}`;
    
    res.json({ success: true, url: authUrl });
});

app.get('/api/auth/instagram/url', requireAuth, (req, res) => {
    // Use dedicated IG app if configured, otherwise fall back to main FB app
    const appId = process.env.IG_APP_ID || process.env.FB_APP_ID;
    const redirectUri = process.env.IG_REDIRECT_URI;
    const state = req.userId;
    
    if (!appId || !redirectUri) {
        return res.status(500).json({ success: false, error: 'Instagram app not configured. Set IG_REDIRECT_URI in .env' });
    }

    const scopes = [
        'instagram_basic',
        'instagram_manage_messages',
        'pages_show_list',
        'pages_read_engagement',
        'public_profile'
    ];

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes.join(',')}`;
    
    res.json({ success: true, url: authUrl });
});

app.get('/api/auth/instagram/callback', async (req, res) => {
    const { code, state: userId } = req.query;
    
    if (!code) return res.status(400).send("Authorization failed: No code provided.");

    try {
        const igAppId     = process.env.IG_APP_ID || process.env.FB_APP_ID;
        const igAppSecret = process.env.IG_APP_SECRET || process.env.FB_APP_SECRET;
        const redirectUri = process.env.IG_REDIRECT_URI;

        // 1. Exchange code for short-lived user access token
        const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
            params: {
                client_id: igAppId,
                client_secret: igAppSecret,
                redirect_uri: redirectUri,
                code
            }
        });

        const userAccessToken = tokenRes.data.access_token;

        // 2. Exchange for long-lived user token (60 days)
        const longLivedRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: igAppId,
                client_secret: igAppSecret,
                fb_exchange_token: userAccessToken
            }
        });

        const longLivedUserToken = longLivedRes.data.access_token;

        // 3. Get the Facebook Pages linked to this user, expanding to their IG Business Accounts
        const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts`, {
            params: { 
                access_token: longLivedUserToken,
                fields: 'id,name,access_token,instagram_business_account{id,name,username,ig_id}'
            }
        });

        // DEEP DEBUG: Log everything Meta returns during discovery
        console.log('🔍 [DEBUG IG DISCOVERY] Full Meta Identity Response:', JSON.stringify(pagesRes.data, null, 2));

        const igAccounts = [];
        for (const page of pagesRes.data.data) {
            if (page.instagram_business_account) {
                const igAccount = page.instagram_business_account;
                
                // Deep ID Logic:
                // We save 'igAccount.id' as the primary ID.
                // We use 'igAccount.ig_id' OR the 'page.id' (Facebook Page ID) as the ig_user_id fallback.
                // This maximizes the chances of matching the webhook's entry.id.
                igAccounts.push({
                    id: igAccount.id, 
                    name: igAccount.name || `@${igAccount.username}`,
                    access_token: page.access_token,
                    platform: 'instagram',
                    ig_user_id: igAccount.ig_id || page.id 
                });

                console.log(`📌 Found IG: ${igAccount.name} | NodeID: ${igAccount.id} | LegacyID: ${igAccount.ig_id} | LinkedPageID: ${page.id}`);
            }
        }

        if (igAccounts.length === 0) {
            return res.send(`
                <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0f0f0f;color:#fff">
                    <h2>⚠️ No Instagram Business Accounts Found</h2>
                    <p>Make sure your Instagram account is a <strong>Business or Creator</strong> account and is linked to a Facebook Page.</p>
                    <script>setTimeout(() => window.close(), 5000);</script>
                </body></html>
            `);
        }

        res.send(`
            <html>
            <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f0f0f; color: white;">
                <script>
                    const pages = ${JSON.stringify(igAccounts)};
                    if (window.opener) {
                        window.opener.postMessage({ type: 'IG_AUTH_SUCCESS', pages }, '*');
                        window.close();
                    } else {
                        document.body.innerHTML = '<h2>✅ Instagram Connected! You can close this window.</h2>';
                    }
                </script>
                <div style="text-align: center;">
                    <h2>✅ Connection successful!</h2>
                    <p>Closing window...</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('❌ IG OAuth Error:', error.response?.data || error.message);
        const errMsg = error.response?.data?.error?.message || error.message;
        res.status(500).send(`
            <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0f0f0f;color:#fff">
                <h2>❌ Instagram Authentication Failed</h2>
                <p style="color:#ff6b6b">${errMsg}</p>
                <script>setTimeout(() => window.close(), 6000);</script>
            </body></html>
        `);
    }
});

app.get('/api/auth/facebook/callback', async (req, res) => {
    const { code, state: userId } = req.query;
    
    if (!code) return res.status(400).send("Authorization failed: No code provided.");

    try {
        // 1. Exchange code for user access token
        // redirect_uri must EXACTLY match the one used in the auth URL
        const tokenRes = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
            params: {
                client_id: process.env.FB_APP_ID,
                client_secret: process.env.FB_APP_SECRET,
                redirect_uri: process.env.FB_REDIRECT_URI,
                code
            }
        });

        const userAccessToken = tokenRes.data.access_token;

        // 2. Exchange for long-lived user token (60 days)
        const longLivedRes = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: process.env.FB_APP_ID,
                client_secret: process.env.FB_APP_SECRET,
                fb_exchange_token: userAccessToken
            }
        });

        const longLivedUserToken = longLivedRes.data.access_token;

        // 3. Get list of pages and their tokens
        const pagesRes = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
            params: { access_token: longLivedUserToken }
        });

        const pages = pagesRes.data.data.map(page => ({
            id: page.id,
            name: page.name,
            access_token: page.access_token // These are already long-lived because the user token was long-lived
        }));

        // Send HTML that posts message to opener and closes itself
        // Using '*' as target origin so it works when frontend (localhost:5173) and backend (ngrok) are on different domains
        res.send(`
            <html>
            <body>
                <script>
                    const pages = ${JSON.stringify(pages)};
                    if (window.opener) {
                        window.opener.postMessage({ type: 'FB_AUTH_SUCCESS', pages }, '*');
                        window.close();
                    } else {
                        document.body.innerHTML = '<h2>✅ Connected! You can close this window.</h2>';
                    }
                </script>
                <h2>Connection successful! Closing window...</h2>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('❌ FB OAuth Error:', error.response?.data || error.message);
        res.status(500).send("FB Authentication Failed. Check server logs.");
    }
});

// ==================== API ENDPOINTS FOR DASHBOARD ====================

// Apply authentication to all /api routes below this line
app.use("/api", requireAuth);

/**
 * Get all pages
 * GET /api/pages
 */
app.get("/api/pages", async (req, res) => {
    try {
        const pages = await db.getAllPages(req.userId);
        res.json({ success: true, data: pages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Bulk connect pages from OAuth
 * POST /api/pages/bulk
 */
app.post("/api/pages/bulk", requireAuth, async (req, res) => {
    try {
        const { pages } = req.body; // Array of { id, name, access_token }
        if (!pages || !Array.isArray(pages)) return res.status(400).json({ success: false, error: "Invalid pages data" });

        const results = [];
        console.log(`📥 Starting bulk import for user ${req.userId} with ${pages.length} pages.`);
        
        for (const p of pages) {
            try {
                // 1. Add/Update page in DB
                const result = await db.addPage(
                    req.userId, 
                    p.id, 
                    p.access_token, 
                    p.name, 
                    5, 
                    p.platform || 'facebook', 
                    p.ig_user_id || null
                );
                
                if (result.success) {
                    console.log(`✅ ${p.platform === 'instagram' ? 'IG Account' : 'Page'} ${p.name} (${p.id}) saved/updated.`);
                } else {
                    console.warn(`⚠️ ${p.name} save result:`, result.error);
                }

                // 2. Subscribe webhook
                const subscribeUrl = p.platform === 'instagram' 
                    ? `https://graph.facebook.com/v19.0/${p.id}/subscribed_apps` 
                    : `https://graph.facebook.com/v19.0/${p.id}/subscribed_apps`;
                
                await axios.post(subscribeUrl, null, {
                    params: {
                        access_token: p.access_token,
                        subscribed_fields: p.platform === 'instagram' ? 'messages,comments' : 'messages,messaging_postbacks'
                    }
                });
                console.log(`📡 Subscribed webhook to ${p.platform}: ${p.name}`);
                
                results.push({ id: p.id, name: p.name, success: true });
            } catch (pErr) {
                console.error(`❌ Failed processing page ${p.name}:`, pErr.response?.data || pErr.message);
                results.push({ id: p.id, name: p.name, success: false, error: pErr.message });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('❌ Bulk import critical error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Vector search endpoint
 * POST /api/search/vector
 * Body: { query: string, top_k?: number }
 */
app.post('/api/search/vector', async (req, res) => {
    try {
        const { query } = req.body;
        const top_k = Number(req.body.top_k || 10);
        const owner_id = req.userId;

        if (!query) return res.status(400).json({ success: false, error: 'Missing query' });
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ success: false, error: 'OpenAI not configured' });

        const qEmbedding = await getEmbedding(query);
        const vecLiteral = '[' + qEmbedding.join(',') + ']';

        const sql = `
            SELECT id, page_id, page_name, created_at,
                   1 - (embedding <#> $1::vector) AS score
            FROM pages
            WHERE embedding IS NOT NULL AND owner_id = $3
            ORDER BY embedding <#> $1::vector
            LIMIT $2
        `;

        const result = await pgQuery(sql, [vecLiteral, top_k, owner_id]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Vector search error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Handle Inventory Excel Upload
 * POST /api/pages/:pageId/inventory/upload
 */
app.post("/api/pages/:pageId/inventory/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { pageId } = req.params;
        const ownerId = req.userId;

        // 1. Verify page ownership
        const page = await db.getPageById(pageId);
        if (!page || page.owner_id !== ownerId) {
            return res.status(403).json({ success: false, error: "Unauthorized or page not found" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        // 2. Process the Excel file
        console.log(`🚀 Starting inventory import for Page ${pageId} (${page.page_name})`);
        // Use page.page_id (Facebook ID) for storing documents
        const result = await processExcelInventory(page.page_id, req.file.buffer);

        res.json({ 
            success: true, 
            message: `Successfully synced ${result.count} items to your inventory.`,
            count: result.count 
        });
    } catch (error) {
        console.error('❌ Inventory upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/search/documents', async (req, res) => {
    try {
        const { query } = req.body;
        const top_k = Number(req.body.top_k || 10);
        const owner_id = req.userId;

        if (!query) return res.status(400).json({ success: false, error: 'Missing query' });
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ success: false, error: 'OpenAI not configured' });

        const qEmbedding = await getEmbedding(query);
        const vecLiteral = '[' + qEmbedding.join(',') + ']';

        const sql = `
            SELECT pd.id, pd.page_id, p.page_name, pd.doc_id, pd.doc_type, pd.content,
                   1 - (pd.embedding <#> $1::vector) AS score
            FROM page_documents pd
            LEFT JOIN pages p ON p.page_id = pd.page_id
            WHERE pd.embedding IS NOT NULL AND p.owner_id = $3
            ORDER BY pd.embedding <#> $1::vector
            LIMIT $2
        `;

        const result = await pgQuery(sql, [vecLiteral, top_k, owner_id]);
        return res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Document search error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post("/api/pages", async (req, res) => {
    try {
        const { page_id, page_token, page_name } = req.body;
        const owner_id = req.userId;

        if (!page_id || !page_token || !page_name) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const result = await db.addPage(owner_id, page_id, page_token, page_name);

        if (result.success) {
            res.json({ success: true, id: result.id });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/pages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { page_name, page_token } = req.body;
        const owner_id = req.userId;

        const success = await db.updatePage(id, owner_id, page_name, page_token);
        if (success) res.json({ success: true });
        else res.status(404).json({ success: false, error: 'Not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete("/api/pages/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.userId;
        const success = await db.deletePage(id, owner_id);
        if (success) res.json({ success: true });
        else res.status(404).json({ success: false, error: 'Not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put("/api/pages/:id/ai", async (req, res) => {
    try {
        const { id } = req.params;
        const { ai_enabled, ai_instructions, ai_context_limit } = req.body;
        const owner_id = req.userId;
        const success = await db.updatePageAI(id, owner_id, ai_enabled, ai_instructions, ai_context_limit);
        if (success) res.json({ success: true });
        else res.status(404).json({ success: false, error: 'Not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put("/api/pages/:id/knowledge", async (req, res) => {
    try {
        const { id } = req.params;
        const { knowledge_base } = req.body;
        const owner_id = req.userId;
        const success = await db.updatePageKnowledge(id, owner_id, knowledge_base);
        if (success) res.json({ success: true });
        else res.status(404).json({ success: false, error: 'Not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get("/api/rules", async (req, res) => {
    try {
        const { page_id } = req.query;
        let rules;
        if (page_id) {
            rules = await db.getRulesByPageAndOwner(page_id, req.userId);
        } else {
            rules = await db.getAllRules(req.userId);
        }
        res.json({ success: true, data: rules });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/api/rules", async (req, res) => {
    try {
        const { page_id, keyword, reply } = req.body;
        const owner_id = req.userId;
        const result = await db.addRule(owner_id, page_id, keyword, reply);
        if (result.success) res.json({ success: true, id: result.id });
        else res.status(400).json({ success: false, error: result.error });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put("/api/rules/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { keyword, reply } = req.body;
        const owner_id = req.userId;
        const success = await db.updateRule(id, owner_id, keyword, reply);
        if (success) res.json({ success: true });
        else res.status(404).json({ success: false, error: 'Not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete("/api/rules/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.userId;
        const success = await db.deleteRule(id, owner_id);
        if (success) res.json({ success: true });
        else res.status(404).json({ success: false, error: 'Not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get("/api/user/settings", async (req, res) => {
    try {
        const settings = await db.getUserSettings(req.userId);
        if (!settings) return res.status(404).json({ success: false, error: 'Not found' });
        const isUsingSystemKey = !settings.openai_api_key;
        res.json({ success: true, data: { ...settings, is_using_system_key: isUsingSystemKey } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch("/api/user/settings", async (req, res) => {
    try {
        const { 
            openai_api_key, display_name, ai_default_model, 
            ai_default_temperature, ai_default_max_tokens, ai_global_instructions 
        } = req.body;

        // Prevent overwriting with masked key
        const updateData = { ...req.body };
        if (openai_api_key && openai_api_key.includes('...')) {
            delete updateData.openai_api_key;
        }

        if (Object.keys(updateData).length === 0) {
            return res.json({ success: true, message: 'No changes made' });
        }

        const success = await db.updateUserSettings(req.userId, updateData);
        if (success) res.json({ success: true });
        else res.status(400).json({ success: false, error: 'Failed to update settings' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch("/api/user/password", async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, error: 'Missing password fields' });
        }

        // Verify current password
        const userSettings = await db.getUserSettings(req.userId);
        const user = await db.getUserByEmail(userSettings.email);
        
        const isValid = await bcrypt.compare(current_password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Current password incorrect' });
        }

        const success = await db.updateUserPassword(req.userId, new_password);
        if (success) res.json({ success: true });
        else res.status(400).json({ success: false, error: 'Failed to update password' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Handle legacy dashboard.html path by redirecting to root
app.get('/dashboard.html', (req, res) => {
    res.redirect('/');
});

// Catch-all: serve the React app for any other requests (Express 5.x safe)
app.use((req, res) => {
    // If it's an API route that wasn't matched, don't serve the dashboard HTML
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API route not found" });
    }
    res.sendFile(path.join(__dirname, 'dashboard-react/dist', 'index.html'));
});

/**
 * Start Server
 */
app.listen(PORT, async () => {
  console.log(`\n🎉 SaaS Gateway running on port ${PORT}`);
  console.log(`🔗 Webhook: ${process.env.FB_REDIRECT_URI.replace('/api/auth/facebook/callback', '')}/webhook`);
  
  try {
    await db.initDatabase();
    await initPgVector();
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    console.warn('⚠️ Server is running but database-dependent features will fail.');
  }
});

export default app;

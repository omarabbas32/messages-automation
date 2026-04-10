import express from "express";
import axios from "axios";
import OpenAI from "openai";
import dotenv from "dotenv";
import * as db from "./database.js";
import { initPgVector, query as pgQuery } from './pg_database.js';
import { getEmbedding } from './embedding_service.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public")); // Serve dashboard files

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "mytoken123";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;


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

    // DEBUG: Log every incoming request to see what Facebook is sending
    console.log("🔍 [DEBUG WEBHOOK] Incoming POST request:");
    console.log(JSON.stringify(body, null, 2));

    if (body.object === "page") {
        // Process each entry
        for (const entry of body.entry) {
            // Get the page that received the message
            const pageId = entry.id;

            // Process each messaging event
            for (const event of entry.messaging || []) {
                const senderId = event.sender.id;
                const message = event.message?.text;

                if (message) {
                    console.log(`📨 Message from ${senderId} to Page ${pageId}: "${message}"`);
                    await handleMessage(pageId, senderId, message);
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
        // 1. Get page information from database
        const page = await db.getPage(pageId);


        if (!page) {
            console.log(`⚠️ Page ${pageId} not found in database`);
            return;
        }

        console.log(`📄 Processing message for: ${page.page_name}`);

        // 2. Get all rules for this page
        const rules = await db.getRules(pageId);

        console.log(`📋 Found ${rules.length} rules for this page`);

        // 3. Check if message matches any keyword
        const msgLower = message.toLowerCase();

        for (const rule of rules) {
            const keywordLower = rule.keyword.toLowerCase();

            if (msgLower.includes(keywordLower)) {
                console.log(`✅ Keyword matched: "${rule.keyword}"`);
                await sendMessage(page.page_token, senderId, rule.reply);
                return; // Stop after first match
            }
        }

        // 4. No keyword matched - use OpenAI fallback (if configured)
        console.log("🤖 No keyword matched");

        // Check if AI is enabled for this page
        if (page.ai_enabled && openai) {
            try {
                console.log("🧠 Using AI model for response...");

                // Get conversation history for context
                const history = await db.getConversation(pageId, senderId);

                // Build messages array with system prompt and history
                const knowledgeSection = page.knowledge_base
                    ? `\n\n📚 معلومات الصفحة والأعمال (استخدم هذه المعلومات للإجابة على الأسئلة):\n${page.knowledge_base}`
                    : '';

                const messages = [
                    {
                        role: "system",
                        content: `أنت مساعد خدمة عملاء لصفحة "${page.page_name}" على فيسبوك.${knowledgeSection}\n\nتعليمات:\n${page.ai_instructions || 'قم بالرد بشكل محترف ومفيد على استفسارات العملاء.'}\n\nملاحظة: احرص على الرد بنفس لغة العميل (عربي أو إنجليزي). استخدم دائماً المعلومات المتاحة لك للإجابة بدقة.`
                    },
                    ...history,
                    { role: "user", content: message }
                ];

                const gptReply = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 500
                });

                const aiResponse = gptReply.choices[0].message.content;

                // Save conversation history
                await db.saveConversation(pageId, senderId, "user", message);
                await db.saveConversation(pageId, senderId, "assistant", aiResponse);

                await sendMessage(page.page_token, senderId, aiResponse);
                console.log("✅ AI response sent successfully");
            } catch (error) {
                console.error("❌ OpenAI error:", error.message);
                await sendMessage(
                    page.page_token,
                    senderId,
                    "عذراً، حدث خطأ مؤقت. يرجى إعادة المحاولة أو التواصل مع فريق الدعم."
                );
            }
        } else if (!page.ai_enabled) {
            console.log("⚠️ AI is disabled for this page");
            await sendMessage(
                page.page_token,
                senderId,
                "شكراً لرسالتك! سيتم الرد عليك من قبل فريق الدعم قريباً."
            );
        } else {
            console.log("⚠️ OpenAI not configured");
            await sendMessage(
                page.page_token,
                senderId,
                "شكراً لرسالتك! سيتم الرد عليك قريباً."
            );
        }

    } catch (error) {
        console.error("❌ Error handling message:", error);
    }
}

async function sendMessage(pageToken, senderId, text) {
    try {
        await axios.post(
            `https://graph.facebook.com/v17.0/me/messages?access_token=${pageToken}`,
            {
                recipient: { id: senderId },
                message: { text },
            }
        );
        console.log(`✉️ Reply sent to ${senderId}`);
    } catch (error) {
        console.error("❌ Error sending message:", error.response?.data || error.message);
    }
}

// ==================== API ENDPOINTS FOR DASHBOARD ====================

/**
 * Get all pages
 * GET /api/pages
 */
app.get("/api/pages", async (req, res) => {
    try {
        const pages = await db.getAllPages();
        res.json({ success: true, data: pages });
    } catch (error) {
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

        if (!query) return res.status(400).json({ success: false, error: 'Missing query' });
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ success: false, error: 'OpenAI not configured' });

        // 1. Embed the query
        const qEmbedding = await getEmbedding(query);

        // Convert to Postgres vector literal: e.g. '[0.1,0.2, ...]'
        const vecLiteral = '[' + qEmbedding.join(',') + ']';

        // 2. Run pgvector ANN search (cosine via vector_cosine_ops)
        const sql = `
            SELECT id, page_id, page_name, created_at,
                   1 - (embedding <#> $1::vector) AS score
            FROM pages
            WHERE embedding IS NOT NULL
            ORDER BY embedding <#> $1::vector
            LIMIT $2
        `;

        const result = await pgQuery(sql, [vecLiteral, top_k]);

        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Vector search error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Document-level vector search
 * POST /api/search/documents
 * Body: { query: string, top_k?: number }
 */
app.post('/api/search/documents', async (req, res) => {
    try {
        const { query } = req.body;
        const top_k = Number(req.body.top_k || 10);

        if (!query) return res.status(400).json({ success: false, error: 'Missing query' });
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ success: false, error: 'OpenAI not configured' });

        const qEmbedding = await getEmbedding(query);
        const vecLiteral = '[' + qEmbedding.join(',') + ']';

        const sql = `
            SELECT pd.id, pd.page_id, p.page_name, pd.doc_id, pd.doc_type, pd.content,
                   1 - (pd.embedding <#> $1::vector) AS score
            FROM page_documents pd
            LEFT JOIN pages p ON p.page_id = pd.page_id
            WHERE pd.embedding IS NOT NULL
            ORDER BY pd.embedding <#> $1::vector
            LIMIT $2
        `;

        const result = await pgQuery(sql, [vecLiteral, top_k]);
        return res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Document search error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Add a new page
 * POST /api/pages
 * Body: { page_id, page_token, page_name }
 */
app.post("/api/pages", async (req, res) => {
    try {
        const { page_id, page_token, page_name } = req.body;

        if (!page_id || !page_token || !page_name) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: page_id, page_token, page_name",
            });
        }

        const result = await db.addPage(page_id, page_token, page_name);

        if (result.success) {
            res.json({ success: true, message: "Page added successfully", id: result.id });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update page metadata (name, token)
 * PUT /api/pages/:id
 * Body: { page_name?, page_token? }
 */
app.put('/api/pages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { page_name, page_token } = req.body;

        if (page_name === undefined && page_token === undefined) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        const success = await db.updatePage(id, page_name, page_token);

        if (success) {
            res.json({ success: true, message: 'Page updated and synced' });
        } else {
            res.status(404).json({ success: false, error: 'Page not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delete a page
 * DELETE /api/pages/:id
 */
app.delete("/api/pages/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const success = await db.deletePage(id);

        if (success) {
            res.json({ success: true, message: "Page deleted successfully" });
        } else {
            res.status(404).json({ success: false, error: "Page not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update page AI settings
 * PUT /api/pages/:id/ai
 * Body: { ai_enabled, ai_instructions }
 */
app.put("/api/pages/:id/ai", async (req, res) => {
    try {
        const { id } = req.params;
        const { ai_enabled, ai_instructions } = req.body;

        const success = await db.updatePageAI(id, ai_enabled, ai_instructions);

        if (success) {
            res.json({ success: true, message: "AI settings updated successfully" });
        } else {
            res.status(404).json({ success: false, error: "Page not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update page knowledge base
 * PUT /api/pages/:id/knowledge
 * Body: { knowledge_base: string }
 */
app.put("/api/pages/:id/knowledge", async (req, res) => {
    try {
        const { id } = req.params;
        const { knowledge_base } = req.body;

        if (knowledge_base === undefined) {
            return res.status(400).json({ success: false, error: "Missing knowledge_base field" });
        }

        const success = await db.updatePageKnowledge(id, knowledge_base);

        if (success) {
            res.json({ success: true, message: "Knowledge base updated successfully" });
        } else {
            res.status(404).json({ success: false, error: "Page not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get rules (optionally filtered by page_id)
 * GET /api/rules?page_id=XXX
 */
app.get("/api/rules", async (req, res) => {
    try {
        const { page_id } = req.query;

        const rules = page_id ? await db.getRules(page_id) : await db.getAllRules();
        res.json({ success: true, data: rules });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Add a new rule
 * POST /api/rules
 * Body: { page_id, keyword, reply }
 */
app.post("/api/rules", async (req, res) => {
    try {
        const { page_id, keyword, reply } = req.body;

        if (!page_id || !keyword || !reply) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: page_id, keyword, reply",
            });
        }

        const result = await db.addRule(page_id, keyword, reply);

        if (result.success) {
            res.json({ success: true, message: "Rule added successfully", id: result.id });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update a rule
 * PUT /api/rules/:id
 * Body: { keyword, reply }
 */
app.put("/api/rules/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { keyword, reply } = req.body;

        if (!keyword || !reply) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: keyword, reply",
            });
        }

        const success = await db.updateRule(id, keyword, reply);

        if (success) {
            res.json({ success: true, message: "Rule updated successfully" });
        } else {
            res.status(404).json({ success: false, error: "Rule not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delete a rule
 * DELETE /api/rules/:id
 */
app.delete("/api/rules/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const success = await db.deleteRule(id);

        if (success) {
            res.json({ success: true, message: "Rule deleted successfully" });
        } else {
            res.status(404).json({ success: false, error: "Rule not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`\n🎉 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook\n`);
});

// Export app for testing (do not start server when running tests)
if (process.env.NODE_ENV !== 'test') {
    // server already started above in normal runs
} else {
    console.log('🧪 Running in test mode; server.listen suppressed');
}

export default app;

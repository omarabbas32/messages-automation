# 04 — Phase 3: Queue System, Scalability & Reliability

## 🎯 Goal
The current architecture processes AI responses **synchronously inside the webhook handler**. This means:

- If OpenAI is slow (2–5 seconds), Facebook receives a timeout and may retry the webhook
- If 100 messages arrive simultaneously, the server stalls
- There is no retry logic if OpenAI fails

This phase adds a **job queue** (BullMQ + Redis) so messages are processed in the background reliably.

---

## 🏗️ Architecture Change

### Before (Problematic)
```
Facebook POST /webhook
       │
       ▼ (must respond within 5 seconds)
  handleMessage()
       │ (can take 3–10 seconds for OpenAI)
       ▼
  OpenAI API call
       │
       ▼
  sendMessage()
       │
       ▼
  res.sendStatus(200) ← Too late! Facebook already timed out
```

### After (Correct)
```
Facebook POST /webhook
       │
       ▼
  Validate & Enqueue Job (< 50ms)
       │
       ▼
  res.sendStatus(200) ← Instant response to Facebook ✅
  
  
  (Background Worker Process)
  Queue Worker picks up job:
       │
       ▼
  handleMessage()
       │
       ▼
  OpenAI API call (takes as long as needed)
       │
       ▼
  sendMessage() via Facebook Graph API
```

---

## 📋 Step-by-Step Implementation

### Step 1: Set Up Redis

**Option A (Local Development):**
```bash
# Windows (via WSL or Docker)
docker run -d -p 6379:6379 redis:alpine
```

**Option B (Production — Railway):**
- Add a Redis service in Railway — it gives you a `REDIS_URL` env variable automatically.

Add to `.env`:
```env
REDIS_URL=redis://localhost:6379
```

---

### Step 2: Install BullMQ

```bash
npm install bullmq ioredis
```

---

### Step 3: Create the Message Queue

**New file: `queue/messageQueue.js`**
```javascript
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null // Required by BullMQ
});

// The queue that holds incoming Facebook messages
export const messageQueue = new Queue('facebook-messages', {
    connection,
    defaultJobOptions: {
        attempts: 3,            // Retry failed jobs up to 3 times
        backoff: {
            type: 'exponential',
            delay: 2000         // Wait 2s, 4s, 8s between retries
        },
        removeOnComplete: 100,  // Keep last 100 completed jobs for logging
        removeOnFail: 500       // Keep last 500 failed jobs for debugging
    }
});

export { connection };
```

---

### Step 4: Create the Worker

**New file: `queue/messageWorker.js`**
```javascript
import { Worker } from 'bullmq';
import { connection } from './messageQueue.js';
import * as db from '../database.js';
import OpenAI from 'openai';
import axios from 'axios';
import { User } from '../models/User.js';
import { canUseAI } from '../middleware/checkPlanLimit.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const worker = new Worker('facebook-messages', async (job) => {
    const { pageId, senderId, message } = job.data;

    console.log(`🔧 Processing job ${job.id}: Message from ${senderId} on page ${pageId}`);

    const page = await db.getPageByPageId(pageId);
    if (!page) {
        console.warn(`⚠️ Job ${job.id}: Page ${pageId} not found, skipping.`);
        return;
    }

    // 1. Check keyword rules first
    const rules = await db.getRules(pageId);
    const msgLower = message.toLowerCase();
    for (const rule of rules) {
        if (msgLower.includes(rule.keyword.toLowerCase())) {
            await sendMessage(page.page_token, senderId, rule.reply);
            console.log(`✅ Job ${job.id}: Keyword rule matched "${rule.keyword}"`);
            return;
        }
    }

    // 2. AI Fallback
    if (!page.ai_enabled) {
        await sendMessage(page.page_token, senderId, 'شكراً لرسالتك! سيتم الرد عليك قريباً.');
        return;
    }

    // 3. Check plan limits
    const owner = await User.findOne({ clerk_id: page.owner_id });
    const allowed = await canUseAI(owner);
    if (!allowed) {
        await sendMessage(page.page_token, senderId,
            'عذراً، وصلنا للحد الأقصى من الردود هذا الشهر.');
        return;
    }

    // 4. Call OpenAI
    const history = await db.getConversation(pageId, senderId);
    const gptReply = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: buildSystemPrompt(page) },
            ...history,
            { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
    });

    const aiResponse = gptReply.choices[0].message.content;

    // 5. Save history & send
    await db.saveConversation(pageId, senderId, 'user', message);
    await db.saveConversation(pageId, senderId, 'assistant', aiResponse);
    await User.updateOne({ _id: owner._id }, { $inc: { ai_messages_used: 1 } });
    await sendMessage(page.page_token, senderId, aiResponse);

    console.log(`✅ Job ${job.id}: AI response sent to ${senderId}`);

}, { connection, concurrency: 10 }); // Process up to 10 messages simultaneously

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed after ${job.opts.attempts} attempts:`, err.message);
});

function buildSystemPrompt(page) {
    const kb = page.knowledge_base 
        ? `\n\n📚 Business Information:\n${page.knowledge_base}` : '';
    return `You are a customer service assistant for "${page.page_name}" on Facebook.${kb}
\nInstructions:\n${page.ai_instructions || 'Reply professionally and helpfully.'}
\nNote: Always reply in the same language as the customer.`;
}

async function sendMessage(token, recipientId, text) {
    await axios.post(
        `https://graph.facebook.com/v17.0/me/messages?access_token=${token}`,
        { recipient: { id: recipientId }, message: { text } }
    );
}

export default worker;
```

---

### Step 5: Update the Webhook to Just Enqueue

**Update `server.js`:**
```javascript
import { messageQueue } from './queue/messageQueue.js';

app.post('/webhook', async (req, res) => {
    // Respond to Facebook immediately
    res.sendStatus(200);

    const body = req.body;
    if (body.object !== 'page') return;

    for (const entry of body.entry) {
        const pageId = entry.id;
        for (const event of entry.messaging || []) {
            const senderId = event.sender.id;
            const message = event.message?.text;
            const messageId = event.message?.mid;

            if (!message) continue;

            // Check for duplicate (idempotency)
            const alreadyProcessed = await redis.get(`msg:${messageId}`);
            if (alreadyProcessed) continue;
            await redis.set(`msg:${messageId}`, '1', 'EX', 86400); // Expire in 24h

            // Add to queue — non-blocking
            await messageQueue.add('handle-message', {
                pageId, senderId, message, messageId
            });
            console.log(`📥 Queued message from ${senderId} on page ${pageId}`);
        }
    }
});
```

---

### Step 6: Start Worker in Separate Process

**Update `package.json`:**
```json
{
  "scripts": {
    "start": "node server.js",
    "worker": "node queue/messageWorker.js",
    "start:all": "concurrently \"npm run start\" \"npm run worker\""
  }
}
```

```bash
npm install concurrently
npm run start:all
```

On **Railway** or **Render**, run the worker as a separate service pointing to `node queue/messageWorker.js`.

---

### Step 7: Add Queue Dashboard (Optional but Recommended)

**Bull Board** provides a visual interface to monitor jobs:

```bash
npm install @bull-board/express @bull-board/api
```

```javascript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
    queues: [new BullMQAdapter(messageQueue)],
    serverAdapter
});

// Protect with basic auth in production
serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', requireAuth, serverAdapter.getRouter());
```

Access at: `http://localhost:3000/admin/queues`

---

## ✅ Acceptance Criteria

- [ ] Webhook always responds with `200 OK` in under 100ms
- [ ] Messages appear in BullMQ queue and are processed within 5 seconds
- [ ] If OpenAI fails, job retries 3 times with exponential backoff
- [ ] Duplicate messages (same `mid`) are not processed twice
- [ ] Worker can be scaled independently from the Express server

---

## 📁 Files Changed

| File | Action |
|------|--------|
| `queue/messageQueue.js` | NEW — BullMQ queue definition |
| `queue/messageWorker.js` | NEW — Background worker process |
| `server.js` | MODIFY — Webhook now enqueues instead of processing directly |
| `package.json` | MODIFY — Add `worker` and `start:all` scripts |
| `.env` | MODIFY — Add `REDIS_URL` |

# 06 — Full SaaS Database Schema

This document shows the **complete MongoDB and PostgreSQL schema** for the SaaS version. Every collection/table is documented with field types, indexes, and relationships.

---

## MongoDB Collections

### 1. `users` Collection

Stores account and billing data for each registered user.

```javascript
{
    _id: ObjectId,
    clerk_id: String,              // Clerk user ID — primary lookup key
    email: String,                 // User email from Clerk
    
    // Billing
    plan: String,                  // 'free' | 'pro' | 'agency'
    stripe_customer_id: String,    // Stripe Customer ID (null until first upgrade)
    stripe_subscription_id: String, // Active Stripe Subscription ID (null if free)
    
    // Usage (for Free plan throttling)
    ai_messages_used: Number,      // Count of AI messages this month
    ai_messages_reset_at: Date,    // When the counter was last reset
    
    // Timestamps
    created_at: Date,
    updated_at: Date
}
```

**Indexes:**
```javascript
{ clerk_id: 1 }    // unique
{ email: 1 }       // unique
{ stripe_customer_id: 1 } // for Stripe webhook lookups
```

---

### 2. `pages` Collection

Stores Facebook page connections. Each page belongs to one user.

```javascript
{
    _id: ObjectId,
    owner_id: String,              // Clerk user ID of the owner
    page_id: String,               // Facebook Page ID (from Graph API)
    page_token: String,            // Facebook Page Access Token (encrypted at rest)
    page_name: String,             // Display name
    
    // AI Configuration
    ai_enabled: Boolean,           // Default: true
    ai_instructions: String,       // System prompt for AI
    knowledge_base: String,        // Business info injected into AI context
    
    // Status
    token_valid: Boolean,          // Set to false if we detect a 190 OAuth error
    token_expires_at: Date,        // Optional — for long-lived token tracking
    
    // Timestamps
    created_at: Date
}
```

**Indexes:**
```javascript
{ owner_id: 1 }         // For fetching user's pages
{ page_id: 1 }          // unique — for webhook lookups
{ owner_id: 1, page_id: 1 } // compound
```

---

### 3. `rules` Collection

Stores keyword → reply automation rules. Each rule belongs to one page and one user.

```javascript
{
    _id: ObjectId,
    owner_id: String,              // Clerk user ID (for ownership checks without joining)
    page_id: String,               // Facebook Page ID
    keyword: String,               // Trigger keyword (case-insensitive match)
    reply: String,                 // Auto-reply text
    is_active: Boolean,            // Default: true (allows disabling without deleting)
    match_type: String,            // 'contains' | 'exact' | 'starts_with' (default: 'contains')
    created_at: Date
}
```

**Indexes:**
```javascript
{ owner_id: 1 }
{ page_id: 1, is_active: 1 }  // For webhook rule lookups
```

---

### 4. `conversations` Collection

Stores recent message history for AI context (rolling window of last 10 messages).

```javascript
{
    _id: ObjectId,
    page_id: String,               // Facebook Page ID
    sender_id: String,             // Facebook User (Sender) ID
    messages: [
        {
            role: String,          // 'user' | 'assistant'
            content: String,
            timestamp: Date
        }
    ],                             // Max 10 messages (via $slice)
    updated_at: Date
}
```

**Indexes:**
```javascript
{ page_id: 1, sender_id: 1 }  // unique compound — fast lookup
{ updated_at: 1 }              // for TTL cleanup (auto-delete after 24h)
```

**TTL Index:**
```javascript
// Auto-delete conversations older than 24 hours
conversationSchema.index({ updated_at: 1 }, { expireAfterSeconds: 86400 });
```

---

### 5. `analytics` Collection

Stores per-event logs for usage analytics.

```javascript
{
    _id: ObjectId,
    owner_id: String,
    page_id: String,
    event_type: String,            // 'message_received' | 'keyword_matched' | 'ai_replied' | 'no_match' | 'error'
    rule_id: ObjectId,             // Ref to rules (null if not keyword event)
    sender_id: String,             // Anonymized or hashed for privacy
    timestamp: Date
}
```

**Indexes:**
```javascript
{ owner_id: 1, page_id: 1 }
{ page_id: 1, timestamp: -1 }   // For time-series queries
{ timestamp: 1 }                // TTL — auto-delete after 90 days
```

---

## PostgreSQL Tables (pgvector)

Used for **semantic/vector search** over page knowledge bases.

### `pages` Table

```sql
CREATE TABLE pages (
    id          SERIAL PRIMARY KEY,
    page_id     TEXT UNIQUE NOT NULL,    -- Mirrors MongoDB page_id
    owner_id    TEXT NOT NULL,           -- Clerk user ID
    page_name   TEXT,
    embedding   VECTOR(1536),           -- OpenAI text-embedding-ada-002
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON pages USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON pages (owner_id);
```

### `page_documents` Table

Stores chunked knowledge base content for per-chunk vector search.

```sql
CREATE TABLE page_documents (
    id          SERIAL PRIMARY KEY,
    page_id     TEXT NOT NULL,
    owner_id    TEXT NOT NULL,
    doc_id      TEXT NOT NULL,          -- Unique identifier for this chunk
    doc_type    TEXT,                   -- 'knowledge_base' | 'faq' | 'product'
    content     TEXT NOT NULL,          -- The actual text chunk
    embedding   VECTOR(1536),           -- Vector embedding of content
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON page_documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON page_documents (page_id);
CREATE INDEX ON page_documents (owner_id);
```

---

## Data Flow Diagram

```
User Signs Up (Clerk)
       │
       ▼
POST /api/webhooks/clerk
       │
       ▼
users.create({ clerk_id, email, plan: 'free' })


User Connects Facebook Page
       │
       ▼
POST /api/pages
       │
       ├──► pages.create({ owner_id, page_id, page_token, page_name })
       └──► pgvector pages.upsert({ page_id, owner_id, embedding })


Facebook Message Arrives → Worker Processes It
       │
       ├──► conversations.findOneAndUpdate (add message, max 10)
       ├──► analytics.create({ event_type: 'ai_replied', ... })
       └──► users.updateOne({ $inc: { ai_messages_used: 1 } })
```

---

## Encryption Recommendation

> [!CAUTION]
> `page_token` fields contain sensitive Facebook access tokens. Before storing them in MongoDB, encrypt with AES-256.

```javascript
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text) {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString();
}
```

Add to `.env`:
```env
ENCRYPTION_KEY=<32-byte hex string — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

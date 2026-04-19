# 01 — Product Overview & SaaS Architecture

## 🎯 Vision

**WinkWebhook** is a Facebook Messenger automation platform that lets businesses automatically respond to customer messages using AI and custom rules. The SaaS version will allow **any business** to connect their Facebook Page, configure the AI, and respond to customers 24/7 — without any coding.

---

## 📊 Current Architecture (Single-User)

```
Facebook Messenger
       │
       ▼
  Facebook Graph API
       │ (POST /webhook)
       ▼
  Express Server (Node.js)
       │
       ├──► MongoDB (Pages, Rules, Conversations)
       ├──► PostgreSQL + pgvector (Semantic Search)
       └──► OpenAI API (AI Responses)
```

**Problems with this architecture:**
- No user accounts — anyone with the URL can see/edit all pages
- All pages belong to no one (no `owner_id`)
- One webhook URL handles messages from all pages for all users
- No billing or usage limits

---

## 🏗️ Target SaaS Architecture

```
Internet Users
     │
     ▼
Landing Page (Next.js or React)
     │
     ▼
Auth System (Clerk / JWT)
     │
     ▼
Express API Server
     │
     ├──► MongoDB
     │       ├── users
     │       ├── pages        (with owner_id)
     │       ├── rules        (with owner_id)
     │       └── conversations
     │
     ├──► Redis + BullMQ (Message Queue)
     │       └── Worker Process (AI Response Handler)
     │
     ├──► PostgreSQL + pgvector (Semantic Search)
     │
     ├──► OpenAI API
     │
     └──► Stripe (Billing)

Facebook Graph API
     │ (POST /webhook — single shared URL)
     ▼
Express Webhook Handler
     │
     └──► Looks up page_id → finds owner → checks plan limits → queues job
```

---

## 📦 Phases Overview

| Phase | Name | Priority | Duration (est.) |
|-------|------|----------|-----------------|
| 1 | Authentication & Multi-Tenancy | 🔴 Critical | 1–2 weeks |
| 2 | Stripe Billing & Plans | 🟠 High | 1 week |
| 3 | Queue System & Scalability | 🟡 Medium | 1 week |
| 4 | Product Polish & Analytics | 🟢 Lower | 2 weeks |

---

## 🔑 Core SaaS Principles Applied

### 1. Data Isolation
Every database document that belongs to a user **must** have an `owner_id` field. Middleware validates this on every API request.

### 2. Stateless API
All state lives in the database. The server is stateless and can be horizontally scaled.

### 3. Idempotent Webhooks
Facebook may send duplicate webhook events. Every message handler must check if a message has already been processed (using `message_id`).

### 4. Graceful Degradation
If OpenAI is slow or Stripe is down, the app must not crash. Use queues and fallback messages.

---

## 💰 Business Model

| Plan | Price | Pages | AI Messages/mo | Rules/page |
|------|-------|-------|----------------|------------|
| **Free** | $0 | 1 | 100 | 5 |
| **Pro** | $29/mo | 10 | Unlimited | 50 |
| **Agency** | $99/mo | Unlimited | Unlimited | Unlimited |

---

## 🛠️ Tech Stack Decision

| Layer | Current | SaaS Target |
|-------|---------|-------------|
| Auth | None | **Clerk** (fastest) or Passport.js + JWT |
| Frontend | React + Vite | React + Vite (add landing page) |
| Backend | Express.js | Express.js (same, hardened) |
| Database | MongoDB + Mongoose | MongoDB + Mongoose (add `User` model) |
| Queue | None | **BullMQ** + Redis |
| Billing | None | **Stripe** |
| Hosting | Local/ngrok | **Railway** or **Render** |
| Domain | None | Custom domain + SSL |

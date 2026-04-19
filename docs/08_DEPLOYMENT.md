# 08 — Deployment Guide

This document covers how to deploy WinkWebhook SaaS to production. We cover two recommended platforms: **Railway** (simplest) and **Render** (more control), plus environment configuration.

---

## 🏆 Recommended: Railway

Railway is the fastest way to deploy a Node.js + MongoDB + Redis + Postgres stack. Everything can be provisioned from one dashboard.

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **"New Project"** → **"Deploy from GitHub repo"**.
3. Select `omarabbas32/wink-messages-automation`.

### Step 2: Add Services

In your Railway project, add these services:

| Service | How to Add |
|---------|-----------|
| **Node.js App** | Auto-detected from your repo |
| **MongoDB** | Click "+ New" → MongoDB plugin |
| **PostgreSQL** | Click "+ New" → PostgreSQL plugin |
| **Redis** | Click "+ New" → Redis plugin |

Railway auto-injects connection URLs as environment variables:
- `${{MongoDB.MONGO_URL}}` → use as `MONGODB_URI`
- `${{Postgres.DATABASE_URL}}` → use as `DATABASE_URL`
- `${{Redis.REDIS_URL}}` → use as `REDIS_URL`

### Step 3: Set Environment Variables

In Railway → your Node.js service → **Variables**:

```env
# App
NODE_ENV=production
PORT=3000
APP_URL=https://your-app.railway.app

# Facebook
VERIFY_TOKEN=your_custom_token_here

# Clerk (Authentication)
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe (Billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...

# Security
ENCRYPTION_KEY=<64-char hex string>

# Databases (auto-filled by Railway plugins)
MONGODB_URI=${{MongoDB.MONGO_URL}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

### Step 4: Configure Build & Start Commands

In Railway → Service Settings:

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install && cd dashboard-react && npm install && npm run build` |
| **Start Command** | `node server.js` |

### Step 5: Deploy the Worker as a Separate Service

1. In Railway, click **"+ New"** → **"GitHub repo"** → same repo.
2. Change **Start Command** to: `node queue/messageWorker.js`
3. Share the same environment variables.

> This way, the web server and the queue worker scale independently.

### Step 6: Set Up Custom Domain

1. In Railway → your service → **Settings** → **Domains**.
2. Add your domain (e.g., `api.winkwebhook.com`).
3. Update your DNS records as shown.
4. SSL is automatically provisioned.

---

## 🔵 Alternative: Render

### Services to Create on Render

| Service Type | Name | Branch | Start Command |
|-------------|------|--------|---------------|
| Web Service | `wink-api` | `main` | `node server.js` |
| Background Worker | `wink-worker` | `main` | `node queue/messageWorker.js` |

### Render Databases
- Add **MongoDB**: Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier
- Add **PostgreSQL**: Render has managed Postgres built-in
- Add **Redis**: Render has managed Redis built-in

---

## 🔗 Facebook Webhook Configuration

After deployment, update your Facebook App with the production webhook URL:

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Your App → **Messenger** → **Webhooks**
3. Update callback URL to: `https://your-domain.com/webhook`
4. Verify token: must match `VERIFY_TOKEN` in your env

---

## 🔑 Clerk Production Setup

1. Go to [clerk.com](https://clerk.com) → your app → **API Keys**
2. Switch to **Production** instance
3. Update your env with production keys
4. Add your production domain in Clerk → **Domains**
5. Set up Clerk Webhook:
   - Endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`

---

## 💳 Stripe Production Setup

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Switch to **Live mode**
3. Get your **Live** secret key
4. Register webhook:
   - Endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy the webhook signing secret (`STRIPE_WEBHOOK_SECRET`)

---

## 🏗️ Production Architecture Diagram

```
Internet
    │
    ▼
Cloudflare DNS / CDN (DDoS protection, caching)
    │
    ▼
Railway / Render Load Balancer
    │
    ├──► Node.js Express API (web service)
    │           │
    │           ├──► MongoDB Atlas (cloud DB)
    │           ├──► Railway PostgreSQL (pgvector)
    │           └──► Railway Redis (queue)
    │
    └──► Node.js Worker (background service)
                │
                ├──► Same MongoDB, Postgres, Redis
                └──► OpenAI API
```

---

## ✅ Pre-Launch Checklist

### Security
- [ ] `ENCRYPTION_KEY` is set and all page tokens are encrypted at rest
- [ ] `NODE_TLS_REJECT_UNAUTHORIZED` is NOT set to `0` in production
- [ ] All `/api` routes require authentication
- [ ] Admin routes check for admin user ID
- [ ] Stripe webhook signature is validated
- [ ] Clerk webhook signature is validated
- [ ] Rate limiting is enabled (`npm install express-rate-limit`)

### Performance
- [ ] MongoDB indexes are created (`initDatabase()` runs on startup)
- [ ] pgvector IVFFLAT index is created
- [ ] Redis connection pooling is configured
- [ ] Express response compression is enabled (`npm install compression`)

### Reliability
- [ ] Worker has retry logic (BullMQ `attempts: 3`)
- [ ] Webhook deduplication is in place (Redis TTL)
- [ ] Error monitoring is set up (Sentry or similar)
- [ ] Health check endpoint exists: `GET /health`

### Legal (Required for SaaS)
- [ ] Privacy Policy page
- [ ] Terms of Service page
- [ ] Cookie consent (if applicable)
- [ ] GDPR compliant data deletion (`DELETE /api/account`)

---

## 🔧 Useful Railway Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy manually
railway up

# View logs
railway logs

# Open shell in container
railway shell

# Set environment variable
railway variables set MY_VAR=value
```

---

## 📊 Monitoring & Alerts

### Recommended Stack

| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Sentry** | Error tracking | 5,000 errors/mo |
| **UptimeRobot** | Uptime monitoring | 50 monitors |
| **LogTail / BetterStack** | Log management | 1GB/mo |
| **Bull Board** | Queue monitoring | Built-in (self-hosted) |

### Health Check Endpoint

Add to `server.js`:
```javascript
app.get('/health', async (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'ok' : 'error';
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            mongodb: mongoStatus,
            version: process.env.npm_package_version
        }
    });
});
```

---

## 💰 Estimated Monthly Costs

| Service | Provider | Cost |
|---------|---------|------|
| App Server | Railway | ~$5/mo (Hobby) |
| Worker | Railway | ~$5/mo |
| MongoDB | Railway/Atlas | Free–$9/mo |
| PostgreSQL | Railway | ~$5/mo |
| Redis | Railway | ~$5/mo |
| Domain | Namecheap | ~$10/year |
| **Total** | | **~$20–30/month** |

This is **covered by 1 Pro subscriber** ($29/mo). Everything beyond that is profit.

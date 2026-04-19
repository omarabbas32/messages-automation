# 07 — API Reference

Complete reference for all REST API endpoints in the SaaS version.

**Base URL:** `https://api.winkwebhook.com` (or `http://localhost:3000` locally)

**Authentication:** All `/api/*` routes (except webhooks) require a Bearer token from Clerk.
```
Authorization: Bearer <clerk_jwt_token>
```

---

## 🔐 Auth Endpoints

### POST `/api/webhooks/clerk`
Internal — called by Clerk when a new user registers.

**Headers:** `svix-signature` (Clerk webhook signature)

**Response:** `200 OK`

---

## 📄 Pages

### GET `/api/pages`
Returns all Facebook pages for the authenticated user.

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "64f...",
            "page_id": "492107823984694",
            "page_name": "HOFF",
            "ai_enabled": true,
            "ai_instructions": "...",
            "knowledge_base": "...",
            "token_valid": true,
            "created_at": "2026-04-01T10:00:00Z"
        }
    ]
}
```

---

### POST `/api/pages`
Add a new Facebook page. Subject to plan limits.

**Request Body:**
```json
{
    "page_id": "492107823984694",
    "page_token": "EAAG...",
    "page_name": "HOFF"
}
```

**Response (201):**
```json
{ "success": true, "message": "Page added successfully", "id": "64f..." }
```

**Error (403 — Plan limit):**
```json
{
    "success": false,
    "error": "Your free plan allows a maximum of 1 page. Please upgrade.",
    "upgrade_required": true
}
```

---

### PUT `/api/pages/:id`
Update page name and/or access token.

**Request Body:**
```json
{
    "page_name": "New Name",
    "page_token": "EAAG_new_token..."
}
```

**Response:**
```json
{ "success": true, "message": "Page updated and synced" }
```

---

### PUT `/api/pages/:id/ai`
Update AI settings for a page.

**Request Body:**
```json
{
    "ai_enabled": true,
    "ai_instructions": "You are a helpful sales assistant for..."
}
```

**Response:**
```json
{ "success": true, "message": "AI settings updated successfully" }
```

---

### PUT `/api/pages/:id/knowledge`
Update the knowledge base for a page.

**Request Body:**
```json
{
    "knowledge_base": "Product A: $50\nProduct B: $75\nWorking hours: 9am-6pm"
}
```

**Response:**
```json
{ "success": true, "message": "Knowledge base updated successfully" }
```

---

### DELETE `/api/pages/:id`
Delete a page and all its associated rules.

**Response:**
```json
{ "success": true, "message": "Page deleted successfully" }
```

**Error (403 — Not owner):**
```json
{ "success": false, "error": "Forbidden" }
```

---

## 📋 Rules

### GET `/api/rules?page_id=xxx`
Get all rules for a specific page.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page_id` | String | Facebook Page ID (required) |

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "64f...",
            "page_id": "492107823984694",
            "keyword": "price",
            "reply": "Our products start from $50. Visit our website for full pricing.",
            "is_active": true,
            "match_type": "contains",
            "created_at": "2026-04-01T10:00:00Z"
        }
    ]
}
```

---

### POST `/api/rules`
Create a new keyword rule. Subject to plan limits.

**Request Body:**
```json
{
    "page_id": "492107823984694",
    "keyword": "price",
    "reply": "Our products start from $50."
}
```

**Response (201):**
```json
{ "success": true, "message": "Rule added successfully", "id": "64f..." }
```

---

### PUT `/api/rules/:id`
Update a rule's keyword and reply.

**Request Body:**
```json
{
    "keyword": "pricing",
    "reply": "Updated reply text"
}
```

**Response:**
```json
{ "success": true, "message": "Rule updated successfully" }
```

---

### DELETE `/api/rules/:id`
Delete a rule.

**Response:**
```json
{ "success": true, "message": "Rule deleted successfully" }
```

---

## 💳 Billing

### GET `/api/billing`
Get the current user's billing status and usage.

**Response:**
```json
{
    "success": true,
    "plan": "free",
    "ai_messages_used": 47,
    "ai_messages_limit": 100,
    "pages_used": 1,
    "pages_limit": 1,
    "stripe_customer_id": null
}
```

---

### POST `/api/billing/checkout`
Create a Stripe Checkout session for plan upgrade.

**Request Body:**
```json
{ "plan": "pro" }
```

**Response:**
```json
{
    "success": true,
    "url": "https://checkout.stripe.com/pay/cs_live_..."
}
```

---

### POST `/api/billing/portal`
Open the Stripe Customer Portal for managing subscriptions.

**Response:**
```json
{
    "success": true,
    "url": "https://billing.stripe.com/session/..."
}
```

---

### POST `/api/webhooks/stripe`
Internal — called by Stripe when subscription events occur.

**Headers:** `stripe-signature`
**Response:** `200 OK`

---

## 📊 Analytics

### GET `/api/analytics?page_id=xxx&range=7d`
Get message analytics for a page.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page_id` | String | — | Facebook Page ID (required) |
| `range` | String | `7d` | `7d` or `30d` |

**Response:**
```json
{
    "success": true,
    "stats": [
        { "_id": "message_received", "count": 142 },
        { "_id": "ai_replied", "count": 98 },
        { "_id": "keyword_matched", "count": 31 },
        { "_id": "no_match", "count": 13 }
    ],
    "topKeywords": [
        { "keyword": "price", "count": 18 },
        { "keyword": "delivery", "count": 9 }
    ]
}
```

---

## 🔍 Vector Search

### POST `/api/search/vector`
Semantic search over pages using pgvector.

**Request Body:**
```json
{ "query": "business selling furniture", "top_k": 5 }
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "page_id": "492107823984694",
            "page_name": "HOFF",
            "score": 0.91
        }
    ]
}
```

---

## 🔗 Webhook (Public — No Auth)

### GET `/webhook`
Facebook webhook verification endpoint.

**Query Parameters:** `hub.mode`, `hub.verify_token`, `hub.challenge`

**Response:** Returns `hub.challenge` value if token matches.

---

### POST `/webhook`
Receives all incoming Facebook Messenger events.

**Response:** Always `200 OK` (immediately, before processing)

**Payload (from Facebook):**
```json
{
    "object": "page",
    "entry": [
        {
            "id": "492107823984694",
            "messaging": [
                {
                    "sender": { "id": "26141808548740173" },
                    "recipient": { "id": "492107823984694" },
                    "message": {
                        "mid": "m_abc123",
                        "text": "Hello, what is your price?"
                    }
                }
            ]
        }
    ]
}
```

---

## 🛡️ Admin (Restricted)

### GET `/api/admin/users`
List all users. Requires admin user ID.

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "clerk_id": "user_abc",
            "email": "someone@example.com",
            "plan": "pro",
            "ai_messages_used": 450,
            "created_at": "2026-04-01T..."
        }
    ]
}
```

### PUT `/api/admin/users/:id/plan`
Manually override a user's plan.

**Request Body:**
```json
{ "plan": "agency" }
```

---

## ❗ Error Codes

| HTTP Code | Meaning |
|-----------|---------|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request (missing or invalid fields) |
| `401` | Unauthorized (missing or invalid JWT) |
| `403` | Forbidden (wrong owner or plan limit exceeded) |
| `404` | Resource not found |
| `429` | Rate limited |
| `500` | Internal server error |

All errors follow this format:
```json
{
    "success": false,
    "error": "Human-readable error message",
    "upgrade_required": true  // Only present when plan limit is hit
}
```

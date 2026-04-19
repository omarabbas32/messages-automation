# 02 — Phase 1: Authentication & Multi-Tenancy

## 🎯 Goal
Add user accounts so that each business has a **private, isolated workspace**. No user can see or touch another user's pages or rules.

This is the **most critical phase** — everything else depends on it.

---

## 🧠 Chosen Approach: Clerk (Recommended)

**Why Clerk over Passport.js + JWT?**

| Feature | Clerk | Passport.js + JWT |
|---|---|---|
| Setup time | ~2 hours | ~2 days |
| Email verification | Built-in | Manual |
| Password reset | Built-in | Manual |
| Social login (Google) | Built-in | Manual config |
| Session management | Automatic | Manual JWT refresh |
| UI components | Pre-built | Build from scratch |
| Cost | Free up to 10,000 users | Free (self-hosted) |

> **Use Clerk if you want to ship fast. Use JWT if you need 100% control.**

---

## 📋 Step-by-Step Implementation

### Step 1: Install Clerk SDK

```bash
npm install @clerk/clerk-sdk-node
```

For the React dashboard:
```bash
cd dashboard-react
npm install @clerk/clerk-react
```

Get your keys from [clerk.com](https://clerk.com):
```env
# Add to .env
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
```

---

### Step 2: Update the Database — Add User Model

Create a new `User` document in MongoDB to store extra user data beyond what Clerk provides (like plan info, usage counts).

**New file: `models/User.js`**
```javascript
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    clerk_id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    plan: { type: String, enum: ['free', 'pro', 'agency'], default: 'free' },
    stripe_customer_id: { type: String, default: null },
    stripe_subscription_id: { type: String, default: null },
    ai_messages_used: { type: Number, default: 0 },
    ai_messages_reset_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
```

---

### Step 3: Add `owner_id` to Page and Rule Schemas

**Modify `database.js`:**

```javascript
const pageSchema = new mongoose.Schema({
    owner_id: { type: String, required: true, index: true }, // Clerk user ID
    page_id: { ... },
    page_token: { ... },
    page_name: { ... },
    ai_enabled: { ... },
    ai_instructions: { ... },
    knowledge_base: { ... },
    created_at: { ... }
});

const ruleSchema = new mongoose.Schema({
    owner_id: { type: String, required: true, index: true }, // Clerk user ID
    page_id: { ... },
    keyword: { ... },
    reply: { ... },
    created_at: { ... }
});
```

> ⚠️ **MIGRATION REQUIRED**: Existing documents need `owner_id` populated. Write a one-time migration script.

---

### Step 4: Create Auth Middleware for Express

**New file: `middleware/requireAuth.js`**
```javascript
import { clerkClient } from '@clerk/clerk-sdk-node';

export async function requireAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const session = await clerkClient.verifyToken(token);
        req.userId = session.sub; // Clerk user ID (e.g., "user_2abc...")
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}
```

**New file: `middleware/checkOwnership.js`**
```javascript
import * as db from '../database.js';

export function checkPageOwnership(Model) {
    return async (req, res, next) => {
        const doc = await Model.findById(req.params.id);
        if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
        if (doc.owner_id !== req.userId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        req.resource = doc;
        next();
    };
}
```

---

### Step 5: Protect All API Routes

**Update `server.js`:**
```javascript
import { requireAuth } from './middleware/requireAuth.js';

// All /api routes must be authenticated
app.use('/api', requireAuth);

// Pages — scope to owner
app.get('/api/pages', async (req, res) => {
    const pages = await db.getAllPages(req.userId); // Pass userId
    res.json({ success: true, data: pages });
});

app.post('/api/pages', async (req, res) => {
    const result = await db.addPage(req.userId, ...); // Pass userId
    ...
});
```

**Update all DB functions to filter by `owner_id`:**
```javascript
// database.js
export async function getAllPages(ownerId) {
    return await Page.find({ owner_id: ownerId }, { page_token: 0 })
        .sort({ created_at: -1 })
        .lean();
}
```

---

### Step 6: Update the React Dashboard

**`dashboard-react/src/main.jsx`:**
```jsx
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
);
```

**`dashboard-react/src/App.jsx`:**
```jsx
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/clerk-react';

function App() {
  const { getToken } = useAuth();

  // Attach Clerk token to all API calls
  const apiFetch = async (url, options = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
  };

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        {/* Your existing dashboard */}
        <DashboardContent apiFetch={apiFetch} />
      </SignedIn>
    </>
  );
}
```

---

### Step 7: Handle the Webhook Route (No Auth Needed)

The `/webhook` route is called by Facebook, not by users. It must **stay public** but resolve the page owner internally:

```javascript
// server.js — Webhook does NOT use requireAuth middleware
app.post('/webhook', async (req, res) => {
    res.sendStatus(200); // Always respond immediately

    // Find the page in DB (includes owner_id)
    const page = await db.getPageByPageId(pageId);
    if (!page) return;

    // Process message with the page's owner context
    await handleMessage(page, senderId, message);
});
```

---

### Step 8: Auto-Create User in DB on First Login

Register a **Clerk Webhook** to create a MongoDB User doc when a new user signs up:

```javascript
// New endpoint: POST /api/webhooks/clerk
app.post('/api/webhooks/clerk', express.raw({ type: '*/*' }), async (req, res) => {
    const evt = webhookMiddleware(req, res); // Verify Clerk signature
    
    if (evt.type === 'user.created') {
        await User.create({
            clerk_id: evt.data.id,
            email: evt.data.email_addresses[0].email_address,
            plan: 'free'
        });
    }
    res.sendStatus(200);
});
```

---

## ✅ Acceptance Criteria

- [ ] User can sign up and log in via Clerk UI
- [ ] JWT token is attached to every API request from the dashboard
- [ ] `GET /api/pages` only returns pages for the logged-in user
- [ ] Deleting a page owned by another user returns 403
- [ ] `/webhook` still works without authentication
- [ ] New user gets a MongoDB `User` document on first login

---

## 🧪 Testing Checklist

```bash
# 1. Create User A, add Page A
# 2. Log in as User B
# 3. Try to GET /api/pages — should NOT see Page A
# 4. Try to DELETE /api/pages/<User A's page ID> — should return 403
# 5. Send Facebook message to Page A — should still be handled correctly
```

---

## 📁 Files Changed

| File | Action |
|------|--------|
| `models/User.js` | NEW — User model |
| `middleware/requireAuth.js` | NEW — Clerk auth middleware |
| `middleware/checkOwnership.js` | NEW — Ownership guard |
| `database.js` | MODIFY — Add `owner_id` to schemas + filter queries |
| `server.js` | MODIFY — Apply auth middleware to all `/api` routes |
| `dashboard-react/src/main.jsx` | MODIFY — Wrap with ClerkProvider |
| `dashboard-react/src/App.jsx` | MODIFY — Use `useAuth`, protect routes |
| `.env` | MODIFY — Add Clerk keys |
| `migrations/add_owner_id.js` | NEW — One-time migration script |

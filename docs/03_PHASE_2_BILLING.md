# 03 — Phase 2: Stripe Billing & Subscription Plans

## 🎯 Goal
Charge users for using WinkWebhook. Gate features based on their subscription plan. Handle payments, upgrades, downgrades, and cancellations automatically.

---

## 💰 Subscription Plans

| Plan | Price | Pages | AI Messages/Month | Rules per Page | Custom AI Instructions |
|------|-------|-------|-------------------|----------------|----------------------|
| **Free** | $0 | 1 | 100 | 5 | ❌ |
| **Pro** | $29/month | 10 | Unlimited | 50 | ✅ |
| **Agency** | $99/month | Unlimited | Unlimited | Unlimited | ✅ |

**Plan limits are enforced server-side.** The client never decides what is allowed.

---

## 📋 Step-by-Step Implementation

### Step 1: Create Stripe Products & Prices

In the [Stripe Dashboard](https://dashboard.stripe.com):

1. Create **Product**: "WinkWebhook Pro"
   - Price: $29.00 / month (recurring)
   - Copy the Price ID: `price_pro_xxxxx`

2. Create **Product**: "WinkWebhook Agency"
   - Price: $99.00 / month (recurring)
   - Copy the Price ID: `price_agency_xxxxx`

Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_pro_xxxxx
STRIPE_PRICE_AGENCY=price_agency_xxxxx
```

---

### Step 2: Install Stripe

```bash
npm install stripe
```

---

### Step 3: Add Plan Limits Configuration

**New file: `config/plans.js`**
```javascript
export const PLAN_LIMITS = {
    free: {
        max_pages: 1,
        max_ai_messages_per_month: 100,
        max_rules_per_page: 5,
        custom_ai_instructions: false,
    },
    pro: {
        max_pages: 10,
        max_ai_messages_per_month: Infinity,
        max_rules_per_page: 50,
        custom_ai_instructions: true,
    },
    agency: {
        max_pages: Infinity,
        max_ai_messages_per_month: Infinity,
        max_rules_per_page: Infinity,
        custom_ai_instructions: true,
    }
};
```

---

### Step 4: Add Billing Middleware

**New file: `middleware/checkPlanLimit.js`**
```javascript
import { PLAN_LIMITS } from '../config/plans.js';
import { User } from '../models/User.js';
import * as db from '../database.js';

// Check if user can add more pages
export async function canAddPage(req, res, next) {
    const user = await User.findOne({ clerk_id: req.userId });
    const limits = PLAN_LIMITS[user.plan];

    const currentPageCount = await db.countPages(req.userId);
    if (currentPageCount >= limits.max_pages) {
        return res.status(403).json({
            success: false,
            error: `Your ${user.plan} plan allows a maximum of ${limits.max_pages} page(s). Please upgrade.`,
            upgrade_required: true
        });
    }
    next();
}

// Check if user can add more rules to a page
export async function canAddRule(req, res, next) {
    const user = await User.findOne({ clerk_id: req.userId });
    const limits = PLAN_LIMITS[user.plan];

    const currentRuleCount = await db.countRulesForPage(req.body.page_id, req.userId);
    if (currentRuleCount >= limits.max_rules_per_page) {
        return res.status(403).json({
            success: false,
            error: `Rule limit reached for your ${user.plan} plan. Please upgrade.`,
            upgrade_required: true
        });
    }
    next();
}

// Check AI message usage
export async function canUseAI(user) {
    const limits = PLAN_LIMITS[user.plan];
    if (limits.max_ai_messages_per_month === Infinity) return true;

    // Reset counter if a new month has started
    const now = new Date();
    const resetAt = new Date(user.ai_messages_reset_at);
    if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
        await User.updateOne({ _id: user._id }, { ai_messages_used: 0, ai_messages_reset_at: now });
        return true;
    }

    return user.ai_messages_used < limits.max_ai_messages_per_month;
}
```

---

### Step 5: Apply Limits to Routes

**Update `server.js`:**
```javascript
import { canAddPage, canAddRule } from './middleware/checkPlanLimit.js';

// Limit page creation based on plan
app.post('/api/pages', requireAuth, canAddPage, async (req, res) => { ... });

// Limit rule creation based on plan
app.post('/api/rules', requireAuth, canAddRule, async (req, res) => { ... });
```

**Update `handleMessage()` in `server.js`:**
```javascript
async function handleMessage(page, senderId, message) {
    const owner = await User.findOne({ clerk_id: page.owner_id });
    
    if (page.ai_enabled && openai) {
        // Check AI message limit before calling OpenAI
        const allowed = await canUseAI(owner);
        if (!allowed) {
            console.log(`⚠️ AI limit reached for user ${owner.email}`);
            await sendMessage(page.page_token, senderId,
                'عذراً، وصلنا للحد الأقصى من الردود هذا الشهر. يرجى التواصل مع الدعم.');
            return;
        }

        // Increment usage counter
        await User.updateOne({ _id: owner._id }, { $inc: { ai_messages_used: 1 } });

        // ... rest of AI logic
    }
}
```

---

### Step 6: Create Stripe Checkout & Billing Endpoints

**New file: `routes/billing.js`**
```javascript
import Stripe from 'stripe';
import { User } from '../models/User.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session for upgrade
export async function createCheckoutSession(req, res) {
    const { plan } = req.body; // 'pro' or 'agency'
    const priceId = plan === 'pro' 
        ? process.env.STRIPE_PRICE_PRO 
        : process.env.STRIPE_PRICE_AGENCY;

    const user = await User.findOne({ clerk_id: req.userId });

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
        const customer = await stripe.customers.create({ email: user.email });
        customerId = customer.id;
        await User.updateOne({ _id: user._id }, { stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.APP_URL}/dashboard?upgrade=success`,
        cancel_url: `${process.env.APP_URL}/dashboard?upgrade=cancelled`,
    });

    res.json({ success: true, url: session.url });
}

// Get current billing status
export async function getBillingStatus(req, res) {
    const user = await User.findOne({ clerk_id: req.userId });
    res.json({
        success: true,
        plan: user.plan,
        ai_messages_used: user.ai_messages_used,
        ai_messages_limit: PLAN_LIMITS[user.plan].max_ai_messages_per_month,
    });
}

// Open Stripe Customer Portal for plan management
export async function createPortalSession(req, res) {
    const user = await User.findOne({ clerk_id: req.userId });
    const session = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${process.env.APP_URL}/dashboard`,
    });
    res.json({ success: true, url: session.url });
}
```

---

### Step 7: Handle Stripe Webhooks

Stripe sends events when subscriptions are created, updated, or cancelled.

```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// This route must use raw body (not JSON parsed)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const subscription = event.data.object;

    switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const plan = subscription.items.data[0].price.id === process.env.STRIPE_PRICE_AGENCY 
                ? 'agency' : 'pro';
            await User.findOneAndUpdate(
                { stripe_customer_id: subscription.customer },
                { plan, stripe_subscription_id: subscription.id }
            );
            break;
        }
        case 'customer.subscription.deleted': {
            await User.findOneAndUpdate(
                { stripe_customer_id: subscription.customer },
                { plan: 'free', stripe_subscription_id: null }
            );
            break;
        }
    }

    res.sendStatus(200);
});
```

---

### Step 8: Show Billing UI in Dashboard

Add a **"Billing" tab** to the React dashboard:

```jsx
// BillingSection.jsx
function BillingSection({ apiFetch }) {
    const [billing, setBilling] = useState(null);

    useEffect(() => {
        apiFetch('/api/billing').then(r => r.json()).then(d => setBilling(d));
    }, []);

    const handleUpgrade = async (plan) => {
        const res = await apiFetch('/api/billing/checkout', {
            method: 'POST',
            body: JSON.stringify({ plan })
        });
        const { url } = await res.json();
        window.location.href = url; // Redirect to Stripe Checkout
    };

    const handleManage = async () => {
        const res = await apiFetch('/api/billing/portal', { method: 'POST' });
        const { url } = await res.json();
        window.location.href = url; // Redirect to Stripe Portal
    };

    return (
        <section>
            <h2>Current Plan: {billing?.plan}</h2>
            <p>AI Messages Used: {billing?.ai_messages_used} / {billing?.ai_messages_limit}</p>
            
            {billing?.plan === 'free' && (
                <button onClick={() => handleUpgrade('pro')}>Upgrade to Pro — $29/mo</button>
            )}
            {billing?.stripe_customer_id && (
                <button onClick={handleManage}>Manage Subscription</button>
            )}
        </section>
    );
}
```

---

## ✅ Acceptance Criteria

- [ ] Free user cannot add more than 1 page (gets clear error message with upgrade CTA)
- [ ] Free user cannot send more than 100 AI messages per month
- [ ] Clicking "Upgrade" redirects to Stripe Checkout
- [ ] After successful payment, user's plan updates automatically (via Stripe webhook)
- [ ] Cancelling subscription downgrades user to Free plan
- [ ] Stripe Customer Portal allows users to manage/cancel themselves

---

## 📁 Files Changed

| File | Action |
|------|--------|
| `config/plans.js` | NEW — Plan limits config |
| `middleware/checkPlanLimit.js` | NEW — Billing guards |
| `routes/billing.js` | NEW — Stripe checkout/portal endpoints |
| `models/User.js` | MODIFY — Add `stripe_customer_id`, `ai_messages_used` |
| `server.js` | MODIFY — Apply billing middleware, Stripe webhook handler |
| `dashboard-react/src/sections/BillingSection.jsx` | NEW — Billing UI |
| `.env` | MODIFY — Add Stripe keys and Price IDs |

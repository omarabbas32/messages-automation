# 05 — Phase 4: Product Polish, Landing Page & Analytics

## 🎯 Goal
Turn the tool into a product people *want* to pay for. This phase covers:
1. A high-conversion **landing page**
2. A smooth **onboarding flow**
3. A **usage analytics dashboard** for users
4. **Admin panel** for you to manage all users

---

## 🌐 Part 1: Landing Page

The landing page is the first thing potential customers see. It needs to:
- Explain the product clearly in 10 seconds
- Show social proof (testimonials, message count stats)
- Have a clear CTA: "Start Free — No Credit Card Required"

### Recommended Tech: Next.js 14 (App Router)
- Built-in SSR for SEO
- Can share components with the React dashboard
- Easy deployment on Vercel

### Page Structure

```
Landing Page (/)
├── Hero Section
│   ├── Headline: "Automate Your Facebook Sales — 24/7"
│   ├── Subheadline: "Connect your page, set your rules, let AI do the rest."
│   ├── CTA Button: "Start Free →"
│   └── Screenshot/Demo GIF
│
├── How It Works (3 Steps)
│   ├── 1. Connect your Facebook Page
│   ├── 2. Configure your AI assistant
│   └── 3. Respond to customers automatically
│
├── Features Section
│   ├── AI-Powered Replies
│   ├── Keyword Automation Rules
│   ├── Knowledge Base (Business Info)
│   ├── Multi-Page Management
│   └── Conversation History
│
├── Pricing Section
│   ├── Free Plan Card
│   ├── Pro Plan Card (highlighted)
│   └── Agency Plan Card
│
├── Testimonials
│
└── Footer (Terms, Privacy, Contact)
```

### Key Design Elements

```css
/* Hero gradient — premium feel */
.hero {
    background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
}

/* Animated typing effect for headline */
.hero-headline::after {
    content: '|';
    animation: blink 1s step-end infinite;
}

/* Glass card effect for feature cards */
.feature-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
}
```

---

## 🚀 Part 2: Onboarding Flow

New users need hand-holding for the first setup. A bad onboarding = churn.

### Onboarding Steps (Modal/Wizard)

```
Step 1: Welcome 🎉
├── "Welcome to WinkWebhook, [Name]!"
└── "Let's set up your first Facebook Page in 3 minutes."

Step 2: Connect Facebook Page
├── Input: Page ID
├── Input: Page Access Token
├── Help link: "How to find my token?"
└── Test Connection button → validates token via Graph API

Step 3: Configure AI
├── Toggle: Enable AI
├── Textarea: Business description (used as knowledge base)
└── Example prompts to help users fill this in

Step 4: Add Your First Rule (Optional)
├── Quick rule creator: keyword → reply
└── Skip option

Step 5: Done! 🎊
├── "Your page is live!"
├── Show the webhook URL to set in Facebook Developer Console
└── "Send a test message to see it in action"
```

### Implementation

**New file: `dashboard-react/src/components/Onboarding/OnboardingWizard.jsx`**
```jsx
function OnboardingWizard({ onComplete, apiFetch }) {
    const [step, setStep] = useState(1);
    const [pageData, setPageData] = useState({ page_id: '', page_token: '', page_name: '' });

    const testConnection = async () => {
        // Call Facebook Graph API to validate token
        const res = await fetch(
            `https://graph.facebook.com/me?access_token=${pageData.page_token}`
        );
        const data = await res.json();
        if (data.name) {
            setPageData(prev => ({ ...prev, page_name: data.name }));
            return true;
        }
        return false;
    };

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-modal">
                <ProgressBar current={step} total={5} />
                {step === 1 && <WelcomeStep onNext={() => setStep(2)} />}
                {step === 2 && (
                    <ConnectPageStep
                        data={pageData}
                        onChange={setPageData}
                        onTest={testConnection}
                        onNext={() => setStep(3)}
                    />
                )}
                {/* ... more steps */}
            </div>
        </div>
    );
}
```

**Show onboarding only for new users:**
```jsx
// In App.jsx
const [showOnboarding, setShowOnboarding] = useState(false);

useEffect(() => {
    if (pages.length === 0) {
        setShowOnboarding(true); // No pages = new user
    }
}, [pages]);
```

---

## 📊 Part 3: Analytics Dashboard

Give users insights into how the automation is performing.

### Metrics to Track

| Metric | Description | How to Calculate |
|--------|-------------|-----------------|
| Total Messages | Total messages received | Count from `conversations` collection |
| AI Messages Sent | How many were handled by AI | Count `role: 'assistant'` in conversations |
| Keyword Matches | How often rules triggered | Log to `analytics` collection |
| Response Rate | % of messages that got a reply | AI + keyword replies / total messages |
| Top Keywords | Most triggered keywords | Group by rule keyword |

### New Analytics Schema

**Add to `database.js`:**
```javascript
const analyticsSchema = new mongoose.Schema({
    owner_id: { type: String, index: true },
    page_id: { type: String, index: true },
    event_type: { 
        type: String, 
        enum: ['message_received', 'keyword_matched', 'ai_replied', 'no_match'],
        required: true
    },
    rule_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Rule', default: null },
    timestamp: { type: Date, default: Date.now }
});

analyticsSchema.index({ page_id: 1, timestamp: -1 });
export const Analytics = mongoose.model('Analytics', analyticsSchema);
```

**Log events in the worker:**
```javascript
// In queue/messageWorker.js
await Analytics.create({
    owner_id: page.owner_id,
    page_id: pageId,
    event_type: 'keyword_matched',
    rule_id: matchedRule._id
});
```

### Analytics API Endpoint

```javascript
// GET /api/analytics?page_id=xxx&range=7d
app.get('/api/analytics', requireAuth, async (req, res) => {
    const { page_id, range = '7d' } = req.query;
    const days = range === '30d' ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await Analytics.aggregate([
        { $match: { owner_id: req.userId, page_id, timestamp: { $gte: since } } },
        { $group: { _id: '$event_type', count: { $sum: 1 } } }
    ]);

    const topKeywords = await Analytics.aggregate([
        { $match: { owner_id: req.userId, page_id, event_type: 'keyword_matched' } },
        { $group: { _id: '$rule_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);

    res.json({ success: true, stats, topKeywords });
});
```

### Analytics UI Component

```jsx
// AnalyticsSection.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

function AnalyticsSection({ selectedPageId, apiFetch }) {
    const [stats, setStats] = useState([]);

    useEffect(() => {
        if (!selectedPageId) return;
        apiFetch(`/api/analytics?page_id=${selectedPageId}&range=7d`)
            .then(r => r.json())
            .then(d => setStats(d.stats));
    }, [selectedPageId]);

    return (
        <section>
            <h2>📊 Analytics (Last 7 Days)</h2>
            <div className="stat-cards">
                {stats.map(s => (
                    <div key={s._id} className="stat-card">
                        <h3>{s.count}</h3>
                        <p>{s._id.replace('_', ' ')}</p>
                    </div>
                ))}
            </div>
            <BarChart width={500} height={300} data={stats}>
                <Bar dataKey="count" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
            </BarChart>
        </section>
    );
}
```

---

## 🛡️ Part 4: Admin Panel (for You)

A private `/admin` route so you can:
- See all users and their plans
- Manually change plans (for beta testers, refunds)
- See system-wide message volume
- View failed jobs from the queue

```javascript
// Admin middleware (only your Clerk user ID)
const ADMIN_USER_IDS = ['user_yourclerkid'];

function requireAdmin(req, res, next) {
    if (!ADMIN_USER_IDS.includes(req.userId)) {
        return res.status(403).json({ error: 'Admin only' });
    }
    next();
}

// Admin endpoints
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    const users = await User.find({}).sort({ created_at: -1 });
    res.json({ success: true, data: users });
});

app.put('/api/admin/users/:id/plan', requireAuth, requireAdmin, async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { plan: req.body.plan });
    res.json({ success: true });
});
```

---

## ✅ Acceptance Criteria

- [ ] Landing page loads in under 2 seconds and explains the product clearly
- [ ] New users see the onboarding wizard and can complete it in under 3 minutes
- [ ] Analytics show correct message counts and keyword stats
- [ ] Admin can view and modify user plans
- [ ] All pages are mobile-responsive

---

## 📁 Files Changed

| File | Action |
|------|--------|
| `landing/` | NEW — Next.js landing page (separate app) |
| `dashboard-react/src/components/Onboarding/` | NEW — Onboarding wizard |
| `dashboard-react/src/sections/AnalyticsSection.jsx` | NEW — Analytics UI |
| `database.js` | MODIFY — Add Analytics model |
| `queue/messageWorker.js` | MODIFY — Log analytics events |
| `server.js` | MODIFY — Add analytics and admin endpoints |

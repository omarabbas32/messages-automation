# Project Analysis: WinkWebhook

## 🚀 Overview
WinkWebhook is a sophisticated, multi-tenant SaaS application designed for automating interactions on Facebook Pages using AI (LLMs) and custom keyword rules. It features a robust backend for handling webhooks and a modern React-based dashboard for users to manage their automation, knowledge base (RAG), and account settings.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express | Core API and Webhook handling |
| **Frontend** | React, Vite, Vanilla CSS | Interactive user dashboard |
| **Database** | PostgreSQL | Relational data and multi-tenancy |
| **Vector DB** | pgvector | Vector storage for RAG (Knowledge Base) |
| **AI/ML** | OpenAI API | Chat completions and Embeddings |
| **Auth** | JWT / Cookies | Secure session management |
| **Deployment** | ngrok (local) | Webhook tunnel and HTTPS |

---

## 🏗️ Backend Architecture

### Core Components
- **server.js**: The central hub. Handles webhook reception, authentication middleware, and all API endpoints for the dashboard.
- **database.js**: The data access layer. Implements business logic and queries for users, pages, rules, and conversations.
- **pg_database.js**: The low-level database connection pool and vector extension initialization.
- **embedding_service.js**: Communicates with OpenAI to generate unified embeddings for both queries and knowledge chunks.

### RAG (Retrieval-Augmented Generation)
The project implements a state-of-the-art AI response system:
1. **Knowledge Upload**: Text is chunked and stored in `page_documents` with vectors.
2. **Context Retrieval**: On message receipt, the system performs a vector similarity search via `pgvector` to find relevant context.
3. **Injected Prompting**: Context is injected into the system prompt to ground the AI's response in page-specific knowledge.

---

## 🎨 Frontend Architecture
The frontend follows a modular, section-based design.

### Key Sections & Components
- **Navbar**: Professional brand identity and user profile management.
- **PagesSection**: Management of connected Facebook Pages (Page ID, Tokens, AI status).
- **RulesSection**: Keyword-based automation that takes priority over AI responses.
- **SettingsPage**: Central hub for API keys, usage tracking, and account management.
- **Auth**: Dedicated login and registration flows with JWT handling.

---

## 🔑 Multi-Tenancy & Security
- **Owner Isolation**: All records (pages, rules, documents) are scoped via `owner_id`.
- **JWT Authentication**: Secure stateless auth with access and refresh tokens stored in HTTP-only cookies.
- **Personal API Keys**: Users can provide their own OpenAI keys to bypass system-level quotas and gain more control.

---

## 📉 Current Project State

### ✅ Implemented
- [x] Full PostgreSQL migration with `pgvector` support.
- [x] Webhook handling for Facebook Page messages.
- [x] AI Responses with RAG (Knowledge Base).
- [x] Multi-tenant dashboard with Auth.
- [x] Keyword automation rules.

### 🚧 Roadmap (Planned Additions)
- [ ] **Global AI Config**: Centralized control for AI model selection and parameters.
- [ ] **Security Expansion**: Active "Change Password" and profile management.
- [ ] **Advanced Usage Analytics**: Better visualization of message quotas.
- [ ] **Billing Integration**: Full Stripe fulfillment logic.

---

## 💡 Recommendations
1. **Error Resiliency**: Implement more granular error handling for the Webhook handler to avoid 500s on minor API timeouts.
2. **Caching**: Utilize `embedding_cache.js` more aggressively to reduce OpenAI cost and latency.
3. **Admin Dashboard**: Create a "Super Admin" view to monitor system-wide usage and health.

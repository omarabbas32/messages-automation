# 📚 WinkWebhook — SaaS Transformation Docs

This folder contains the complete technical and product plan for transforming **WinkWebhook** from a single-user webhook automation tool into a **multi-tenant SaaS platform**.

---

## 📂 Document Index

| File | Description |
|------|-------------|
| [01_OVERVIEW.md](./01_OVERVIEW.md) | Product vision, goals, and high-level architecture |
| [02_PHASE_1_AUTH.md](./02_PHASE_1_AUTH.md) | Phase 1 — User Authentication & Multi-Tenancy |
| [03_PHASE_2_BILLING.md](./03_PHASE_2_BILLING.md) | Phase 2 — Stripe Subscriptions & Usage Limits |
| [04_PHASE_3_SCALE.md](./04_PHASE_3_SCALE.md) | Phase 3 — Queue System, Scalability & Reliability |
| [05_PHASE_4_PRODUCT.md](./05_PHASE_4_PRODUCT.md) | Phase 4 — Product Polish, Landing Page & Analytics |
| [06_DATABASE_SCHEMA.md](./06_DATABASE_SCHEMA.md) | Full SaaS database schema (MongoDB + Postgres) |
| [07_API_REFERENCE.md](./07_API_REFERENCE.md) | Complete API endpoint reference |
| [08_DEPLOYMENT.md](./08_DEPLOYMENT.md) | Deployment guide (Railway, Render, AWS) |

---

## 🚀 Current State

- **Tech Stack**: Node.js, Express, MongoDB (Mongoose), PostgreSQL (pgvector), OpenAI API
- **Frontend**: React (Vite), hosted via Express static middleware
- **Integration**: Facebook Messenger Webhook API
- **Status**: Single-user, no authentication, fully functional locally

## 🎯 Target State

- **Multi-tenant SaaS** with isolated user workspaces
- **Subscription billing** via Stripe
- **Scalable message queue** via BullMQ + Redis
- **Premium landing page** + onboarding flow
- **Usage analytics** per user per page

---

## ⚙️ How to Read This

> Start with `01_OVERVIEW.md` to understand the overall architecture.
> Then read each phase in order — each phase **builds on the previous one**.
> Each phase doc includes: **Goal → Database Changes → Backend Changes → Frontend Changes → Testing**.

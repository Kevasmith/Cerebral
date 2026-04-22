# Cerebral — MVP Build Plan

> **Positioning:** An AI-powered financial awareness tool that turns your spending into actionable opportunities.

---

## MVP Core Requirements

- [ ] Connect bank + categorize spending + detect patterns
- [ ] Generate "Awareness Insights" (the differentiator)
- [ ] Opportunity Feed (curated, location-aware)

---

## Phase 1 — Foundation (Week 1–2)

### Design + Flows
- [ ] Wireframe all 6 screens (Onboarding, Home, Opportunities, Transactions, AI Chat, Profile)
- [ ] Define component library / design system (colors, typography, spacing)
- [ ] Map user flow: Signup → Connect Bank → Dashboard

### Backend Setup
- [x] Initialize Node.js project (NestJS)
- [x] Set up PostgreSQL database (TypeORM configured, synchronize on dev)
- [x] Set up Redis for caching (@keyv/redis + CacheModule global)
- [x] Define data models: `Users`, `Accounts`, `Transactions`, `Insights`, `Opportunities`, `Preferences`
- [x] Configure environment variables and secrets management (.env.example)
- [x] Set up auth (Firebase Auth guard + CurrentUser decorator)
- [x] Scaffold feature modules (users, accounts, transactions, insights, opportunities)

### Bank Integration
- [x] Evaluate Flinks vs Plaid for Canada support → **Flinks chosen**
- [x] Integrate Flinks (FlinksService with authorize, getAccountsDetail, getTransactions)
- [x] Pull and store account + transaction data (syncFromLoginId → upsert accounts → sync transactions)
- [x] Write normalizer to standardize transaction schema (auto-categorizer with pattern rules)

---

## Phase 2 — Core Product (Week 3–4)

### Transactions + Categorization
- [x] Auto-categorize transactions (food, transport, entertainment, etc.) — pattern-based categorizer
- [ ] Build transactions list screen (light filtering, no overbuilding) — frontend Phase
- [x] Expose transactions API endpoint (GET /transactions, GET /transactions/spending/summary)

### Users + Onboarding
- [x] POST /users/register (upsert on Firebase first login)
- [x] GET/PATCH /users/me (profile)
- [x] GET/PATCH /users/me/preferences (goals, interests, location)
- [x] Global ValidationPipe + CORS configured in main.ts

### Basic Dashboard
- [x] GET /accounts/dashboard → totalCashAvailable, spendingTrend, status signal
- [ ] Wire dashboard to live account + transaction data — frontend Phase

---

## Phase 3 — Insight Engine (Week 5–6)

### Rule-Based Insights (v1)
- [x] Rule: food/entertainment/shopping spending > 15% → trigger category insight
- [x] Rule: idle cash > $1,000 → trigger idle cash insight
- [x] Rule: income trend change ≥ 10% → surface income insight
- [x] Rule: total monthly spend 10%+ higher → alert card
- [x] Dedup guard: no repeat insights for same rule within 30 days

### AI Layer on Top
- [x] Integrate OpenAI (gpt-4o-mini) for natural-language insight generation
- [x] Personalize tone based on user goals (save / make / learn)
- [x] Generate insight cards dynamically from rule triggers (title + body)
- [x] Fallback insight cards if OpenAI fails

### Insight Engine Endpoints
- [x] POST /insights/refresh — run engine + return fresh cards
- [x] GET  /insights — active (non-expired) insight cards
- [x] GET  /insights/unread-count
- [x] PATCH /insights/:id/read — mark card as read

### Opportunity Feed
- [x] `Opportunities` entity (title, description, type, actionType, tags, location)
- [x] Seeded 10 Edmonton opportunities (gigs, events, side hustles, investment explainers)
- [x] Match opportunities to user interests + location (tag-based scoring)
- [x] GET /opportunities — personalized feed sorted by interest match
- [ ] Build scrollable Opportunity Feed screen — frontend Phase

---

## Phase 4 — AI Assistant (Week 7)

- [x] POST /chat — AI chat with full financial context injected per user
- [x] Context built at request time: totalCash, monthlySpending, topCategory, userGoal
- [x] Guardrails: blocks execution advice only (not educational investing questions)
- [x] Uses gpt-4o-mini via AiService (no duplicate OpenAI client)
- [x] Input validation: message 1–500 chars via DTO
- [x] ChatModule wired as static import in AppModule
- [ ] Build chat-style UI screen — frontend Phase

---

## Phase 5 — Frontend Build (Week 8)

### Setup
- [x] Expo app scaffold (existing, Expo 48 + React Navigation 6)
- [x] All missing deps added to package.json (bottom-tabs, zustand, async-storage, react-native-screens)
- [x] API base URL fixed to `/api/v1`
- [x] Zustand auth store (init, signIn, signUp, signOut, fetchProfile, savePreferences)

### Navigation
- [x] Auth flow: SignIn → Onboarding → Main tabs (state-driven, no manual routing)
- [x] Bottom tab navigator: Home, Explore, Spend, Ask AI, Profile

### Screens
- [x] SignIn — combined sign in / sign up, Firebase auth, styled
- [x] Onboarding — goal selection (step 1) + interests multi-select (step 2)
- [x] Dashboard — snapshot card + AI insight cards with unread dot + mark-read
- [x] Transactions — existing (category filter, pagination, pull-to-refresh)
- [x] Opportunities — personalized feed, type badges, action buttons
- [x] Chat — existing (chat bubbles, send, loading state)
- [x] Profile — avatar, goal/interests display, sign out

### Remaining (polish pass)
- [ ] Connect bank step (Flinks WebView widget) — next sprint
- [ ] Push notifications
- [ ] Beta testing with Edmonton users
- [ ] App Store / TestFlight setup

> **To run:** `cd frontend && npm install --legacy-peer-deps && npx expo start`

---

## Tech Stack

| Layer       | Choice                        |
|-------------|-------------------------------|
| Frontend    | React Native + Expo           |
| Backend     | Node.js (NestJS or Express)   |
| Database    | PostgreSQL                    |
| Cache       | Redis                         |
| Bank API    | Flinks (Canada-first)         |
| AI          | OpenAI                        |
| Auth        | Firebase Auth or Auth0        |
| FE Hosting  | Vercel                        |
| BE Hosting  | Railway / Render / AWS        |

---

## What We Are NOT Building (MVP)

- ❌ Direct investing / stock or crypto execution
- ❌ Complex portfolio tracking
- ❌ Full financial planning tools
- ❌ Tax / accounting features

These get unlocked after beta validation.

---

## Data Model (Minimal)

```
Users
Accounts
Transactions
Insights
Opportunities
Preferences
```

---

## Decisions Log

| Decision | Chosen | Reason |
|----------|--------|--------|
| Bank aggregator | **Flinks** | Built for Canada, covers all big 5 banks, has React Native SDK. Plaid's Canadian coverage is too thin. |
| Auth provider | **Firebase Auth** | Free through beta, 30-min setup, mature React Native SDK. Auth0 is enterprise overkill. |
| Backend framework | **NestJS** | Module/service/controller structure handles 6 entities + insight engine + AI layer cleanly. Express would require reinventing these patterns manually. |

---

*Last updated: 2026-04-22*

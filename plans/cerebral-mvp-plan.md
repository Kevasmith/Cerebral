# Cerebral MVP — Build Plan

> **Positioning:** An AI-powered financial awareness tool that turns your spending into actionable opportunities.

---

## What This MVP Must Do (Non-Negotiable)
1. Connect + understand money behavior
2. Generate "Awareness Insights" (the differentiator)
3. Surface an Opportunity Feed (local, behavior-based)

## What This MVP Will NOT Do
- Direct investing (stocks, crypto execution)
- Complex portfolio tracking
- Full financial planning tools
- Advanced tax/accounting

---

## Week 1–2 — Foundation

### Design + Flows
- [ ] Sketch onboarding flow (bank connect → interests → location → goal)
- [ ] Design Home Dashboard wireframe (snapshot + AI insight cards)
- [ ] Design Opportunities Feed layout (scroll cards with CTA)
- [ ] Design Transactions screen (list + categories + light filter)
- [ ] Design AI Chat screen (chat-style interface)
- [ ] Design Profile/Settings screen

### Backend Setup
- [ ] Initialize Node.js project (NestJS or Express)
- [ ] Set up PostgreSQL database
- [ ] Set up Redis (caching layer)
- [ ] Define data models: Users, Accounts, Transactions, Insights, Opportunities, Preferences
- [ ] Set up auth (Firebase Auth or Auth0)
- [ ] Set up environment config + secrets management
- [ ] Deploy backend scaffold to hosting (Railway / Render / AWS)

### Bank Integration
- [ ] Register and get API credentials for Flinks (or Plaid fallback)
- [ ] Implement bank connection flow (OAuth / widget)
- [ ] Pull and store accounts + balances
- [ ] Pull and store raw transactions
- [ ] Map transactions to internal data model

---

## Week 3–4 — Data + Dashboard

### Transaction Processing
- [ ] Auto-categorize transactions (food, transport, entertainment, etc.)
- [ ] Store category assignments in DB
- [ ] Build API endpoint: GET /transactions (with filters)
- [ ] Calculate monthly totals per category
- [ ] Detect month-over-month spending changes (up/down %)

### Home Dashboard
- [ ] Build "Today's Financial Snapshot" component
  - [ ] Cash available (across accounts)
  - [ ] Spending trend indicator (up/down vs last month)
  - [ ] Status signal ("On track" / "Overspending")
- [ ] Wire dashboard to live backend data
- [ ] Build AI Insight cards component (static data first, then live)

### Frontend Setup
- [ ] Initialize React Native / Expo project
- [ ] Set up navigation structure (bottom tabs: Home, Feed, Transactions, Chat, Profile)
- [ ] Implement onboarding screens
  - [ ] Bank connect screen
  - [ ] Interest selection screen (investing / side income / networking / saving)
  - [ ] Location permission screen
  - [ ] Goal selection screen (save more / make more / learn investing)
- [ ] Connect frontend auth to backend

---

## Week 5–6 — Insight Engine + Opportunity Feed

### Insight Engine v1
- [ ] Define rule set v1:
  - [ ] Food spending > threshold → trigger insight
  - [ ] Idle cash > threshold → trigger opportunity
  - [ ] Event attendance pattern → suggest monetization/networking
  - [ ] Month-over-month spike > 15% → alert
- [ ] Build insight generation pipeline (rules → AI explanation layer)
- [ ] Integrate OpenAI to naturalize insights and personalize tone
- [ ] Store generated insights in DB (with timestamps + read status)
- [ ] Build API endpoint: GET /insights
- [ ] Render insight cards on Home Dashboard (live)

### Opportunity Feed
- [ ] Define opportunity schema (title, description, relevance reason, CTA type, location)
- [ ] Manually curate first batch of Edmonton-based opportunities:
  - [ ] Local gigs
  - [ ] Community events
  - [ ] Side hustle options
  - [ ] Beginner investment explainers
- [ ] Build matching logic: user interests + behavior → relevant opportunities
- [ ] Build API endpoint: GET /opportunities
- [ ] Build Opportunities Feed screen (scroll cards, CTA buttons: Learn More / Attend / Explore)

---

## Week 7 — AI Chat Assistant

- [ ] Set up OpenAI chat completions endpoint on backend
- [ ] Build system prompt: financial awareness assistant with access to user's spending context
- [ ] Implement context injection (pass user's recent transactions + insights into prompt)
- [ ] Build API endpoint: POST /chat (streaming or standard)
- [ ] Build AI Chat screen (chat-style UI, message bubbles, input bar)
- [ ] Handle sample questions:
  - [ ] "Can I afford to invest $500?"
  - [ ] "How do I start investing?"
  - [ ] "Why am I spending so much this month?"
- [ ] Add conversation history (session-based at minimum)

---

## Week 8 — Polish + Beta Launch

### Transactions Screen
- [ ] Build transactions list view
- [ ] Show auto-assigned category per transaction
- [ ] Add light filtering (by category, date range)
- [ ] Keep it simple — this is not the edge

### Profile / Settings Screen
- [ ] Show connected accounts
- [ ] Allow editing interests
- [ ] Allow editing goal
- [ ] Notification preferences toggle
- [ ] Disconnect account option

### Polish
- [ ] Error states for all screens (no data, failed connection, etc.)
- [ ] Empty states for first-time users
- [ ] Loading skeletons / indicators
- [ ] Basic push notifications (insight alerts)
- [ ] App icon + splash screen
- [ ] Review all insight copy for tone (plain language, not financial jargon)

### Beta Launch
- [ ] Internal testing (friends/family, Edmonton users)
- [ ] Fix critical bugs from beta feedback
- [ ] Set up basic analytics (which insights are opened, feed CTR)
- [ ] Soft launch to waitlist or TestFlight / Android beta

---

## Tech Stack Reference

| Layer | Choice |
|---|---|
| Frontend | React Native / Expo |
| Backend | Node.js (NestJS or Express) |
| Database | PostgreSQL |
| Cache | Redis |
| Bank Aggregation | Flinks (Canada-first) / Plaid fallback |
| AI | OpenAI (insights + chat) |
| Auth | Firebase Auth or Auth0 |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway / Render / AWS |

---

## Data Model (MVP)

```
Users
Accounts       → belongs to User
Transactions   → belongs to Account
Insights       → belongs to User, generated from Transactions
Opportunities  → global pool, filtered by User preferences + location
Preferences    → belongs to User (interests, goals, location)
```

---

## Notes
- Opportunity Feed starts manual/curated in Edmonton — automate later
- LO-CAL integration point: plug into Opportunity Feed (Week 5+)
- Do not build investing execution, portfolio tracking, or tax tools — earn that right post-launch

# Product Requirements Document (PRD)
## Cerebral
**Version:** v1 MVP  
**Owner:** Founder (Kevaughn)  
**Date:** April 2026  
**Status:** Build Phase

---

## 1. Executive Summary

Cerebral is an AI-powered financial awareness platform that helps users understand their money and make better decisions automatically.

Unlike budgeting apps that require manual input or passive dashboards, Cerebral connects to bank accounts, analyzes spending behavior, detects opportunities, and provides personalized financial guidance.

**The core promise:**
> Know where your money is going, what matters right now, and what to do next.

---

## 2. Problem Statement

Most people:
- Check their bank account but still feel financially unclear
- Use budgeting apps briefly, then churn
- Want to save/invest more but don't know where to start
- Miss subscriptions, wasteful spending, and optimization opportunities
- Need personalized guidance — not generic advice

Existing apps focus on: tracking, charts, budgets, investing products.

Very few solve: **daily financial awareness + actionable decision support**

---

## 3. Product Vision

Create the most useful daily money companion for modern users.

Cerebral should feel: financially intelligent · proactive · personalized · trustworthy · simple to use daily

---

## 4. Goals (MVP)

**Business Goals**
- Launch working MVP in Canada
- Acquire first 100 users
- Reach first paying subscribers
- Validate retention (weekly usage)
- Prove users value AI insights

**User Goals**
- Understand spending instantly
- Detect leaks and opportunities
- Ask money questions easily
- Feel more in control
- Improve habits over time

---

## 5. Non-Goals (MVP)

Do NOT build initially:
- Stock trading
- Loans / lending
- Tax filing
- Advanced investing tools
- Family/shared accounts
- Desktop-first product
- Full financial planning marketplace

---

## 6. Target Users

**Primary ICP — Young Professionals (22–35)**
- Income: $40K–$100K+
- Uses mobile banking
- Wants to build wealth
- Feels unoptimized financially
- Interested in personal growth

**Secondary ICP — Freelancers / Founders**
- Irregular income
- Need clarity + cash flow awareness

---

## 7. Core Jobs To Be Done

When I look at my finances, help me:
1. Know where my money went
2. Understand if I'm doing okay
3. Catch waste quickly
4. Know what to do next
5. Find ways to improve financially
6. Get answers instantly

---

## 8. Core Value Proposition

Cerebral turns your real financial behavior into clear actions that help you save more, waste less, and make smarter money moves.

---

## 9. MVP Features

### 9.1 Authentication
**Must Have:**
- Email signup/login
- Google login
- Secure session management
- Password reset

**Tech:** Better Auth

### 9.2 Bank Account Connection
**Must Have:**
- Connect Canadian banks via Plaid
- Fetch: accounts, balances, transactions

**UX Goals:**
- Connect in under 60 sec
- Trust-first onboarding

### 9.3 Dashboard
**Must Have — Display:**
- Total cash
- Recent spending
- Spending by category
- Monthly trend
- Key insight of the day

### 9.4 Transaction Intelligence
**Must Have:**
- Auto categorization
- Search transactions
- Merchant detection
- Subscription detection

### 9.5 Insight Engine (Core Product)
Generate personalized insights such as:

| Type | Example |
|---|---|
| Savings | You saved 18% more this month |
| Overspending | Food spending is up 27% |
| Waste | You pay for 2 unused subscriptions |
| Opportunity | $1,400 idle in low-interest account |
| Behavior | Weekend spending drives most variance |

### 9.6 AI Chat Assistant
**Ask:**
- Where did my money go last week?
- Can I afford this?
- How can I save more?
- What subscriptions do I have?

**Output should be:** concise · personalized · practical

### 9.7 Notifications
**Push / Email:**
- Weekly summary
- Overspending alerts
- Opportunity alerts
- Subscription renewals

### 9.8 Subscription Billing

| Plan | Price | Features |
|---|---|---|
| Free | $0 | 2 accounts, limited insights, basic dashboard |
| Growth | $9/mo | Unlimited accounts, AI assistant, advanced insights |
| Pro | $19/mo | Predictive insights, premium recommendations, priority support |

---

## 10. User Flows

**New User Flow**
1. Download app
2. Sign up
3. Connect bank
4. Data sync
5. First insight generated
6. Dashboard live
7. Prompt to ask AI first question

**Returning User Flow**
1. Open app
2. See key insight
3. Review transactions
4. Ask question
5. Complete suggested action

---

## 11. Core Screens
1. Onboarding
2. Auth
3. Connect Accounts
4. Dashboard
5. Transactions
6. Insights Feed
7. AI Chat
8. Settings
9. Upgrade Paywall

---

## 12. Functional Requirements

**Security**
- Read-only bank data
- Encrypted data at rest
- HTTPS everywhere
- Token security
- No credential storage

**Performance**
- Dashboard load < 2 sec
- AI response < 5 sec
- Sync refresh daily

**Reliability**
- 99% uptime target MVP
- Retry sync failures
- Logging + monitoring

---

## 13. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React Native + Expo |
| Navigation | React Navigation |
| State | Zustand |
| Backend | NestJS |
| DB | PostgreSQL |
| ORM | TypeORM |
| Cache | Redis |
| Auth | Better Auth |
| Bank API | Plaid |
| AI | OpenAI GPT |
| FE Hosting | Vercel |
| BE Hosting | Railway |

---

## 14. Insight Engine Logic (MVP)

| Trigger Type | Example |
|---|---|
| Threshold | Food spend > 20% monthly avg |
| Trend | Savings declining 3 weeks |
| Event | Subscription renewed |
| Opportunity | Cash idle > $1000 |
| Behavioral | Impulse spending spikes weekends |

---

## 15. Metrics / KPIs

**Acquisition:** Signups · CAC · Conversion %

**Activation:** % connect bank · Time to first insight

**Retention:** DAU/WAU · Week 4 retention · AI chat usage

**Revenue:** Free → Paid conversion · MRR · Churn

---

## 16. Success Criteria (First 90 Days)
- 100 users signed up
- 60% connect bank
- 40% weekly active
- 10+ users paying
- Positive feedback on insights

---

## 17. Risks

| Risk | Note |
|---|---|
| Trust Barrier | Users hesitant to link banks |
| AI Hallucinations | Need rules + guardrails |
| Low Retention | Need daily habit loop |
| Overbuilding | Must stay focused on MVP |

---

## 18. Roadmap

**Phase 1 (Weeks 1–4)**
- Auth
- Bank connection
- Dashboard
- Transactions

**Phase 2 (Weeks 5–8)**
- Insight engine
- AI chat
- Notifications

**Phase 3 (Weeks 9–12)**
- Billing
- Referral loop
- Analytics
- Optimization

---

## 19. Product Principles
1. Clarity over complexity
2. Action over charts
3. Trust before growth
4. Daily usefulness wins
5. Personalization beats generic advice

---

## 20. Final Product Positioning

> Cerebral is the AI financial awareness app that helps you understand your money and make smarter decisions every day.

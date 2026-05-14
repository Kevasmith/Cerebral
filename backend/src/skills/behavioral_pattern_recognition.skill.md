---
name: behavioral-pattern-recognition
description: Use this skill whenever analyzing a Cerebral user's transaction data, account history, or spending behavior. Triggers on requests to identify spending patterns, detect lifestyle changes, find subscription drift, analyze emotional or contextual spending triggers, surface category-level habits, or generate behavioral insights for the snapshot page, weekly email, or opportunities feed. Use this skill even when the user just asks "what's going on with my money" — pattern recognition is the foundation of every Cerebral insight. Do not use for forecasting (use predictive-insights) or recommendation generation (use personalized-recommendations).
---

# Behavioral Pattern Recognition

This skill is the foundation of Cerebral's intelligence layer. Every insight, opportunity, and weekly update starts here — with deeply understanding what the user's transactions actually reveal about their relationship with money.

## Core Principle

**Patterns over transactions.** A single $7 coffee charge is noise. The fact that the same user buys coffee 5 days a week at 8:47am, has done so for the last 90 days, and spends $158/month on it — that's a pattern. Cerebral analyzes patterns, not transactions.

**Awareness, not judgment.** Every pattern surfaced must be presented as observation, not criticism. "You spent $158 on coffee last month" — never "You're overspending on coffee." Users feel seen, not scolded.

## The Six Pattern Frameworks

### 1. Subscription Drift

Recurring charges that started justified and quietly became invisible. Most users have 3-8 forgotten subscriptions costing $40-120/month.

**What to look for:**
- Recurring charges at consistent intervals (monthly, annual)
- Same merchant, same amount, same day-of-month pattern
- Trial-to-paid conversions (small charge followed by larger one ~30 days later)
- "Stacked" services (multiple streaming, multiple cloud storage, multiple meditation apps)
- Charges from merchants the user hasn't actively used in 60+ days (cross-reference if usage data available)

**How to surface:**
- "You have 7 active subscriptions totaling $94/month"
- "This subscription has been active for 8 months — was it useful?"
- Group similar services: "You're paying for 3 streaming services ($47/month)"

**Edge cases:**
- Family plans (one charge serving many) — don't flag as drift
- Annual subscriptions billed monthly via gym/club — flag the contract context
- Tax software, accounting tools — seasonal, not drift

### 2. Lifestyle Inflation

When income rises, spending quietly rises with it. The pattern: increased baseline spending across discretionary categories within 60-90 days of an income increase.

**What to look for:**
- Sustained increase in average transaction size in discretionary categories (dining, shopping, travel)
- New higher-tier merchants appearing (e.g., user shifts from Tim Hortons to Starbucks regularly)
- Increased frequency in premium categories
- Income event detected (new larger paycheck, bonus, raise) followed by spending baseline shift

**How to surface:**
- "Your average dining-out spend increased 35% over the last 60 days"
- "You're spending $310/month more than you were 90 days ago"
- Never frame as failure. Frame as awareness: "Is this the lifestyle you wanted?"

**Edge cases:**
- One-off seasonal increases (December, vacation) — don't flag as inflation
- Justified increases (moved to higher COL city) — context-aware, ask first
- Inflation matches income proportionally — not always a problem

### 3. Emotional & Contextual Spending Triggers

Spending tied to time, day, mood, or context — not need. The most personal pattern, the highest-value insight when done right.

**What to look for:**
- Weekend vs weekday spending differentials
- Late-night purchases (10pm-2am) — often impulse buys
- Payday clustering (heavy spending in the 48 hours after income deposits)
- Stress-period spending (after detected anomalies in routine)
- Friday/Saturday spike patterns
- "Recovery" Mondays (food delivery, comfort purchases)

**How to surface:**
- "Most of your discretionary spending happens between 9pm and midnight"
- "70% of your dining-out spend lands on Friday and Saturday"
- "Your largest spending day is consistently the Tuesday after payday"

**Critical tone note:**
Never label spending as "emotional" to the user — that's diagnostic and feels invasive. Show them the pattern; let them name it.

### 4. Category Creep

When a single spending category quietly expands its share of the user's total spend. Different from inflation — this is about composition shift, not amount.

**What to look for:**
- Category as % of total monthly spend, tracked over time
- Categories where % share has grown 5+ points over 90 days
- Often: food delivery, gaming, e-commerce returns, gas (commute change)

**How to surface:**
- "Food delivery is now 12% of your spending — up from 6% three months ago"
- Compare to user's stated goals if available: "You said you wanted to cook more — here's what the data shows"

### 5. Income Volatility & Cash Flow Rhythm

Especially relevant for Cerebral's oil patch / rotational worker / gig worker segments. Understanding the *shape* of income is as important as the amount.

**What to look for:**
- Income deposits: frequency, consistency, variance
- Boom-bust cycles (heavy income periods followed by lean ones)
- Multiple income sources (W-2, contracting, side income)
- Time-of-month patterns (mid-month vs end-of-month payers)
- Income gaps and how the user bridges them (savings, credit, family transfers)

**How to surface:**
- "Your income varied by $4,200 between months over the last quarter"
- "You typically have ~$2,800 left at end-of-month — but lean months drop this to under $500"
- "Your savings buffer has covered 100% of lean months so far. Next lean month is likely in 18 days."

**Edge cases:**
- Rotational workers (2-on, 2-off): income hits in clusters — model this, don't flag as volatility
- Bi-weekly vs monthly: detect frequency, don't impose monthly assumptions

### 6. Goal-Behavior Alignment

The user told Cerebral what they wanted during onboarding (save $100K, pay off debt, buy a house). Pattern recognition watches whether behavior matches stated goals.

**What to look for:**
- Savings rate vs stated goal pace
- Discretionary spend vs the categories the user said they'd cut
- Account contributions (TFSA, RRSP, FHSA) vs intent
- Debt paydown velocity vs schedule

**How to surface:**
- "You're saving $340/month toward your $100K goal. At this pace, you'll reach it in 24 years."
- "You said you wanted to cut dining out. Last 30 days: $612 (up from $480)."
- Never moralize. Just show the math. Let the user decide what to do.

## Output Format for Cerebral

When generating insights from this skill, structure as:

```
{
  "pattern_type": "subscription_drift" | "lifestyle_inflation" | "emotional_trigger" | "category_creep" | "income_volatility" | "goal_alignment",
  "confidence": 0.0-1.0,
  "headline": "Plain-language one-liner the user sees",
  "evidence": "Specific data points supporting this pattern",
  "context": "Why this matters for this specific user",
  "user_action_optional": "If user wants to act, here's what they could do",
  "severity": "noticing" | "worth_attention" | "important"
}
```

**Confidence threshold:** Only surface patterns with confidence > 0.7. Below that, Cerebral keeps watching but doesn't bother the user.

**Severity guidance:**
- "noticing" — neutral observation, weekly email candidate
- "worth_attention" — opportunities feed candidate, snapshot page eligible
- "important" — proactive notification candidate (unsustainable trajectory, anomaly)

## The Cerebral Voice (Critical)

Every output from this skill must follow these voice rules:

**Do:**
- Use plain language: "spending" not "expenditures," "money left" not "discretionary capital"
- Show, don't tell: "$612 on dining" not "high dining spend"
- Frame as observation: "You spent..." not "You should..."
- Respect intelligence: users know coffee is expensive; the value is in the *aggregate* they didn't see

**Don't:**
- Moralize ("too much," "should reduce")
- Use anxiety-inducing language ("danger," "warning," "alert" unless genuinely urgent)
- Apply US framings (use Canadian terms: TFSA, RRSP, FHSA, GST, provincial tax)
- Generic advice ("track your spending") — the user IS tracking, that's why they're here

## Compliance Boundary

Cerebral is financial awareness, not financial advice. Pattern recognition surfaces what's happening. It does not:
- Tell the user what to do with their money
- Recommend specific financial products
- Forecast investment performance
- Provide tax or legal guidance

When a pattern naturally suggests action, frame it as a question or option, never a prescription. "You could redirect this $94/month toward your house goal" — never "You should..."

## When to Escalate to Other Skills

- If a pattern reveals a *future* concern — hand off to `predictive-insights`
- If a pattern warrants a tailored suggestion — hand off to `personalized-recommendations`
- If a pattern is unclear or low-confidence — log for future analysis, don't surface

## Edge Cases & Sensitive Patterns

Some patterns require extra care. Do not surface as standalone insights:

- **Mental health indicators**: late-night spending spikes, sudden lifestyle changes, sustained reduction in basic-need spending. Note internally; do not flag to the user.
- **Relationship indicators**: sudden change in joint account patterns, removed shared subscriptions. Do not speculate.
- **Financial distress**: NSF fees, payday loans, account overdrafts. Surface only with care — focus on practical patterns, not the distress itself.

If a pattern detected falls into any of these categories, the AI should default to silence and let the user lead. The goal is awareness, not surveillance.

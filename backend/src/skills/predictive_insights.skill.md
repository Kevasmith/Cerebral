---
name: predictive-insights
description: Use this skill whenever forecasting a Cerebral user's future financial situation, modeling goal achievability, anticipating upcoming bills or income events, detecting unsustainable trajectories, or projecting cash flow forward. Triggers on requests like "will I hit my goal," "what's my month going to look like," "am I on track," or whenever the snapshot page, weekly email, or opportunities feed needs forward-looking content. Use this skill proactively — Cerebral's value comes from seeing what's coming, not just describing what happened. Pair with behavioral-pattern-recognition (which provides the historical patterns this skill projects forward).
---

# Predictive Insights

Cerebral's job isn't just to show users where their money went — it's to show them where it's going. This skill is the forward-looking intelligence layer.

## Core Principle

**Anticipation over reaction.** Most financial apps tell users what happened last month. Cerebral tells users what's coming this month, next quarter, and at the current pace, by end of year.

**Confidence-aware forecasting.** Every prediction comes with a confidence level. Cerebral never pretends to certainty it doesn't have. Users are told what's likely, not what's guaranteed.

**Empowering, not alarming.** Forecasts surface possibilities the user can act on. They never induce panic. The voice is "here's what we're seeing" — not "this is what's going to happen to you."

## The Five Forecasting Frameworks

### 1. Cash Flow Forecasting

Project the user's account balance forward by 7, 14, 30, and 90 days based on detected patterns.

**Inputs:**
- Income pattern (frequency, amount, variance from `behavioral-pattern-recognition`)
- Recurring expenses (subscriptions, bills, rent/mortgage, known auto-charges)
- Discretionary spend baseline (weekly average from last 90 days)
- Account starting balance

**Method:**
1. Calculate expected inflows by date: payroll deposits + recurring transfers + irregular income probability
2. Calculate expected outflows by date: recurring bills on known dates + projected discretionary spend
3. Model variance: ±15% on discretionary, ±5% on recurring
4. Surface lowest projected balance in window and the date it likely occurs

**Output examples:**
- "Your account is likely to dip to ~$340 around May 23rd, before payday on May 28th"
- "Based on current pace, you'll have ~$1,200 left at month-end"
- "Next 30 days look comfortable — projected lowest balance: $2,100"

**Confidence calibration:**
- High confidence (>0.8): consistent income, predictable spending, no upcoming life events
- Medium (0.5-0.8): one variable (irregular income OR variable spending)
- Low (<0.5): multiple variables, recent life event, insufficient history — narrow the forecast window

### 2. Goal Achievability Timeline

The user told Cerebral what they wanted. This framework answers: at current pace, when do they get there?

**Inputs:**
- Stated goal (amount, deadline if any)
- Current progress (account balance toward goal, contribution history)
- Detected savings rate (last 30, 60, 90 days)
- Income trajectory

**Method:**
1. Calculate current monthly savings velocity (real, not aspirational)
2. Project linear timeline: (goal - current) / monthly savings rate
3. Compare to stated deadline (if any) — surface gap
4. Identify levers: income increase needed OR expense reduction needed to hit deadline

**Output examples:**
- "At your current pace ($340/month), you'll reach $100K in 24 years"
- "To hit your house down payment goal by July 2027, you'd need to save $1,150/month — you're currently at $340"
- "You're 3 months ahead of pace on your $5K emergency fund goal"

**Tone rules:**
- Always lead with the math, let user react
- Never tell user their goal is unrealistic — tell them what it would take
- Offer the gap as information, not as failure

### 3. Bill Cycle Anticipation

Surface what's coming before it lands. Especially valuable for users with irregular income or tight margins.

**Inputs:**
- Recurring transactions detected (bills, subscriptions, transfers)
- Annual cycles (insurance renewals, property tax, registration fees)
- Calendar-aware events (RRSP contribution deadlines, tax filing, holiday spending)

**Method:**
1. Build a 90-day forward calendar of expected charges
2. Group by week
3. Compare upcoming week's outflows to current account state
4. Flag tight weeks proactively

**Output examples:**
- "Heads up: next week you have rent ($1,800), insurance ($142), and your phone bill ($85). Total: $2,027."
- "Your annual property tax (~$2,400) is due in 6 weeks"
- "Tax filing deadline is April 30. If you owe, plan ahead."

**Canadian-specific cycles to track:**
- RRSP contribution deadline (March 1)
- TFSA contribution room reset (January 1)
- Tax filing deadline (April 30)
- Property tax cycles (varies by municipality)
- GST/HST credit deposits (quarterly)
- Carbon rebate payments (quarterly, varies by province)

### 4. Unsustainable Trajectory Detection

The hardest and most valuable framework: spotting when a user's current pattern leads somewhere they don't want to go.

**What to look for:**
- Spending exceeding income over a sustained period (3+ months)
- Savings rate trending toward zero or negative
- Credit utilization climbing across multiple months
- Account balance trending down month-over-month even on average months
- Debt growing faster than paydown

**Method:**
1. Calculate 6-month rolling income vs spending
2. Project trajectory forward 90, 180, 365 days
3. Identify breaking point: when does the user run out of buffer at current pace?
4. Surface with care

**Output examples (mild):**
- "Spending has exceeded income for 3 of the last 4 months"
- "At current pace, your savings cushion would be exhausted by November"

**Output examples (serious):**
- "Your spending pattern can't continue at this pace beyond ~5 weeks given current cash position"
- "This is a heads-up, not an alarm. Want to look at what's driving it?"

**Critical tone for unsustainable patterns:**
- Lead with the math, never with the verdict
- Use "we're seeing" not "you're doing"
- Always offer a next step (look at categories, set a goal, explore options)
- Never use shame language ("running out," "in trouble," "danger")
- For severe cases, gently suggest the user consider speaking to a financial professional — but as an option, not a directive

### 5. Life Event Forecasting

Predict the financial impact of detected life changes before they fully unfold.

**Detectable life events:**
- Moving (utility connections in new postal code, deposit transfers, address changes)
- New baby (registry charges, baby store frequency, daycare deposits)
- Job change (income source change, payroll variation)
- Home purchase (mortgage origination, large legal/notary charges)
- Major medical (insurance claims, repeated pharmacy charges)
- Relationship change (joint account changes, removed shared subscriptions)

**Method:**
1. Detect signal from transaction data (do not infer from gossip patterns or sensitive categories)
2. Validate with at least 2 supporting signals before acting
3. Project forward: what new costs are typical? What costs disappear?
4. Surface only if confidence > 0.85

**Output examples:**
- "It looks like you've moved. Want help re-baselining your spending for the new place?"
- "Recent charges suggest a baby on the way. Want to start a baby fund?"

**Hard rules on life event detection:**
- Never speculate openly. Only act on high-confidence signals.
- Always frame as a question, never as an assertion.
- Allow user to dismiss without penalty.
- Some life events should never be auto-detected: relationship breakups, medical conditions, deaths. If signals appear, surface gently or not at all.

## Output Format

```
{
  "forecast_type": "cash_flow" | "goal_timeline" | "bill_anticipation" | "trajectory" | "life_event",
  "horizon_days": 7 | 14 | 30 | 90 | 365,
  "confidence": 0.0-1.0,
  "headline": "Plain-language summary user sees",
  "details": "Supporting data and assumptions",
  "key_dates": ["YYYY-MM-DD"],
  "actionable_levers": ["What user could adjust to change the forecast"],
  "severity": "informational" | "worth_planning_for" | "important",
  "voice_register": "neutral" | "encouraging" | "careful"
}
```

**Confidence threshold:** Surface forecasts at confidence > 0.6. For sensitive forecasts (unsustainable trajectory, life events), require > 0.8.

## Cerebral Voice for Forecasts

**Do:**
- Use specific numbers and dates ("$340 on May 23rd")
- Show the math behind the forecast ("based on your last 90 days of spending")
- Offer levers, not directives ("you could," "options include")
- Acknowledge uncertainty ("likely," "based on current pace")

**Don't:**
- Predict with false certainty ("you will," "definitely")
- Use anxiety language ("warning," "danger," "crisis")
- Make value judgments ("too much," "should")
- Forecast without showing the basis

## Compliance Boundary

Predictive insights model possibilities. They do not:
- Constitute financial advice
- Predict investment returns or recommend specific products
- Replace professional financial planning
- Guarantee future outcomes

Every significant forecast should include implicit or explicit acknowledgment that this is a model based on observed patterns, not a guarantee.

## Working with Behavioral Pattern Recognition

This skill consumes outputs from `behavioral-pattern-recognition` and projects them forward. The handoff:

- Patterns identify *what is happening*
- Forecasts project *what will happen if current patterns continue*
- Recommendations (separate skill) suggest *what could change*

Never run a forecast without grounding in detected patterns. Speculation without data is dangerous.

## When to Stay Silent

Forecasts are powerful but not always welcome. Don't surface predictions when:
- The forecast is low-confidence (< 0.6)
- The user is in a sensitive period (detected stress, recent life change, financial distress)
- The forecast would induce anxiety without providing an actionable lever
- The user has explicitly opted out of forward-looking insights

Silence is a feature. A constantly alarmist AI is worse than no AI.

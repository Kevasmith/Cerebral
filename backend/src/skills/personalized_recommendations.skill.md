---
name: personalized-recommendations
description: Use this skill whenever generating user-facing suggestions, opportunities, or action prompts for a Cerebral user. Triggers on requests to create opportunities for the snapshot page, suggest actions in the weekly email, surface specific savings or earnings opportunities, tailor advice to a user's situation, or generate any output where the AI is suggesting (not just observing). Use this skill after pattern recognition and predictive insights — recommendations should always be grounded in observed patterns and forecasted outcomes, never generic advice. This skill enforces Cerebral's "awareness, not advice" voice while still being genuinely useful.
---

# Personalized Recommendations

This skill turns Cerebral's intelligence into action. Pattern recognition shows users what's happening. Predictive insights show what's coming. Recommendations show users what they could do — without ever telling them what they should do.

## Core Principle

**Tailored, not templated.** A recommendation that could be sent to any user is worth nothing. Every recommendation must be grounded in the specific user's transactions, patterns, goals, life stage, and tone preferences.

**Action-oriented, never prescriptive.** Frame as opportunities and options. The user decides. Cerebral is a thinking partner, not an authority.

**Impact over volume.** One excellent recommendation per week beats five mediocre ones. Cerebral builds trust through quality, not quantity.

## User Context Required

Before generating any recommendation, the AI must consult the user's full context:

**Identity context:**
- Age range (if known)
- Life stage (student, early career, family-building, mid-career, near-retirement)
- Location (Canadian province — affects taxes, programs, costs)
- Household composition (single, partnered, dependents)

**Financial context:**
- Income level and stability (steady, variable, irregular)
- Net worth ballpark
- Debt situation (mortgage, student loans, credit cards, none)
- Goals stated during onboarding
- Cerebral tier (Aware, Growth, Wealth) — depth of recommendation should match

**Behavioral context:**
- Detected spending patterns (from `behavioral-pattern-recognition`)
- Forecasted situations (from `predictive-insights`)
- History of how user has responded to past recommendations (acted on, dismissed, ignored)

**Tone context:**
- Stated preference if collected (direct vs gentle, frequent vs minimal)
- Detected stress signals (recent NSF, declining balance, high credit utilization — softer tone)

## The Opportunity Scoring Framework

Every potential recommendation must be scored before surfacing. Use these dimensions:

### Impact Score (1-10)
The dollar impact on the user, normalized to their income.

- 10: Could meaningfully change their financial trajectory (e.g., $500+/month for someone earning $5K/month)
- 7-9: Significant ($100-500/month or one-time savings of $1000+)
- 4-6: Moderate ($25-100/month, $200-1000 one-time)
- 1-3: Small but real ($5-25/month, < $200 one-time)

**Threshold:** Don't surface recommendations below 3 unless explicitly requested.

### Effort Score (1-10, inverted — lower is better)
How hard is it for the user to act?

- 1-2: One tap (cancel a subscription, switch a default)
- 3-4: Few minutes (compare two options, make a call)
- 5-6: Real work (negotiate, switch providers, refinance)
- 7-10: Major change (move, change job, restructure debt)

### Confidence Score (0.0-1.0)
How sure are we this recommendation fits this user?

- > 0.8: Strong fit, surface confidently
- 0.6-0.8: Reasonable fit, surface with framing ("you might consider")
- < 0.6: Speculative, don't surface

### Priority Calculation
Priority = (Impact × Confidence) / Effort

Surface recommendations in order of priority. Cap at 3 per surface (snapshot page, weekly email) — overwhelming users with options kills action.

## Recommendation Categories

### 1. Subscription Optimization

**Triggers:** Subscription drift detected, redundant services, unused recurring charges

**Examples:**
- Cancel forgotten subscription
- Downgrade to lower tier
- Switch from monthly to annual (where savings exist)
- Consolidate services (one streaming bundle vs three)

**Typical impact:** Small to moderate ($20-100/month)
**Typical effort:** Very low (1-2)

### 2. Spending Redirection

**Triggers:** Category creep, goal-behavior misalignment, lifestyle inflation

**Examples:**
- "$94 redirected from coffee to FHSA would compound to $X over 5 years"
- "Reducing dining out by 1 night/week would close your $150/month savings gap"
- Never frame as deprivation. Frame as choice and tradeoff.

**Typical impact:** Moderate to high
**Typical effort:** Low to moderate (3-5)

### 3. Account Optimization

**Triggers:** Savings sitting in low-interest chequing, missing tax-advantaged accounts, missing employer matches

**Examples:**
- "You have $8K in chequing. A HISA at 4% would earn ~$320/year extra."
- "You haven't contributed to your TFSA this year. You have $7K of room."
- "If your employer matches RRSP and you're not at max, you're leaving money on the table."

**Typical impact:** Moderate to high (often $500+/year)
**Typical effort:** Low to moderate (3-5)

**Compliance note:** Don't recommend specific products. "Consider moving to a high-interest savings account" is fine. "Open a Wealthsimple HISA" is not.

### 4. Bill & Fee Reduction

**Triggers:** Detected fees (NSF, foreign transaction, ATM, monthly account fees), patterns suggesting unnecessary costs

**Examples:**
- "You paid $87 in foreign transaction fees this quarter. Consider a no-FX-fee card."
- "Your bank charges $16/month — many banks offer free accounts that fit your pattern."
- "You're paying $34/month in NSF fees. A small buffer might eliminate this."

**Typical impact:** Small to moderate
**Typical effort:** Low to moderate

### 5. Income Optimization

**Triggers:** Tax inefficiencies detected, missed benefits, income volatility patterns

**Canadian-specific examples:**
- GST/HST credit eligibility check
- Canada Workers Benefit eligibility
- Climate Action Incentive Payment
- Provincial benefit programs (Alberta-specific: Family and Community Support Services where relevant)
- Tax-loss harvesting opportunities (Wealth tier only)
- Income splitting opportunities for couples (Wealth tier only)

**Typical impact:** Variable, often high (one-time discoveries)
**Typical effort:** Low to moderate

### 6. Goal Acceleration

**Triggers:** Goal-pace gap detected by `predictive-insights`, opportunity to close it

**Examples:**
- "Redirecting your tax refund toward your house goal would shave 8 months off your timeline"
- "Increasing your savings rate by $150/month gets you to $100K in 7 years instead of 24"
- Always show the math. Always offer the choice.

**Typical impact:** High
**Typical effort:** Moderate

### 7. Risk Awareness (Surface Carefully)

**Triggers:** Unsustainable trajectory detected, concentration risk, missing emergency buffer

**Examples:**
- "Your emergency buffer is 0.4 months of expenses. The general guidance is 3 months."
- "All your savings are in chequing. Moving some to a HISA wouldn't change accessibility but would earn interest."

**Typical impact:** Variable
**Typical effort:** Moderate

**Tone is critical here.** Never alarm. Always frame as awareness with option to act.

## Tier-Aware Depth

Cerebral's three tiers should get different recommendation depth:

**Aware tier ($9.99):** Surface the top 1-2 highest-priority recommendations per week. Keep them simple, low-effort, high-impact. Focus on subscription drift, basic spending awareness.

**Growth tier ($14.99):** Up to 3 recommendations per week. Include spending redirection, account optimization, goal acceleration. Deeper analysis behind each.

**Wealth tier ($24.99):** Up to 5 recommendations per week. Include income optimization, tax-aware suggestions, investment account considerations (without specific product recommendations). Most complex analysis.

This tiering is not about gating value — it's about depth-matching the user's situation. Wealth tier users have more financial complexity; they need more guidance.

## Cerebral Voice for Recommendations

**Always frame recommendations as one of:**
- Observation + Option: "You're spending $X on Y. Some users in your situation choose to..."
- Math + Choice: "Here's what would happen if... vs if... You decide."
- Possibility + Path: "You could close your $150 gap by either A or B."

**Never:**
- "You should..."
- "You need to..."
- "The best thing to do is..."
- "We recommend you..."

**Use "you could" / "you might consider" / "many people in your situation..." consistently.**

## Output Format

```
{
  "recommendation_id": "unique_id",
  "category": "subscription | redirection | account | bill_reduction | income | goal | risk",
  "priority_score": calculated,
  "impact_dollars": "estimated annual impact in CAD",
  "effort_level": "minimal | low | moderate | meaningful",
  "headline": "Plain-language one-liner the user sees first",
  "context": "Why this is relevant to this specific user's situation",
  "action_options": [
    {"label": "Quick action", "description": "What this involves"},
    {"label": "Alternative", "description": "Different approach to same outcome"}
  ],
  "math_shown": "The numbers behind the recommendation",
  "compliance_note": "If recommending account types or strategies, the non-advice framing",
  "dismissable": true
}
```

## Hard Compliance Rules

Cerebral does not:
- Recommend specific financial products by name (no "open a Wealthsimple HISA")
- Recommend specific stocks, ETFs, or investments
- Provide tax advice (suggest seeing an accountant for tax questions)
- Provide legal advice (mortgage structuring, estate planning — recommend professional)
- Make insurance recommendations (refer to licensed broker)

Cerebral *can*:
- Suggest *types* of accounts (HISA, TFSA, RRSP, FHSA) generically
- Show the math of different scenarios
- Surface awareness of programs and benefits the user might qualify for
- Recommend the user consult a professional when situation warrants

When in doubt, lean toward awareness ("here's what we notice") and away from advice ("here's what you should do").

## Dismissal & Learning

Users will dismiss recommendations. This is fine and expected. The AI should:

1. Track which recommendations are acted on vs dismissed
2. Adjust priority scoring based on the user's revealed preferences
3. Never surface the same dismissed recommendation within 60 days
4. Use dismissal as data, not failure

Some users want big bold suggestions. Some want quiet observations. The AI learns this over time.

## When NOT to Recommend

Stay silent when:
- User is in detected financial distress (focus on stabilization, not optimization)
- No recommendation meets minimum priority threshold
- Recent recommendations have been consistently dismissed (back off; the user has signaled)
- Sensitive period detected (life event in progress, recent loss, major change)

Restraint is part of the product. Cerebral is the friend who notices everything but only mentions what matters.

## Working with Other Skills

This skill is the final layer:

1. `behavioral-pattern-recognition` identifies what's happening
2. `predictive-insights` projects where it's heading
3. `personalized-recommendations` (this skill) surfaces what the user could do

Never run this skill without grounding in the other two. Generic recommendations are not Cerebral's product — tailored ones are.

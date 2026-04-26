import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { UserGoal, UserInterest } from '../../entities/preference.entity';
import { SkillLoaderService } from './skill-loader.service';

export interface InsightContext {
  type: string;
  data: Record<string, any>;
  userGoal: UserGoal;
  userInterests: UserInterest[];
  userName?: string;
  location?: string;
}

export interface ChatContext {
  totalCash: number;
  monthlySpending: number;
  topCategory: string;
  userGoal: UserGoal;
  userInterests?: UserInterest[];
  userName?: string;
  location?: string;
  spendingByCategory: { category: string; total: number }[];
  accounts: { name: string; type: string; balance: number }[];
  spendingTrend: { currentMonth: number; previousMonth: number; percentageChange: number; direction: string };
  recentTransactions: { description: string; amount: number; isDebit: boolean; category: string; daysAgo: number }[];
}

export interface WeeklySummaryContext {
  userGoal: UserGoal;
  location?: string;
  thisWeekTotal: number;
  lastWeekTotal: number;
  topCategory: string;
  categories: { category: string; total: number }[];
  incomeThisWeek: number;
}

export interface OpportunityMatchContext {
  userGoal: UserGoal;
  userInterests: UserInterest[];
  location: string;
  topSpendingCategory: string;
  availableCash: number;
  opportunity: {
    type: string;
    title: string;
    description: string;
    location: string | null;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;

  constructor(
    config: ConfigService,
    private readonly skills: SkillLoaderService,
  ) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      try {
        this.client = new OpenAI({ apiKey });
      } catch (err) {
        this.logger.error('Failed to initialize OpenAI client:', err);
        this.client = null;
      }
    } else {
      this.logger.warn('OpenAI API key not configured; AI features will use fallback responses');
      this.client = null;
    }
  }

  // ─── Insight Generation ───────────────────────────────────────────────────

  async generateInsightCard(ctx: InsightContext): Promise<{ title: string; body: string }> {
    if (!this.client) return this.fallbackInsight(ctx);

    const skill = this.skills.loadSkill('financial_insight.skill.md');
    const dynamicPrompt = this.buildInsightUserMessage(ctx);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: skill },
          { role: 'user', content: dynamicPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 250,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as { title: string; body: string };

      if (!parsed.title || !parsed.body) {
        this.logger.warn('Malformed insight response — using fallback');
        return this.fallbackInsight(ctx);
      }
      return parsed;
    } catch (err) {
      this.logger.error('OpenAI insight generation failed', err);
      return this.fallbackInsight(ctx);
    }
  }

  // ─── Chat Response ────────────────────────────────────────────────────────

  async generateChatResponse(rawMessage: string, context: ChatContext): Promise<string> {
    if (!this.client) {
      return "I'm temporarily unavailable — try again shortly.";
    }

    const sanitized = this.sanitizeUserMessage(rawMessage);
    const skill = this.skills.loadSkill('ai_chat.skill.md');
    const dynamicPrompt = this.buildChatUserMessage(sanitized, context);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: skill },
          { role: 'user', content: dynamicPrompt },
        ],
        max_tokens: 300,
        temperature: 0.8,
      });

      return (
        response.choices[0]?.message?.content ?? "I'm not sure — try rephrasing your question."
      );
    } catch (err) {
      this.logger.error('OpenAI chat failed', err);
      return "I'm having trouble right now. Try again in a moment.";
    }
  }

  // ─── Weekly Summary ───────────────────────────────────────────────────────

  async generateWeeklySummary(
    ctx: WeeklySummaryContext,
  ): Promise<{ headline: string; summary: string; priority: string }> {
    if (!this.client) return this.fallbackWeeklySummary(ctx);

    const skill = this.skills.loadSkill('weekly_summary.skill.md');
    const dynamicPrompt = this.buildWeeklySummaryUserMessage(ctx);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: skill },
          { role: 'user', content: dynamicPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as { headline: string; summary: string; priority: string };

      if (!parsed.headline || !parsed.summary || !parsed.priority) {
        return this.fallbackWeeklySummary(ctx);
      }
      return parsed;
    } catch (err) {
      this.logger.error('OpenAI weekly summary failed', err);
      return this.fallbackWeeklySummary(ctx);
    }
  }

  // ─── Opportunity Matching ─────────────────────────────────────────────────

  async generateOpportunityMatch(
    ctx: OpportunityMatchContext,
  ): Promise<{ relevanceScore: number; matchReason: string; callToAction: string }> {
    if (!this.client) {
      return { relevanceScore: 5, matchReason: 'Relevant to your financial goals.', callToAction: 'Explore now' };
    }

    const skill = this.skills.loadSkill('opportunity_matching.skill.md');
    const dynamicPrompt = this.buildOpportunityMatchUserMessage(ctx);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: skill },
          { role: 'user', content: dynamicPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 150,
        temperature: 0.6,
      });

      const content = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as {
        relevanceScore: number;
        matchReason: string;
        callToAction: string;
      };

      return {
        relevanceScore: Math.min(10, Math.max(1, Number(parsed.relevanceScore) || 5)),
        matchReason: parsed.matchReason || 'Relevant to your current goal.',
        callToAction: parsed.callToAction || 'Explore now',
      };
    } catch (err) {
      this.logger.error('OpenAI opportunity match failed', err);
      return { relevanceScore: 5, matchReason: 'Relevant to your financial goals.', callToAction: 'Explore now' };
    }
  }

  // ─── User Message Builders ────────────────────────────────────────────────

  private buildInsightUserMessage(ctx: InsightContext): string {
    const triggerDescriptions: Record<string, string> = {
      overspending: `TRIGGER: category_overspending
CATEGORY: ${ctx.data.category}
THIS MONTH: $${ctx.data.current}
LAST MONTH: $${ctx.data.previous}
CHANGE: +${ctx.data.percentChange}%`,

      monthly_overspend: `TRIGGER: monthly_overspend
TOTAL THIS MONTH: $${ctx.data.current}
TOTAL LAST MONTH: $${ctx.data.previous}
CHANGE: +${ctx.data.percentChange}%`,

      idle_cash: `TRIGGER: idle_cash_detected
IDLE AMOUNT: $${ctx.data.idleAmount}
ACCOUNT TYPE: standard savings/chequing`,

      income_trend: `TRIGGER: income_trend_${ctx.data.direction}
DIRECTION: ${ctx.data.direction}
CHANGE: $${ctx.data.delta} (${ctx.data.percentChange}%)`,

      savings_opportunity: `TRIGGER: savings_opportunity
CATEGORY: ${ctx.data.category}
MONTHLY AMOUNT: $${ctx.data.amount}`,
    };

    const trigger =
      triggerDescriptions[ctx.type] ??
      `TRIGGER: ${ctx.type}\nDATA: ${JSON.stringify(ctx.data)}`;

    return `USER PROFILE:
- Location: ${ctx.location ?? 'Edmonton, AB, Canada'}
- Financial goal: ${ctx.userGoal}
- Interests: ${ctx.userInterests.length ? ctx.userInterests.join(', ') : 'general financial awareness'}
${ctx.userName ? `- Name: ${ctx.userName}` : ''}

FINANCIAL SNAPSHOT:
${trigger}

Generate the insight card now.`;
  }

  private buildChatUserMessage(message: string, ctx: ChatContext): string {
    const trendArrow = ctx.spendingTrend.direction === 'up' ? '↑' : ctx.spendingTrend.direction === 'down' ? '↓' : '→';
    const trendPct = Math.abs(ctx.spendingTrend.percentageChange).toFixed(1);

    const accountLines = ctx.accounts.length
      ? ctx.accounts.map((a) => `  ${a.name} (${a.type}): $${a.balance.toFixed(2)} CAD`).join('\n')
      : '  No accounts connected';

    const categoryLines = ctx.spendingByCategory.length
      ? ctx.spendingByCategory.slice(0, 6).map((s) => `  ${s.category}: $${s.total.toFixed(2)}`).join('\n')
      : '  No spending data this month';

    const recentLines = ctx.recentTransactions.length
      ? ctx.recentTransactions.slice(0, 6).map((t) => {
          const when = t.daysAgo === 0 ? 'today' : t.daysAgo === 1 ? 'yesterday' : `${t.daysAgo}d ago`;
          return `  ${t.isDebit ? '-' : '+'}$${Math.abs(t.amount).toFixed(2)} · ${t.description} (${t.category}) · ${when}`;
        }).join('\n')
      : '  No recent transactions';

    return `USER PROFILE:
${ctx.userName ? `- Name: ${ctx.userName}` : ''}
- Goal: ${ctx.userGoal}
${ctx.userInterests?.length ? `- Interests: ${ctx.userInterests.join(', ')}` : ''}
- Location: ${ctx.location ?? 'Canada'}

ACCOUNTS:
${accountLines}

THIS MONTH: $${ctx.monthlySpending.toFixed(2)} spent (${trendArrow}${trendPct}% vs last month)
SPENDING BY CATEGORY:
${categoryLines}

RECENT TRANSACTIONS (last 7 days):
${recentLines}

USER MESSAGE: ${message}`;
  }

  private buildWeeklySummaryUserMessage(ctx: WeeklySummaryContext): string {
    const change = ctx.thisWeekTotal - ctx.lastWeekTotal;
    const pct = ctx.lastWeekTotal > 0
      ? ((change / ctx.lastWeekTotal) * 100).toFixed(1)
      : '0';
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';

    const categoryList = ctx.categories
      .slice(0, 5)
      .map((c) => `  - ${c.category}: $${c.total.toFixed(2)}`)
      .join('\n');

    return `USER PROFILE:
- Financial goal: ${ctx.userGoal}
- Location: ${ctx.location ?? 'Edmonton, AB, Canada'}

THIS WEEK:
- Total spent: $${ctx.thisWeekTotal.toFixed(2)}
- vs last week: ${direction} $${Math.abs(change).toFixed(2)} (${Math.abs(Number(pct))}%)
- Top category: ${ctx.topCategory}
- Income received: $${ctx.incomeThisWeek.toFixed(2)}

CATEGORY BREAKDOWN:
${categoryList}

LAST WEEK TOTAL: $${ctx.lastWeekTotal.toFixed(2)}

Generate the weekly summary now.`;
  }

  private buildOpportunityMatchUserMessage(ctx: OpportunityMatchContext): string {
    return `USER PROFILE:
- Financial goal: ${ctx.userGoal}
- Interests: ${ctx.userInterests.join(', ')}
- Location: ${ctx.location}
- Top spending category: ${ctx.topSpendingCategory}
- Available cash: $${ctx.availableCash.toFixed(2)} CAD

OPPORTUNITY:
- Type: ${ctx.opportunity.type}
- Title: ${ctx.opportunity.title}
- Description: ${ctx.opportunity.description}
- Location: ${ctx.opportunity.location ?? 'Remote / Canada'}

Score this opportunity for this user and explain the match.`;
  }

  // ─── Prompt Injection Guard ───────────────────────────────────────────────

  private sanitizeUserMessage(message: string): string {
    const INJECTION_PATTERNS = [
      /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
      /forget\s+(everything|your\s+instructions?|what\s+you('ve|\s+have)\s+been\s+told)/gi,
      /you\s+are\s+now\s+/gi,
      /act\s+as\s+(a\s+|an\s+)?(?!financial|advisor|assistant)/gi,
      /\bsystem\s*:/gi,
      /\bassistant\s*:/gi,
      /\bhuman\s*:/gi,
      /\buser\s*:/gi,
      /\[INST\]/gi,
      /<\|im_start\|>/gi,
      /<\|im_end\|>/gi,
    ];

    let sanitized = message
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\s{3,}/g, '  ')
      .trim();

    for (const pattern of INJECTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[removed]');
    }

    return sanitized.slice(0, 500);
  }

  // ─── Fallbacks ────────────────────────────────────────────────────────────

  private fallbackInsight(ctx: InsightContext): { title: string; body: string } {
    const fallbacks: Record<string, { title: string; body: string }> = {
      overspending: {
        title: `Your ${ctx.data.category} spending is up ${ctx.data.percentChange}%`,
        body: `You spent $${ctx.data.current} on ${ctx.data.category} this month — ${ctx.data.percentChange}% more than last month. Consider setting a weekly budget for this category to stay on track.`,
      },
      idle_cash: {
        title: `$${ctx.data.idleAmount} is sitting in a low-yield account`,
        body: `That $${ctx.data.idleAmount} could earn significantly more in a high-interest savings account. A HISA typically offers 3–4% annually — worth exploring for the difference.`,
      },
      monthly_overspend: {
        title: `Spending up ${ctx.data.percentChange}% vs last month`,
        body: `Your total spending rose from $${ctx.data.previous} to $${ctx.data.current} this month. Review your top categories to pinpoint where the increase is coming from.`,
      },
      income_trend: {
        title: `Income ${ctx.data.direction === 'up' ? 'increased' : 'dropped'} by $${ctx.data.delta}`,
        body: `Your income ${ctx.data.direction === 'up' ? 'grew' : 'fell'} ${ctx.data.percentChange}% this month. ${ctx.data.direction === 'up' ? 'Consider saving a portion before it gets absorbed by expenses.' : 'Review discretionary spending to buffer any shortfall.'}`,
      },
    };

    return (
      fallbacks[ctx.type] ?? {
        title: 'New financial insight available',
        body: 'Check your spending patterns to find opportunities to save or grow your money.',
      }
    );
  }

  private fallbackWeeklySummary(
    ctx: WeeklySummaryContext,
  ): { headline: string; summary: string; priority: string } {
    const change = ctx.thisWeekTotal - ctx.lastWeekTotal;
    const direction = change > 0 ? 'up' : 'down';
    return {
      headline: `Spending ${direction} $${Math.abs(change).toFixed(0)} vs last week`,
      summary: `You spent $${ctx.thisWeekTotal.toFixed(2)} this week — $${Math.abs(change).toFixed(2)} ${direction} from last week. Your top category was ${ctx.topCategory}. Reviewing this pattern weekly is the first step toward hitting your ${ctx.userGoal.replace('_', ' ')} goal.`,
      priority: `Review your ${ctx.topCategory} spending and set a target for next week`,
    };
  }
}

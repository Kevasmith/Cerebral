import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { UserGoal, UserInterest } from '../../entities/preference.entity';

interface InsightContext {
  type: string;
  data: Record<string, any>;
  userGoal: UserGoal;
  userInterests: UserInterest[];
  userName?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI;

  constructor(private config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateInsightCard(ctx: InsightContext): Promise<{ title: string; body: string }> {
    const prompt = this.buildInsightPrompt(ctx);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Cerebral, a friendly AI financial awareness coach.
You give short, actionable, non-judgmental financial insights.
Always respond in JSON with exactly two fields: "title" (max 10 words) and "body" (2-3 sentences, max 60 words).
Be specific with numbers. Tone: direct, encouraging, never preachy.
User's goal: ${ctx.userGoal}. Interests: ${ctx.userInterests.join(', ')}.`,
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as { title: string; body: string };
      return parsed;
    } catch (err) {
      this.logger.error('OpenAI insight generation failed', err);
      return this.fallbackInsight(ctx);
    }
  }

  async generateChatResponse(
    rawMessage: string,
    context: {
      totalCash: number;
      monthlySpending: number;
      topCategory: string;
      userGoal: UserGoal;
    },
  ): Promise<string> {
    const userMessage = this.sanitizeUserMessage(rawMessage);
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Cerebral, a friendly AI financial awareness assistant.
You help users understand their money — never give direct investment advice.
Context: user has $${context.totalCash.toFixed(2)} available, spent $${context.monthlySpending.toFixed(2)} this month, top category is ${context.topCategory}. Goal: ${context.userGoal}.
Keep answers under 80 words. Be conversational and specific.`,
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.8,
      });

      return response.choices[0]?.message?.content ?? "I'm not sure — try rephrasing your question.";
    } catch (err) {
      this.logger.error('OpenAI chat failed', err);
      return "I'm having trouble right now. Try again in a moment.";
    }
  }

  private buildInsightPrompt(ctx: InsightContext): string {
    const prompts: Record<string, string> = {
      overspending: `User spent $${ctx.data.current} on ${ctx.data.category} this month vs $${ctx.data.previous} last month (${ctx.data.percentChange}% increase). Generate an insight with 2 concrete ways to reduce it + 1 way to redirect that money toward their goal.`,
      idle_cash: `User has $${ctx.data.idleAmount} sitting in a low-yield account for over 30 days. Generate an insight explaining 3 simple, low-risk options to put it to work. No direct investment advice — explain options educationally.`,
      income_trend: `User's income ${ctx.data.direction === 'up' ? 'increased' : 'decreased'} by $${ctx.data.delta} (${ctx.data.percentChange}%) compared to last month. Generate a relevant insight based on this trend.`,
      monthly_overspend: `User spent $${ctx.data.current} this month vs $${ctx.data.previous} last month (${ctx.data.percentChange}% more overall). Summarize where the increase is likely coming from and suggest one immediate action.`,
      savings_opportunity: `User regularly spends $${ctx.data.amount} on ${ctx.data.category}. Suggest 1 way to reduce this and 1 way to turn that saving into a step toward their goal.`,
    };

    return prompts[ctx.type] ?? `Generate a financial insight for this data: ${JSON.stringify(ctx.data)}`;
  }

  // Strip prompt injection attempts before passing user text to the LLM.
  // Removes role-override phrases, control characters, and repeated whitespace.
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
      // Strip null bytes and non-printable control characters (keep \n \t)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Collapse excessive whitespace
      .replace(/\s{3,}/g, '  ')
      .trim();

    for (const pattern of INJECTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[removed]');
    }

    // Hard cap at 500 chars (DTO already enforces this, but belt-and-suspenders)
    return sanitized.slice(0, 500);
  }

  private fallbackInsight(ctx: InsightContext): { title: string; body: string } {
    const fallbacks: Record<string, { title: string; body: string }> = {
      overspending: {
        title: `Your ${ctx.data.category} spending is up ${ctx.data.percentChange}%`,
        body: `You spent $${ctx.data.current} on ${ctx.data.category} this month — ${ctx.data.percentChange}% more than last month. Consider setting a weekly budget for this category to stay on track.`,
      },
      idle_cash: {
        title: `$${ctx.data.idleAmount} is sitting idle`,
        body: `You have $${ctx.data.idleAmount} that could be working harder. Consider a high-interest savings account or speak with a financial advisor about low-risk options.`,
      },
      monthly_overspend: {
        title: `You're spending more than last month`,
        body: `Your total spending is up ${ctx.data.percentChange}% from last month. Review your top categories to find where the increase is coming from.`,
      },
    };

    return fallbacks[ctx.type] ?? {
      title: 'Financial insight available',
      body: 'Check your spending patterns to find opportunities to save or grow your money.',
    };
  }
}

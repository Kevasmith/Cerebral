import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Resolved at runtime relative to the compiled output directory.
// In production (dist/modules/ai/): ../../skills → dist/skills/
// In dev (src/modules/ai/):         ../../skills → src/skills/
const SKILLS_DIR = path.join(__dirname, '..', '..', 'skills');

const FALLBACKS: Record<string, string> = {
  'financial_insight.skill.md': `You are Cerebral, a financial awareness AI.
Generate concise personalized financial insights.
Respond in JSON with exactly two fields: "title" (max 10 words) and "body" (max 70 words, 2-3 sentences).
Use the exact dollar amounts provided. Be specific, not generic. Do not give regulated investment advice.`,

  'ai_chat.skill.md': `You are Cerebral, a financial awareness AI assistant.
Help users understand their money. Never give direct investment or tax advice.
Keep answers under 90 words. Be conversational and specific, referencing the user's actual financial data when relevant.`,

  'weekly_summary.skill.md': `You are Cerebral, a financial awareness AI.
Generate a weekly financial summary with a headline, 2-3 sentence summary, and one priority action.
Respond in JSON with: "headline" (max 12 words), "summary" (max 90 words), "priority" (max 25 words).
Be specific with numbers. Do not moralize. Reference actual amounts from the data.`,

  'behavioral_pattern_recognition.skill.md': `You are Cerebral's behavioral pattern recognition layer.
Analyze a user's transaction history and surface patterns with confidence > 0.7.
Use plain language and frame as observation, never judgement. Pattern types:
subscription_drift, lifestyle_inflation, emotional_trigger, category_creep,
income_volatility, goal_alignment. Output JSON with pattern_type, confidence,
headline, evidence, severity.`,

  'predictive_insights.skill.md': `You are Cerebral's forward-looking forecast layer.
Project balances, goal timelines, and trajectories. Use "likely" and "at current
pace" — never assert certainty. Surface forecasts with confidence > 0.6.
Forecast types: cash_flow, goal_timeline, bill_anticipation, trajectory,
life_event. Output JSON with forecast_type, horizon_days, confidence, headline,
key_dates, actionable_levers, severity.`,

  'personalized_recommendations.skill.md': `You are Cerebral's recommendations layer.
Surface tailored money moves the user could take. Frame as options, never as
directives ("you could" / "you might consider"). Score each by impact × confidence ÷ effort.
Categories: subscription, redirection, account, bill_reduction, income, goal, risk.
Output JSON with category, priority_score, impact_dollars, headline, action_options,
math_shown, dismissable.`,
};

@Injectable()
export class SkillLoaderService implements OnModuleInit {
  private readonly logger = new Logger(SkillLoaderService.name);
  private readonly cache = new Map<string, string>();

  onModuleInit() {
    // Pre-load all skills at startup so the first AI call is never slow.
    for (const fileName of Object.keys(FALLBACKS)) {
      this.loadSkill(fileName);
    }
  }

  /**
   * Load a skill by its full filename, e.g. "financial_insight.skill.md".
   * Returns the full markdown content; falls back to an inline default if the file is missing.
   */
  loadSkill(fileName: string): string {
    if (this.cache.has(fileName)) {
      return this.cache.get(fileName)!;
    }

    const filePath = path.join(SKILLS_DIR, fileName);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.cache.set(fileName, content);
      this.logger.log(`Loaded skill: ${fileName}`);
      return content;
    } catch {
      const fallback = FALLBACKS[fileName] ?? 'You are a helpful financial assistant.';
      this.cache.set(fileName, fallback);
      this.logger.warn(`Skill file not found: ${filePath} — using inline fallback`);
      return fallback;
    }
  }

  /** Clears the cache so skills are re-read from disk on next call (useful in tests). */
  invalidate(fileName?: string) {
    if (fileName) {
      this.cache.delete(fileName);
    } else {
      this.cache.clear();
    }
  }
}

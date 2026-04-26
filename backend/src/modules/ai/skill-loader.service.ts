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

  'opportunity_matching.skill.md': `You are Cerebral, a financial opportunity matcher.
Score how well an opportunity matches a user and explain why in one sentence.
Respond in JSON with: "relevanceScore" (1-10), "matchReason" (max 35 words), "callToAction" (max 8 words).`,

  'weekly_summary.skill.md': `You are Cerebral, a financial awareness AI.
Generate a weekly financial summary with a headline, 2-3 sentence summary, and one priority action.
Respond in JSON with: "headline" (max 12 words), "summary" (max 90 words), "priority" (max 25 words).
Be specific with numbers. Do not moralize. Reference actual amounts from the data.`,
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

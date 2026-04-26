import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Opportunity,
  OpportunityType,
  OpportunityAction,
} from '../../entities/opportunity.entity';
import { UserGoal, UserInterest } from '../../entities/preference.entity';
import { AiService } from '../ai/ai.service';

export interface OpportunityFeedContext {
  userGoal?: UserGoal;
  availableCash?: number;
  topSpendingCategory?: string;
}

interface ParsedLocation {
  city?: string;
  region?: string;
  country?: string;
}

const CA_PROVINCES = new Set([
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
]);
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL',
  'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT',
  'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

const INTEREST_TAG_MAP: Record<UserInterest, string[]> = {
  [UserInterest.INVESTING]: ['investing', 'finance', 'wealth'],
  [UserInterest.SIDE_INCOME]: ['gig', 'freelance', 'side-hustle', 'income'],
  [UserInterest.NETWORKING]: ['networking', 'events', 'community'],
  [UserInterest.SAVING]: ['saving', 'budgeting', 'frugal'],
};

const OPPORTUNITIES_SEED: Partial<Opportunity>[] = [
  // ── Local events ──────────────────────────────────────────────────────────
  {
    title: 'Edmonton Startup Weekend',
    description: 'Build a startup in 54 hours. Network with founders, designers, and developers in Edmonton. Great for side income and networking.',
    type: OpportunityType.EVENT,
    actionType: OpportunityAction.ATTEND,
    location: 'Edmonton, AB',
    tags: ['networking', 'events', 'community', 'side-hustle'],
  },
  {
    title: 'ElevateIP Workshop — Monetize Your Ideas',
    description: 'Free workshop on intellectual property and turning ideas into income streams. Hosted by Alberta Innovates.',
    type: OpportunityType.EVENT,
    actionType: OpportunityAction.ATTEND,
    location: 'Edmonton, AB',
    tags: ['income', 'side-hustle', 'networking'],
  },
  {
    title: 'Edmonton Maker Space — Build and Sell',
    description: 'Access tools, 3D printers, and laser cutters at Edmonton Maker Space. Many members sell products on Etsy or at local markets.',
    type: OpportunityType.SIDE_HUSTLE,
    actionType: OpportunityAction.EXPLORE,
    location: 'Edmonton, AB',
    tags: ['side-hustle', 'income', 'community'],
  },
  {
    title: 'Edmonton Real Estate Investment Club',
    description: 'Monthly meetup for people interested in real estate investing. Educational talks, Q&A, and networking — no obligation to invest.',
    type: OpportunityType.NETWORKING,
    actionType: OpportunityAction.ATTEND,
    location: 'Edmonton, AB',
    tags: ['investing', 'networking', 'events', 'wealth'],
  },
  // ── National gig platforms (Canada & USA) ─────────────────────────────────
  {
    title: 'TaskRabbit — Earn on Your Schedule',
    description: 'Offer handyman, furniture assembly, or moving help in your city. Average earners make $30–$60/hr with flexible hours.',
    type: OpportunityType.GIG,
    actionType: OpportunityAction.EXPLORE,
    location: 'Canada & USA',
    tags: ['gig', 'side-hustle', 'income'],
  },
  {
    title: 'DoorDash / Uber Eats Delivery — Flexible Income',
    description: 'Deliver food on your own schedule. Earn $15–$25/hr in peak hours. No experience needed.',
    type: OpportunityType.GIG,
    actionType: OpportunityAction.EXPLORE,
    location: 'Canada & USA',
    tags: ['gig', 'income', 'side-hustle'],
  },
  // ── Remote / global ────────────────────────────────────────────────────────
  {
    title: 'Fiverr — Sell a Skill Online',
    description: 'Turn any skill (writing, design, coding, voice-over) into a service you sell globally. No upfront cost.',
    type: OpportunityType.SIDE_HUSTLE,
    actionType: OpportunityAction.EXPLORE,
    location: 'Remote',
    tags: ['freelance', 'side-hustle', 'income'],
  },
  {
    title: 'Upwork — Freelance on Your Terms',
    description: 'Find clients for writing, development, design, or consulting. Upwork has over 5 million active clients globally.',
    type: OpportunityType.SIDE_HUSTLE,
    actionType: OpportunityAction.EXPLORE,
    location: 'Remote',
    tags: ['freelance', 'side-hustle', 'income'],
  },
  // ── Canadian investing explainers ─────────────────────────────────────────
  {
    title: 'What Is a TFSA and How Do You Use One?',
    description: 'A Tax-Free Savings Account lets your money grow without being taxed. This guide explains how Canadians use TFSAs to build wealth — no broker required.',
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'Canada',
    tags: ['investing', 'saving', 'finance'],
  },
  {
    title: 'High-Interest Savings Accounts in Canada',
    description: 'EQ Bank, Wealthsimple Cash, and Simplii Financial offer 4–5% interest on savings — far better than a big-bank chequing account.',
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'Canada',
    tags: ['saving', 'finance', 'wealth'],
  },
  {
    title: 'Wealthsimple Invest — Beginner Investing Explained',
    description: "Canada's most popular beginner investing app. Automatically diversifies your money across ETFs. Minimum $1 to start.",
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'Canada',
    tags: ['investing', 'finance', 'wealth'],
  },
  {
    title: 'RRSP vs TFSA — Which Should You Prioritize?',
    description: 'Both accounts shelter your money from tax — but in different ways. This breakdown helps Canadians decide which to fund first based on income and goals.',
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'Canada',
    tags: ['investing', 'saving', 'finance'],
  },
  // ── US investing explainers ────────────────────────────────────────────────
  {
    title: 'What Is a Roth IRA and Should You Open One?',
    description: 'A Roth IRA lets your investments grow tax-free. Contributions are after-tax, so withdrawals in retirement are completely tax-free — ideal if you expect your income to rise.',
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'USA',
    tags: ['investing', 'saving', 'finance'],
  },
  {
    title: '401(k) Basics — Free Money You May Be Leaving Behind',
    description: "If your employer matches 401(k) contributions, not contributing is like leaving part of your salary behind. Here's how to maximize your match in 5 minutes.",
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'USA',
    tags: ['investing', 'saving', 'finance', 'wealth'],
  },
  {
    title: 'High-Yield Savings Accounts in the USA',
    description: 'Marcus by Goldman Sachs, Ally Bank, and SoFi offer 4–5% APY — far more than traditional checking accounts. No minimum balance required.',
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'USA',
    tags: ['saving', 'finance', 'wealth'],
  },
  {
    title: 'Fidelity / Robinhood — Start Investing for Free',
    description: 'Commission-free stock and ETF investing with no minimum balance. Fidelity offers fractional shares — invest in any company for as little as $1.',
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'USA',
    tags: ['investing', 'finance', 'wealth'],
  },
];

@Injectable()
export class OpportunitiesService implements OnModuleInit {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    private readonly ai: AiService,
  ) {}

  async onModuleInit() {
    await this.seedNewEntries();
  }

  async getFeed(
    interests: UserInterest[] = [],
    location?: string,
    ctx?: OpportunityFeedContext,
  ): Promise<(Opportunity & { matchReason?: string; relevanceScore?: number; callToAction?: string })[]> {
    const query = this.opportunityRepo
      .createQueryBuilder('opp')
      .where('opp.isActive = :active', { active: true })
      .andWhere('(opp.expiresAt IS NULL OR opp.expiresAt > NOW())');

    if (location) {
      const { clause, params } = this.buildLocationClause(location);
      query.andWhere(clause, params);
    }

    const all = await query.orderBy('opp.createdAt', 'DESC').getMany();

    // Score by tag overlap with user's interests
    const interestTags = interests.flatMap((i) => INTEREST_TAG_MAP[i] ?? []);
    const scored = all
      .map((opp) => {
        const oppTags = opp.tags ?? [];
        const score = interestTags.length
          ? oppTags.filter((t) => interestTags.includes(t)).length
          : 0;
        return { opp, score };
      })
      .sort((a, b) => b.score - a.score);

    const sorted = scored.map(({ opp }) => opp);

    // Enrich top 3 with AI match reasoning (non-blocking)
    if (ctx?.userGoal && sorted.length > 0) {
      const enriched = await Promise.allSettled(
        sorted.slice(0, 3).map((opp) =>
          this.ai.generateOpportunityMatch({
            userGoal: ctx.userGoal!,
            userInterests: interests,
            location: location ?? 'Canada',
            topSpendingCategory: ctx.topSpendingCategory ?? 'other',
            availableCash: ctx.availableCash ?? 0,
            opportunity: {
              type: opp.type,
              title: opp.title,
              description: opp.description,
              location: opp.location ?? null,
            },
          }),
        ),
      );

      enriched.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          Object.assign(sorted[i], result.value);
        }
      });
    }

    return sorted;
  }

  // ── Location helpers ────────────────────────────────────────────────────────

  private parseLocation(location: string): ParsedLocation {
    const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return {};

    const city = parts[0];

    if (parts.length >= 3) {
      return { city, region: parts[1], country: parts[2] };
    }
    if (parts.length === 2) {
      const second = parts[1].toUpperCase();
      if (/^(CANADA|USA|UNITED STATES)$/i.test(parts[1])) {
        return { city, country: parts[1] };
      }
      return { city, region: second };
    }
    return { city };
  }

  private resolveCountry(parsed: ParsedLocation): 'Canada' | 'USA' | 'unknown' {
    const c = (parsed.country ?? '').toLowerCase();
    if (c === 'canada') return 'Canada';
    if (c === 'usa' || c === 'united states') return 'USA';

    // Infer from province/state abbreviation
    const r = (parsed.region ?? '').toUpperCase();
    if (CA_PROVINCES.has(r)) return 'Canada';
    if (US_STATES.has(r)) return 'USA';

    return 'unknown';
  }

  private buildLocationClause(location: string): { clause: string; params: Record<string, string> } {
    const parsed = this.parseLocation(location);
    const country = this.resolveCountry(parsed);
    const params: Record<string, string> = {};

    const conditions: string[] = [
      "opp.location ILIKE '%Remote%'",
      "opp.location ILIKE '%North America%'",
    ];

    if (country === 'Canada' || country === 'unknown') {
      conditions.push("opp.location ILIKE '%Canada%'");
    }
    if (country === 'USA' || country === 'unknown') {
      conditions.push("(opp.location ILIKE '%USA%' OR opp.location ILIKE '%United States%')");
    }

    if (parsed.region) {
      conditions.push('opp.location ILIKE :region');
      params.region = `%, ${parsed.region.toUpperCase()}%`;
    }
    if (parsed.city) {
      conditions.push('opp.location ILIKE :city');
      params.city = `%${parsed.city}%`;
    }

    return { clause: `(${conditions.join(' OR ')})`, params };
  }

  // ── Seeding ─────────────────────────────────────────────────────────────────

  private async seedNewEntries(): Promise<void> {
    let added = 0;
    for (const seed of OPPORTUNITIES_SEED) {
      const exists = await this.opportunityRepo.findOne({ where: { title: seed.title } });
      if (!exists) {
        await this.opportunityRepo.save(this.opportunityRepo.create(seed));
        added++;
      }
    }
    if (added > 0) {
      this.logger.log(`Seeded ${added} new opportunities`);
    }
  }
}

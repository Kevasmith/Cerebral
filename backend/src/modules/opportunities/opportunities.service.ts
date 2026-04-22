import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Opportunity,
  OpportunityType,
  OpportunityAction,
} from '../../entities/opportunity.entity';
import { UserInterest } from '../../entities/preference.entity';

const INTEREST_TAG_MAP: Record<UserInterest, string[]> = {
  [UserInterest.INVESTING]: ['investing', 'finance', 'wealth'],
  [UserInterest.SIDE_INCOME]: ['gig', 'freelance', 'side-hustle', 'income'],
  [UserInterest.NETWORKING]: ['networking', 'events', 'community'],
  [UserInterest.SAVING]: ['saving', 'budgeting', 'frugal'],
};

const EDMONTON_SEED: Partial<Opportunity>[] = [
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
    title: 'TaskRabbit — Earn on Your Schedule',
    description: 'Offer handyman, furniture assembly, or moving help in Edmonton. Average earners make $30–$60/hr with flexible hours.',
    type: OpportunityType.GIG,
    actionType: OpportunityAction.EXPLORE,
    location: 'Edmonton, AB',
    tags: ['gig', 'side-hustle', 'income'],
  },
  {
    title: 'Fiverr — Sell a Skill Online',
    description: 'Turn any skill (writing, design, coding, voice-over) into a service you sell globally. No upfront cost.',
    type: OpportunityType.SIDE_HUSTLE,
    actionType: OpportunityAction.EXPLORE,
    location: 'Remote',
    tags: ['freelance', 'side-hustle', 'income'],
  },
  {
    title: 'What Is a TFSA and How Do You Use One?',
    description: 'A Tax-Free Savings Account lets your money grow without being taxed. This guide explains how Canadians use TFSAs to build wealth — no broker required.',
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'Canada',
    tags: ['investing', 'saving', 'finance'],
  },
  {
    title: 'High-Interest Savings Accounts in Canada (2024)',
    description: 'EQ Bank, Wealthsimple Cash, and Simplii Financial offer 4–5% interest on savings — far better than a big-bank chequing account.',
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'Canada',
    tags: ['saving', 'finance', 'wealth'],
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
    title: 'DoorDash / Uber Eats Delivery — Flexible Income',
    description: 'Deliver food in Edmonton on your own schedule. Earn $15–$25/hr in peak hours. No experience needed.',
    type: OpportunityType.GIG,
    actionType: OpportunityAction.EXPLORE,
    location: 'Edmonton, AB',
    tags: ['gig', 'income', 'side-hustle'],
  },
  {
    title: 'Edmonton Real Estate Investment Club',
    description: 'Monthly meetup for people interested in real estate investing. Educational talks, Q&A, and networking — no obligation to invest.',
    type: OpportunityType.NETWORKING,
    actionType: OpportunityAction.ATTEND,
    location: 'Edmonton, AB',
    tags: ['investing', 'networking', 'events', 'wealth'],
  },
  {
    title: 'Wealthsimple Invest — Beginner Investing Explained',
    description: "Canada's most popular beginner investing app. Automatically diversifies your money across ETFs. Minimum $1 to start.",
    type: OpportunityType.INVESTMENT_EXPLAINER,
    actionType: OpportunityAction.LEARN_MORE,
    location: 'Canada',
    tags: ['investing', 'finance', 'wealth'],
  },
];

@Injectable()
export class OpportunitiesService implements OnModuleInit {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async getFeed(interests: UserInterest[] = [], location?: string): Promise<Opportunity[]> {
    const query = this.opportunityRepo
      .createQueryBuilder('opp')
      .where('opp.isActive = :active', { active: true })
      .andWhere('(opp.expiresAt IS NULL OR opp.expiresAt > NOW())');

    // Filter by location (Edmonton or Remote/Canada)
    if (location) {
      query.andWhere(
        "(opp.location ILIKE :location OR opp.location ILIKE '%Remote%' OR opp.location ILIKE '%Canada%')",
        { location: `%${location}%` },
      );
    }

    const all = await query.orderBy('opp.createdAt', 'DESC').getMany();

    if (!interests.length) return all;

    // Score each opportunity by how many of the user's interest tags match
    const interestTags = interests.flatMap((i) => INTEREST_TAG_MAP[i] ?? []);

    return all
      .map((opp) => {
        const oppTags = opp.tags ?? [];
        const score = oppTags.filter((t) => interestTags.includes(t)).length;
        return { opp, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ opp }) => opp);
  }

  private async seedIfEmpty(): Promise<void> {
    const count = await this.opportunityRepo.count();
    if (count > 0) return;

    await this.opportunityRepo.save(
      EDMONTON_SEED.map((seed) => this.opportunityRepo.create(seed)),
    );
    this.logger.log(`Seeded ${EDMONTON_SEED.length} Edmonton opportunities`);
  }
}

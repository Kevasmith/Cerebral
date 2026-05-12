import { Injectable, Logger } from '@nestjs/common';
import { UserGoal } from '../../entities/preference.entity';
import { AccountType } from '../../entities/account.entity';
import { AccountsService } from '../accounts/accounts.service';

export type PickCategory =
  | 'cash_optimization'
  | 'allocation_rebalance'
  | 'goal_acceleration'
  | 'investment_explainer';

export interface CerebralPick {
  id: string;
  // `type` is kept as the field name (rather than `category`) so the frontend
  // can keep mapping it through OPP_CONFIG without per-field plumbing.
  type: PickCategory;
  title: string;
  description: string;
  matchReason?: string;
  expectedImpact?: {
    kind: 'annual_return' | 'months_faster';
    value: number;
  };
  confidence: number;
}

// Assumed APY for "high-yield savings" copy. Tunable.
const HIGH_YIELD_APY = 0.045;
// Operating buffer to leave in chequing before we call the rest "idle".
const CHECKING_BUFFER = 2000;

interface GoalPlan {
  // [share, bucket name] tuples summing to 1.0
  split: [number, string][];
  // Index of the bucket considered "investment" (vs cash buffer)
  investIdx: 0 | 1;
  explainer: { title: string; body: string };
}

const GOAL_PLANS: Record<string, GoalPlan> = {
  save_for_house: {
    split: [[0.65, 'Down Payment Fund'], [0.35, 'Emergency Fund']],
    investIdx: 0,
    explainer: {
      title: 'High-yield savings accounts',
      body: 'EQ Bank, Wealthsimple Cash, and Simplii offer 4–5% interest — far better than a big-bank chequing account.',
    },
  },
  retire_early: {
    split: [[0.70, 'Index Funds'], [0.30, 'Emergency Fund']],
    investIdx: 0,
    explainer: {
      title: 'Wealthsimple Invest — beginner investing',
      body: "Automatically diversifies your money across ETFs. Minimum $1 to start — Canada's most popular beginner platform.",
    },
  },
  optimize_taxes: {
    split: [[0.60, 'RRSP'], [0.40, 'TFSA']],
    investIdx: 0,
    explainer: {
      title: 'RRSP vs TFSA — which to prioritize?',
      body: 'Both shelter your money from tax, but in different ways. Which to fund first depends on your income today and where you expect it to land.',
    },
  },
  emergency_fund: {
    split: [[0.75, 'Emergency Fund'], [0.25, 'Savings Buffer']],
    investIdx: 1,
    explainer: {
      title: 'High-yield savings accounts',
      body: 'EQ Bank, Wealthsimple Cash, and Simplii offer 4–5% APY with no minimum balance. A good home for an emergency fund.',
    },
  },
  custom: {
    split: [[0.65, 'Primary Allocation'], [0.35, 'Emergency Fund']],
    investIdx: 0,
    explainer: {
      title: 'Wealthsimple Invest — beginner investing',
      body: 'Automatically diversifies your money across ETFs. Minimum $1 to start.',
    },
  },
};

const fmt = (n: number): string => '$' + Math.round(n).toLocaleString();
const roundToHundred = (n: number): number => Math.round(n / 100) * 100;

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(private readonly accountsService: AccountsService) {}

  // Compute "Cerebral Picks" — money-optimization recommendations derived from
  // the user's actual account balances vs the percentage split agreed for
  // their goal. No persistence; rules run on each request.
  async getPicks(userId: string, goal?: UserGoal): Promise<CerebralPick[]> {
    const dashboard = await this.accountsService
      .getDashboardSnapshot(userId)
      .catch(() => null);

    const accounts = dashboard?.accounts ?? [];
    const sumBy = (type: AccountType): number =>
      accounts
        .filter((a) => a.accountType === type)
        .reduce((s, a) => s + Math.max(0, Number(a.balance)), 0);

    const checking    = sumBy(AccountType.CHECKING);
    const savings     = sumBy(AccountType.SAVINGS);
    const investments = sumBy(AccountType.INVESTMENT);

    const goalKey = (goal ?? UserGoal.RETIRE_EARLY) as keyof typeof GOAL_PLANS;
    const plan = GOAL_PLANS[goalKey] ?? GOAL_PLANS.retire_early;

    const picks: CerebralPick[] = [];

    // ── Rule 1: Idle cash in chequing → high-yield savings ─────────────────
    const idleCash = Math.max(0, checking - CHECKING_BUFFER);
    if (idleCash >= 200) {
      const moveAmount   = roundToHundred(idleCash);
      const annualReturn = moveAmount * HIGH_YIELD_APY;
      picks.push({
        id: 'cash_optimization_1',
        type: 'cash_optimization',
        title: `Move ${fmt(moveAmount)} to a high-yield savings account`,
        description:
          `Your chequing balance is ${fmt(checking)} — about ${fmt(moveAmount)} above your operating buffer. ` +
          `Parked in a 4.5% APY account, that earns ~${fmt(annualReturn)}/year.`,
        matchReason: 'Cerebral noticed idle cash in your chequing that is not earning interest.',
        expectedImpact: { kind: 'annual_return', value: annualReturn },
        confidence: 0.9,
      });
    }

    // ── Rule 2: Allocation drift vs the goal's agreed percentage split ─────
    const investBucket  = plan.split[plan.investIdx];          // e.g. [0.70, 'Index Funds']
    const investShare   = investBucket[0];
    const investName    = investBucket[1];
    const cashBucketIdx = plan.investIdx === 0 ? 1 : 0;
    const cashShare     = plan.split[cashBucketIdx][0];

    const investableTotal = savings + investments;
    if (investableTotal >= 500) {
      const targetInvestment = investableTotal * investShare;
      const actualShare      = investments / investableTotal;
      const drift            = investShare - actualShare;

      // Drift > 15 percentage points and we have savings to move
      if (drift > 0.15 && savings > 100) {
        const moveAmount = roundToHundred(
          Math.min(targetInvestment - investments, savings),
        );
        if (moveAmount >= 200) {
          picks.push({
            id: 'allocation_rebalance_1',
            type: 'allocation_rebalance',
            title: `Shift ${fmt(moveAmount)} from savings into ${investName}`,
            description:
              `Your plan calls for ${Math.round(investShare * 100)}% in ${investName} and ` +
              `${Math.round(cashShare * 100)}% in cash. You're currently at ` +
              `${Math.round(actualShare * 100)}% / ${Math.round((1 - actualShare) * 100)}%.`,
            matchReason: 'Your allocation has drifted from the split agreed during onboarding.',
            expectedImpact: { kind: 'months_faster', value: 6 },
            confidence: 0.75,
          });
        }
      }

      // ── Rule 3: Goal acceleration — bump monthly contribution if room ───
      if (investments >= 100 && drift > -0.05 && drift < 0.10) {
        // Allocation is reasonably on-track; suggest accelerating
        const annualBump = roundToHundred(investableTotal * 0.05);
        if (annualBump >= 200) {
          picks.push({
            id: 'goal_acceleration_1',
            type: 'goal_acceleration',
            title: `Bump your monthly contribution by ${fmt(annualBump / 12)}`,
            description:
              `An extra ${fmt(annualBump / 12)}/mo in ${investName} compounds to roughly ${fmt(annualBump * 5)} over five years at a 7% return.`,
            matchReason: 'Your allocation is on-track; modest acceleration pays off quickly.',
            expectedImpact: { kind: 'months_faster', value: 9 },
            confidence: 0.6,
          });
        }
      }
    }

    // ── Rule 4: Investment explainer (educational backstop) ────────────────
    picks.push({
      id: `investment_explainer_${goalKey}`,
      type: 'investment_explainer',
      title: plan.explainer.title,
      description: plan.explainer.body,
      matchReason: `Tailored to your "${goalKey.replace(/_/g, ' ')}" goal.`,
      confidence: 0.5,
    });

    // Always return up to 3; if rules 1-3 didn't fire, the explainer fills.
    return picks.slice(0, 3);
  }
}

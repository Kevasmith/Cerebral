import { OpportunitiesService } from './opportunities.service';
import { AccountType } from '../../entities/account.entity';
import { UserGoal } from '../../entities/preference.entity';

const mockAccountsService = { getDashboardSnapshot: jest.fn() };

function makeService() {
  return new OpportunitiesService(mockAccountsService as any);
}

// ── dashboard factory ─────────────────────────────────────────────────────────

function makeDashboard(overrides: {
  checking?: number;
  savings?: number;
  investments?: number;
  fees?: number;
} = {}) {
  const { checking = 0, savings = 0, investments = 0, fees = 0 } = overrides;
  const accounts = [
    ...(checking    > 0 ? [{ accountType: AccountType.CHECKING,    balance: checking }]    : []),
    ...(savings     > 0 ? [{ accountType: AccountType.SAVINGS,     balance: savings }]     : []),
    ...(investments > 0 ? [{ accountType: AccountType.INVESTMENT,  balance: investments }] : []),
  ];
  return {
    accounts,
    spendingByCategory: fees > 0 ? [{ category: 'fees', total: fees, count: 1 }] : [],
    totalCashAvailable: checking + savings + investments,
    spendingTrend: { currentMonth: 0, previousMonth: 0, percentageChange: 0, direction: 'stable' as const },
    status: 'on-track' as const,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
  });

  // ── dashboard failure ──────────────────────────────────────────────────────

  it('returns only the investment explainer when the dashboard call fails', async () => {
    mockAccountsService.getDashboardSnapshot.mockRejectedValue(new Error('DB down'));

    const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);

    expect(picks).toHaveLength(1);
    expect(picks[0].type).toBe('investment_explainer');
  });

  // ── Rule 1: idle cash ──────────────────────────────────────────────────────

  describe('Rule 1 — idle cash in chequing → high-yield savings', () => {
    it('fires when chequing exceeds the $2 000 buffer by ≥ $200', async () => {
      // checking = 3 000 → idleCash = 1 000 ≥ 200
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ checking: 3000 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);

      const pick = picks.find((p) => p.type === 'cash_optimization');
      expect(pick).toBeDefined();
      expect(pick!.id).toBe('cash_optimization_1');
      expect(pick!.expectedImpact?.kind).toBe('annual_return');
      // annualReturn = round(1000 / 100) * 100 * 0.045 = 1000 * 0.045 = 45
      expect(pick!.expectedImpact?.value).toBeCloseTo(45);
    });

    it('does NOT fire when idle cash is below $200', async () => {
      // checking = 2 100 → idleCash = 100 < 200
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ checking: 2100 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);
      expect(picks.find((p) => p.type === 'cash_optimization')).toBeUndefined();
    });

    it('does NOT fire when chequing is at or below the $2 000 buffer', async () => {
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ checking: 2000 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);
      expect(picks.find((p) => p.type === 'cash_optimization')).toBeUndefined();
    });
  });

  // ── Rule 2: allocation drift ───────────────────────────────────────────────

  describe('Rule 2 — allocation drift (> 15 pct points)', () => {
    it('fires when investments are well below the goal target share', async () => {
      // retire_early: investShare = 0.70
      // savings = 7 000, investments = 0 → actualShare = 0 → drift = 0.70 > 0.15
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ savings: 7000, investments: 0 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);

      const pick = picks.find((p) => p.type === 'allocation_rebalance');
      expect(pick).toBeDefined();
      expect(pick!.expectedImpact?.kind).toBe('months_faster');
      expect(pick!.confidence).toBe(0.75);
    });

    it('does NOT fire when allocation is within 15 points of target', async () => {
      // actualShare = 2 800/4 000 = 0.70 → drift = 0 → does not exceed 0.15
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ savings: 1200, investments: 2800 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);
      expect(picks.find((p) => p.type === 'allocation_rebalance')).toBeUndefined();
    });

    it('does NOT fire when investableTotal is below $500', async () => {
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ savings: 300, investments: 0 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);
      expect(picks.find((p) => p.type === 'allocation_rebalance')).toBeUndefined();
    });
  });

  // ── Rule 3: goal acceleration ──────────────────────────────────────────────

  describe('Rule 3 — goal acceleration (allocation on-track)', () => {
    it('fires when allocation is on-track and investableTotal is ≥ $4 000', async () => {
      // actualShare = 2 800/4 000 = 0.70 → drift = 0 → in (-0.05, 0.10)
      // annualBump = round(4 000 * 0.05 / 100) * 100 = 200 ≥ 200
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ savings: 1200, investments: 2800 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);

      const pick = picks.find((p) => p.type === 'goal_acceleration');
      expect(pick).toBeDefined();
      expect(pick!.expectedImpact?.kind).toBe('months_faster');
    });

    it('does NOT fire when investments are below $100', async () => {
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ savings: 5000, investments: 50 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);
      expect(picks.find((p) => p.type === 'goal_acceleration')).toBeUndefined();
    });
  });

  // ── Rule 4: bill/fee reduction ─────────────────────────────────────────────

  describe('Rule 4 — bill & fee reduction', () => {
    it('fires when fee spend this month is ≥ $5', async () => {
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ fees: 25 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);

      const pick = picks.find((p) => p.type === 'bill_reduction');
      expect(pick).toBeDefined();
      // annualFees = 25 * 12 = 300
      expect(pick!.expectedImpact?.value).toBe(300);
    });

    it('does NOT fire when fee spend is below $5', async () => {
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ fees: 3 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);
      expect(picks.find((p) => p.type === 'bill_reduction')).toBeUndefined();
    });
  });

  // ── Rule 5: investment explainer ──────────────────────────────────────────

  describe('Rule 5 — investment explainer (always present)', () => {
    it('is always included in the picks', async () => {
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(makeDashboard());

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);

      expect(picks.find((p) => p.type === 'investment_explainer')).toBeDefined();
    });

    it('tailors the explainer title to the user goal', async () => {
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(makeDashboard());

      const picksHouse = await service.getPicks('user-1', UserGoal.SAVE_FOR_HOUSE);
      const houseExplainer = picksHouse.find((p) => p.type === 'investment_explainer')!;
      expect(houseExplainer.title).toBe('High-yield savings accounts');

      const picksRetire = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);
      const retireExplainer = picksRetire.find((p) => p.type === 'investment_explainer')!;
      expect(retireExplainer.title).toBe('Wealthsimple Invest — beginner investing');
    });
  });

  // ── result capped at 3 ────────────────────────────────────────────────────

  describe('result cap', () => {
    it('returns at most 3 picks even when all rules fire', async () => {
      // All four money rules fire: idle cash + rebalance + fees + explainer
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        makeDashboard({ checking: 5000, savings: 7000, investments: 0, fees: 20 }),
      );

      const picks = await service.getPicks('user-1', UserGoal.RETIRE_EARLY);
      expect(picks.length).toBeLessThanOrEqual(3);
    });
  });

  // ── goal default ──────────────────────────────────────────────────────────

  it('defaults to the retire_early plan when no goal is supplied', async () => {
    mockAccountsService.getDashboardSnapshot.mockResolvedValue(makeDashboard());

    const picks = await service.getPicks('user-1');

    const explainer = picks.find((p) => p.type === 'investment_explainer')!;
    expect(explainer.title).toBe('Wealthsimple Invest — beginner investing');
  });
});

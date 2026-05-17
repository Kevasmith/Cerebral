import { InsightEngineService } from './insight-engine.service';
import { InsightType } from '../../entities/insight.entity';
import { TransactionCategory } from '../../entities/transaction.entity';
import { UserGoal } from '../../entities/preference.entity';

// ── mock factories ──────────────────────────────────────────────────────────

/** Returns a query-builder stub whose getOne resolves to `existing`. */
function makeInsightQb(existing: object | null = null) {
  return {
    where:    jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne:   jest.fn().mockResolvedValue(existing),
  };
}

function spend(category: TransactionCategory, total: number, count = 1) {
  return { category, total, count };
}

// ── shared mock objects ─────────────────────────────────────────────────────

const mockInsightRepo    = { createQueryBuilder: jest.fn(), create: jest.fn(), save: jest.fn() };
const mockUserRepo       = { findOne: jest.fn() };
const mockPreferenceRepo = { findOne: jest.fn() };
const mockTransactions   = { getCategorySpending: jest.fn() };
const mockAccounts       = { getDashboardSnapshot: jest.fn() };
const mockAi             = { generateInsightCard: jest.fn() };
const mockNotifications  = { send: jest.fn() };
const mockForecast       = { getBundle: jest.fn() };
const mockOpportunities  = { getPicks: jest.fn() };

function makeService() {
  return new InsightEngineService(
    mockInsightRepo    as any,
    mockUserRepo       as any,
    mockPreferenceRepo as any,
    mockTransactions   as any,
    mockAccounts       as any,
    mockAi             as any,
    mockNotifications  as any,
    mockForecast       as any,
    mockOpportunities  as any,
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Returns a getDashboardSnapshot mock value */
const baseDashboard = {
  totalCashAvailable: 500,
  spendingTrend: { currentMonth: 0, previousMonth: 0, percentageChange: 0, direction: 'stable' as const },
  status: 'on-track' as const,
  accounts: [],
  spendingByCategory: [],
};

/** Spending helper — distinguish current vs previous month by startDate. */
function spendingMock(
  current: ReturnType<typeof spend>[],
  previous: ReturnType<typeof spend>[],
) {
  // June 15 → current month is 5 (June), previous is 4 (May)
  return async (_uid: string, startDate: Date) =>
    startDate.getMonth() === 5 ? current : previous;
}

// ── test suite ───────────────────────────────────────────────────────────────

describe('InsightEngineService', () => {
  let service: InsightEngineService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15'));

    // Default: user + preference exist
    mockUserRepo.findOne.mockResolvedValue({
      id: 'user-1',
      displayName: 'Alice',
      expoPushToken: null,
    });
    mockPreferenceRepo.findOne.mockResolvedValue({
      goal: UserGoal.SAVE_MORE,
      interests: [],
      notificationsEnabled: true,
    });

    // Default: no existing insights (all triggers produce new cards)
    mockInsightRepo.createQueryBuilder.mockReturnValue(makeInsightQb(null));
    mockInsightRepo.create.mockImplementation((data: object) => ({ id: 'ins-id', isRead: false, ...data }));
    mockInsightRepo.save.mockImplementation((data: object) => Promise.resolve(data));

    // Default spending: zero (no rules fire)
    mockTransactions.getCategorySpending.mockResolvedValue([]);

    // Default dashboard: $500 cash (below $1 000 idle-cash threshold)
    mockAccounts.getDashboardSnapshot.mockResolvedValue(baseDashboard);

    // AI always returns a placeholder card
    mockAi.generateInsightCard.mockResolvedValue({ title: 'AI title', body: 'AI body' });

    mockNotifications.send.mockResolvedValue(undefined);

    // Forecast and opportunities: silent by default
    mockForecast.getBundle.mockResolvedValue({ cashFlow: null, goal: null });
    mockOpportunities.getPicks.mockResolvedValue([]);
  });

  afterEach(() => jest.useRealTimers());

  // ── basic flow ──────────────────────────────────────────────────────────────

  it('returns [] immediately when the user does not exist', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);
    expect(await service.runForUser('ghost')).toEqual([]);
    expect(mockAi.generateInsightCard).not.toHaveBeenCalled();
  });

  it('returns [] and makes no AI calls when no rules fire', async () => {
    const result = await service.runForUser('user-1');
    expect(result).toEqual([]);
    expect(mockAi.generateInsightCard).not.toHaveBeenCalled();
  });

  // ── Rule 1: monthly overspend ───────────────────────────────────────────────

  describe('Rule 1 — monthly overspend (≥ 10%)', () => {
    it('fires OVERSPENDING when current spend is 10%+ above previous', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.FOOD, 1100)],
          [spend(TransactionCategory.FOOD, 1000)],
        ),
      );

      const result = await service.runForUser('user-1');

      const types = result.map((i: any) => i.type);
      expect(types).toContain(InsightType.OVERSPENDING);
    });

    it('does NOT fire when increase is under 10%', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.FOOD, 1050)], // +5%
          [spend(TransactionCategory.FOOD, 1000)],
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).not.toContain(InsightType.OVERSPENDING);
    });

    it('does NOT fire when there is no previous-month data', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock([spend(TransactionCategory.FOOD, 1000)], []),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).not.toContain(InsightType.OVERSPENDING);
    });
  });

  // ── Rule 2: category overspend ─────────────────────────────────────────────

  describe('Rule 2 — category-level overspend (≥ 15%)', () => {
    it('fires OVERSPENDING when a watched category is up 15%+', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.FOOD, 230)],
          [spend(TransactionCategory.FOOD, 200)], // +15%
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).toContain(InsightType.OVERSPENDING);
    });

    it('does NOT fire for unwatched categories (e.g. TRANSPORT)', async () => {
      // Same total spend both months — Rule 1 (overall overspend) won't fire.
      // Rule 2 only watches FOOD, ENTERTAINMENT, SHOPPING → no insight.
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.TRANSPORT, 100)],
          [spend(TransactionCategory.TRANSPORT, 100)],
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result).toHaveLength(0);
    });
  });

  // ── Rule 3: idle cash ──────────────────────────────────────────────────────

  describe('Rule 3 — idle cash (≥ $1 000)', () => {
    it('fires IDLE_CASH when totalCashAvailable is at the threshold', async () => {
      mockAccounts.getDashboardSnapshot.mockResolvedValue({
        ...baseDashboard,
        totalCashAvailable: 1000,
      });

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).toContain(InsightType.IDLE_CASH);
    });

    it('does NOT fire when cash is below the threshold', async () => {
      // baseDashboard has totalCashAvailable = 500
      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).not.toContain(InsightType.IDLE_CASH);
    });
  });

  // ── Rule 4: spending down ──────────────────────────────────────────────────

  describe('Rule 4 — spending down (≥ −10%)', () => {
    it('fires SAVINGS_TIP when current spend is 10%+ below previous', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.FOOD, 900)],
          [spend(TransactionCategory.FOOD, 1000)], // −10%
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).toContain(InsightType.SAVINGS_TIP);
    });
  });

  // ── Rule 5: subscriptions ──────────────────────────────────────────────────

  describe('Rule 5 — subscription detection', () => {
    it('fires SAVINGS_TIP when a recurring category appears in both months', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.ENTERTAINMENT, 80)],
          [spend(TransactionCategory.ENTERTAINMENT, 80)],
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).toContain(InsightType.SAVINGS_TIP);
    });

    it('does NOT fire when the category only appears in one month', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.ENTERTAINMENT, 80)],
          [], // not present last month
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).not.toContain(InsightType.SAVINGS_TIP);
    });
  });

  // ── Rule 6.5: category creep ───────────────────────────────────────────────

  describe('Rule 6.5 — category share creep (≥ 5 pct points)', () => {
    it('fires OVERSPENDING when a category share grows by 5+ points', async () => {
      // FOOD share: 60% this month vs 50% last month (+10 pts → fires)
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.FOOD, 60), spend(TransactionCategory.OTHER, 40)],
          [spend(TransactionCategory.FOOD, 50), spend(TransactionCategory.OTHER, 50)],
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).toContain(InsightType.OVERSPENDING);
    });

    it('skips non-discretionary categories (GOVERNMENT)', async () => {
      // GOVERNMENT is in NON_DISCRETIONARY_CATEGORIES and not in the
      // subscription detection list, so neither creep nor subscription fires.
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.GOVERNMENT, 80), spend(TransactionCategory.OTHER, 20)],
          [spend(TransactionCategory.GOVERNMENT, 40), spend(TransactionCategory.OTHER, 60)],
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result).toHaveLength(0);
    });
  });

  // ── Rule 6.75: lifestyle inflation ─────────────────────────────────────────

  describe('Rule 6.75 — lifestyle inflation (≥ 20% in discretionary)', () => {
    it('fires OVERSPENDING when discretionary spend rises 20%+', async () => {
      // FOOD + ENTERTAINMENT discretionary: 600 vs 500 = +20%
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.FOOD, 400), spend(TransactionCategory.ENTERTAINMENT, 200)],
          [spend(TransactionCategory.FOOD, 300), spend(TransactionCategory.ENTERTAINMENT, 200)],
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).toContain(InsightType.OVERSPENDING);
    });

    it('does NOT fire when previous discretionary was below $100', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.FOOD, 200)],
          [spend(TransactionCategory.FOOD, 50)], // prev < $100
        ),
      );

      const result = await service.runForUser('user-1');
      // Rule 1 (monthly overspend +300%) fires, but not lifestyle inflation
      const types = result.map((i: any) => i.type);
      // Any OVERSPENDING triggers are from other rules — lifestyle inflation
      // should not produce an additional trigger. We assert rule 6.75's
      // metadata is absent by checking no insight has aiType 'lifestyle_inflation'.
      const lifestyleInsights = result.filter(
        (i: any) => i.metadata?.rule === 'lifestyle_inflation',
      );
      expect(lifestyleInsights).toHaveLength(0);
    });
  });

  // ── Rule 7: income trend ───────────────────────────────────────────────────

  describe('Rule 7 — income trend (≥ 10% change)', () => {
    it('fires INCOME_TREND when income is up 10%+', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.INCOME, 5500)],
          [spend(TransactionCategory.INCOME, 5000)], // +10%
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).toContain(InsightType.INCOME_TREND);
    });

    it('fires INCOME_TREND when income drops 10%+', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.INCOME, 4000)],
          [spend(TransactionCategory.INCOME, 5000)], // −20%
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).toContain(InsightType.INCOME_TREND);
    });

    it('does NOT fire when income change is within ±10%', async () => {
      mockTransactions.getCategorySpending.mockImplementation(
        spendingMock(
          [spend(TransactionCategory.INCOME, 5080)],
          [spend(TransactionCategory.INCOME, 5000)], // +1.6%
        ),
      );

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).not.toContain(InsightType.INCOME_TREND);
    });
  });

  // ── Rule 8: low-balance forecast ───────────────────────────────────────────

  describe('Rule 8 — low-balance forecast (projectedLow < $500)', () => {
    it('fires IDLE_CASH when month-end balance is forecast below threshold', async () => {
      mockForecast.getBundle.mockResolvedValue({
        cashFlow: {
          projectedLow: 200,
          confidence: 0.7,
          dailySpendRate: 60,
          projectedLowDate: '2024-06-30',
          horizonDays: 15,
        },
        goal: null,
      });

      const result = await service.runForUser('user-1');
      const match = result.find(
        (i: any) => i.metadata?.rule === 'low_balance_forecast',
      );
      expect(match).toBeDefined();
      expect(match!.type).toBe(InsightType.IDLE_CASH);
    });

    it('does NOT fire when confidence is below 0.5', async () => {
      mockForecast.getBundle.mockResolvedValue({
        cashFlow: {
          projectedLow: 200,
          confidence: 0.4,     // below threshold
          dailySpendRate: 60,
          projectedLowDate: '2024-06-30',
          horizonDays: 15,
        },
        goal: null,
      });

      const result = await service.runForUser('user-1');
      expect(result.find((i: any) => i.metadata?.rule === 'low_balance_forecast')).toBeUndefined();
    });

    it('does NOT fire when projectedLow is 0 (already floor)', async () => {
      mockForecast.getBundle.mockResolvedValue({
        cashFlow: {
          projectedLow: 0,
          confidence: 0.8,
          dailySpendRate: 120,
          projectedLowDate: '2024-06-30',
          horizonDays: 15,
        },
        goal: null,
      });

      const result = await service.runForUser('user-1');
      expect(result.find((i: any) => i.metadata?.rule === 'low_balance_forecast')).toBeUndefined();
    });
  });

  // ── Rule 9: high-impact pick ───────────────────────────────────────────────

  describe('Rule 9 — high-impact Cerebral Pick (≥ $50/yr)', () => {
    it('fires OPPORTUNITY when a cash_optimization pick returns ≥ $50/yr', async () => {
      mockOpportunities.getPicks.mockResolvedValue([
        {
          id: 'pick-1',
          type: 'cash_optimization',
          title: 'Move idle cash',
          description: '…',
          expectedImpact: { kind: 'annual_return', value: 75 },
          confidence: 0.9,
        },
      ]);

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).toContain(InsightType.OPPORTUNITY);
    });

    it('does NOT fire when the pick is under $50/yr', async () => {
      mockOpportunities.getPicks.mockResolvedValue([
        {
          id: 'pick-2',
          type: 'cash_optimization',
          title: 'Small return',
          description: '…',
          expectedImpact: { kind: 'annual_return', value: 30 },
          confidence: 0.9,
        },
      ]);

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).not.toContain(InsightType.OPPORTUNITY);
    });

    it('does NOT fire for non-cash_optimization pick types', async () => {
      mockOpportunities.getPicks.mockResolvedValue([
        {
          id: 'pick-3',
          type: 'allocation_rebalance',
          title: 'Rebalance portfolio',
          description: '…',
          expectedImpact: { kind: 'annual_return', value: 500 },
          confidence: 0.8,
        },
      ]);

      const result = await service.runForUser('user-1');
      expect(result.map((i: any) => i.type)).not.toContain(InsightType.OPPORTUNITY);
    });
  });

  // ── deduplication ──────────────────────────────────────────────────────────

  describe('deduplication via recentInsightExists', () => {
    it('suppresses an insight when an identical rule+month entry already exists', async () => {
      mockAccounts.getDashboardSnapshot.mockResolvedValue({
        ...baseDashboard,
        totalCashAvailable: 1000, // would trigger idle_cash rule
      });

      // Make the query builder return an existing insight for this rule/month
      mockInsightRepo.createQueryBuilder.mockReturnValue(
        makeInsightQb({ id: 'existing-ins', type: InsightType.IDLE_CASH }),
      );

      const result = await service.runForUser('user-1');

      expect(result).toHaveLength(0);
      expect(mockAi.generateInsightCard).not.toHaveBeenCalled();
    });
  });

  // ── notifications ──────────────────────────────────────────────────────────

  describe('push notifications', () => {
    beforeEach(() => {
      // Make one rule fire so we have new insights
      mockAccounts.getDashboardSnapshot.mockResolvedValue({
        ...baseDashboard,
        totalCashAvailable: 1000,
      });
    });

    it('sends a push notification when the user has a token and notifications are enabled', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        displayName: 'Alice',
        expoPushToken: 'ExponentPushToken[abc123]',
      });
      mockPreferenceRepo.findOne.mockResolvedValue({
        goal: UserGoal.SAVE_MORE,
        interests: [],
        notificationsEnabled: true,
      });

      await service.runForUser('user-1');

      expect(mockNotifications.send).toHaveBeenCalledTimes(1);
      expect(mockNotifications.send).toHaveBeenCalledWith(
        'ExponentPushToken[abc123]',
        expect.any(String),
        expect.any(String),
      );
    });

    it('skips notifications when the user has no push token', async () => {
      // Default user has expoPushToken: null
      await service.runForUser('user-1');
      expect(mockNotifications.send).not.toHaveBeenCalled();
    });

    it('skips notifications when the user disabled them in settings', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        displayName: 'Alice',
        expoPushToken: 'ExponentPushToken[abc123]',
      });
      mockPreferenceRepo.findOne.mockResolvedValue({
        goal: UserGoal.SAVE_MORE,
        interests: [],
        notificationsEnabled: false,
      });

      await service.runForUser('user-1');

      expect(mockNotifications.send).not.toHaveBeenCalled();
    });
  });
});

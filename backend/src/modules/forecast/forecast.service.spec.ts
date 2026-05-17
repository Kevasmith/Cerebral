import { ForecastService } from './forecast.service';
import { UserGoal } from '../../entities/preference.entity';

const mockAccountsService = {
  getDashboardSnapshot: jest.fn(),
};

function makeService() {
  return new ForecastService(mockAccountsService as any);
}

function snapshot(overrides: Partial<{
  totalCashAvailable: number;
  currentMonth: number;
  previousMonth: number;
}> = {}) {
  return {
    totalCashAvailable: overrides.totalCashAvailable ?? 5000,
    spendingTrend: {
      currentMonth:  overrides.currentMonth  ?? 900,
      previousMonth: overrides.previousMonth ?? 3500,
      percentageChange: 0,
      direction: 'stable' as const,
    },
    status: 'on-track' as const,
    accounts: [],
    spendingByCategory: [],
  };
}

describe('ForecastService', () => {
  let service: ForecastService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── cashFlowForecast ───────────────────────────────────────────────────────

  describe('cashFlowForecast', () => {
    it('returns confidence 0.4 when fewer than 3 days into the month', async () => {
      jest.setSystemTime(new Date('2024-01-01'));
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(snapshot({ totalCashAvailable: 4000, currentMonth: 100 }));

      const bundle = await service.getBundle('user-1');

      expect(bundle.cashFlow).not.toBeNull();
      expect(bundle.cashFlow!.confidence).toBe(0.4);
      expect(bundle.cashFlow!.projectedLow).toBe(4000); // equals current cash
      expect(bundle.cashFlow!.dailySpendRate).toBe(0);
    });

    it('returns confidence 0.4 when monthSpend is zero', async () => {
      jest.setSystemTime(new Date('2024-01-15'));
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(snapshot({ currentMonth: 0 }));

      const bundle = await service.getBundle('user-1');

      expect(bundle.cashFlow!.confidence).toBe(0.4);
    });

    it('extrapolates spend linearly mid-month', async () => {
      // Jan 15: dayOfMonth=15, daysInMonth=31, daysRemaining=16
      jest.setSystemTime(new Date('2024-01-15'));
      // 900 MTD / 15 days = $60/day; 16 days left = $960 more
      // projectedLow = max(0, 5000 - 960) = 4040
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        snapshot({ totalCashAvailable: 5000, currentMonth: 900 }),
      );

      const bundle = await service.getBundle('user-1');
      const cf = bundle.cashFlow!;

      expect(cf.dailySpendRate).toBe(60);
      expect(cf.horizonDays).toBe(16);
      expect(cf.projectedLow).toBe(4040);
      expect(cf.projectedLowDate).toBe('2024-01-31');
      // confidence = min(0.9, 0.5 + 15/30 * 0.4) = 0.70
      expect(cf.confidence).toBe(0.7);
    });

    it('floors projectedLow at 0 when spend exceeds cash', async () => {
      jest.setSystemTime(new Date('2024-01-20'));
      // 3000 MTD / 20 days = 150/day; 11 days left = 1650 more; 500 - 1650 < 0
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        snapshot({ totalCashAvailable: 500, currentMonth: 3000 }),
      );

      const bundle = await service.getBundle('user-1');
      expect(bundle.cashFlow!.projectedLow).toBe(0);
    });
  });

  // ─── goalForecast ───────────────────────────────────────────────────────────

  describe('goalForecast', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date('2024-01-15'));
    });

    it('returns achieved when cash meets or exceeds the target', async () => {
      // save_for_house target = $100,000
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        snapshot({ totalCashAvailable: 100_001 }),
      );

      const bundle = await service.getBundle('user-1', UserGoal.SAVE_FOR_HOUSE);

      expect(bundle.goal!.status).toBe('achieved');
      expect(bundle.goal!.monthsToTarget).toBe(0);
    });

    it('returns stalled when monthly savings rate is zero', async () => {
      // previousMonth = 0 → impliedIncome = 0 → monthlyRate = 0
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        snapshot({ totalCashAvailable: 1000, previousMonth: 0, currentMonth: 0 }),
      );

      const bundle = await service.getBundle('user-1', UserGoal.EMERGENCY_FUND);

      expect(bundle.goal!.status).toBe('stalled');
      expect(bundle.goal!.monthsToTarget).toBeNull();
    });

    it('returns on_track with a correct monthsToTarget estimate', async () => {
      // emergency_fund target = $18,000; cash = $3000; remaining = $15,000
      // prevMonth = 3500 → impliedIncome = 3500/0.70 = 5000 → monthlyRate = 1500
      // monthsToTarget = ceil(15000 / 1500) = 10
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        snapshot({ totalCashAvailable: 3000, previousMonth: 3500 }),
      );

      const bundle = await service.getBundle('user-1', UserGoal.EMERGENCY_FUND);

      expect(bundle.goal!.status).toBe('on_track');
      expect(bundle.goal!.monthsToTarget).toBe(10);
      expect(bundle.goal!.monthlyRate).toBe(1500);
    });

    it('defaults to retire_early when goal is not supplied', async () => {
      // retire_early target = $1,200,000 — with modest cash, will be on_track or stalled
      mockAccountsService.getDashboardSnapshot.mockResolvedValue(
        snapshot({ totalCashAvailable: 50_000 }),
      );

      const bundle = await service.getBundle('user-1');

      expect(bundle.goal!.goalLabel).toBe('Retirement Portfolio');
      expect(bundle.goal!.target).toBe(1_200_000);
    });
  });

  // ─── error resilience ───────────────────────────────────────────────────────

  describe('getBundle resilience', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date('2024-01-15'));
    });

    it('returns null for cashFlow when accountsService throws', async () => {
      mockAccountsService.getDashboardSnapshot
        .mockRejectedValueOnce(new Error('DB timeout'))
        .mockRejectedValueOnce(new Error('DB timeout'));

      const bundle = await service.getBundle('user-1');

      expect(bundle.cashFlow).toBeNull();
      expect(bundle.goal).toBeNull();
    });
  });
});

import { InsightsService } from './insights.service';

// InsightsService → UsersService → auth/auth, which uses better-auth (ESM).
// Mock the auth module so Jest doesn't try to parse the ESM package.
jest.mock('../../auth/auth', () => ({
  auth: { $context: Promise.resolve({ internalAdapter: {} }) },
}));
import { TransactionCategory } from '../../entities/transaction.entity';
import { UserGoal } from '../../entities/preference.entity';

// ── shared mocks ──────────────────────────────────────────────────────────────

const mockQb = {
  where:    jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy:  jest.fn().mockReturnThis(),
  getMany:  jest.fn(),
};

const mockInsightRepo = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQb),
  update: jest.fn().mockResolvedValue(undefined),
  count:  jest.fn(),
};

const mockEngine       = { runForUser: jest.fn().mockResolvedValue([]) };
const mockAi           = { generateWeeklySummary: jest.fn() };
const mockTransactions = { getCategorySpending: jest.fn() };
const mockUsers        = { getPreferences: jest.fn() };

function makeService() {
  return new InsightsService(
    mockInsightRepo as any,
    mockEngine      as any,
    mockAi          as any,
    mockTransactions as any,
    mockUsers        as any,
  );
}

function spend(category: TransactionCategory, total: number, count = 1) {
  return { category, total, count };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('InsightsService', () => {
  let service: InsightsService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
    mockInsightRepo.createQueryBuilder.mockReturnValue(mockQb);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15'));
  });

  afterEach(() => jest.useRealTimers());

  // ── getActiveInsights ──────────────────────────────────────────────────────

  describe('getActiveInsights', () => {
    it('returns insights from the query builder', async () => {
      const insights = [{ id: 'ins-1' }, { id: 'ins-2' }];
      mockQb.getMany.mockResolvedValue(insights);

      const result = await service.getActiveInsights('user-1');

      expect(result).toEqual(insights);
      expect(mockInsightRepo.createQueryBuilder).toHaveBeenCalledWith('insight');
    });

    it('filters by userId and excludes expired entries', async () => {
      mockQb.getMany.mockResolvedValue([]);
      await service.getActiveInsights('user-1');

      expect(mockQb.where).toHaveBeenCalledWith('insight.userId = :userId', { userId: 'user-1' });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(insight.expiresAt IS NULL OR insight.expiresAt > NOW())',
      );
    });

    it('orders results by createdAt descending', async () => {
      mockQb.getMany.mockResolvedValue([]);
      await service.getActiveInsights('user-1');

      expect(mockQb.orderBy).toHaveBeenCalledWith('insight.createdAt', 'DESC');
    });
  });

  // ── markRead ───────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('updates the insight row to isRead: true scoped to the user', async () => {
      await service.markRead('ins-abc', 'user-1');

      expect(mockInsightRepo.update).toHaveBeenCalledWith(
        { id: 'ins-abc', userId: 'user-1' },
        { isRead: true },
      );
    });
  });

  // ── getUnreadCount ─────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns the count of unread insights for the user', async () => {
      mockInsightRepo.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(3);
      expect(mockInsightRepo.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  // ── refreshAndGetInsights ──────────────────────────────────────────────────

  describe('refreshAndGetInsights', () => {
    it('runs the engine then returns active insights', async () => {
      const insights = [{ id: 'ins-1' }];
      mockQb.getMany.mockResolvedValue(insights);

      const result = await service.refreshAndGetInsights('user-1');

      expect(mockEngine.runForUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(insights);
    });

    it('calls getActiveInsights after the engine, not before', async () => {
      const calls: string[] = [];
      mockEngine.runForUser.mockImplementation(async () => { calls.push('engine'); });
      mockQb.getMany.mockImplementation(async () => { calls.push('query'); return []; });

      await service.refreshAndGetInsights('user-1');

      expect(calls).toEqual(['engine', 'query']);
    });
  });

  // ── getWeeklySummary ───────────────────────────────────────────────────────

  describe('getWeeklySummary', () => {
    const aiResult = { headline: 'Good week!', tips: [] };

    beforeEach(() => {
      mockAi.generateWeeklySummary.mockResolvedValue(aiResult);
      mockUsers.getPreferences.mockResolvedValue({
        goal: UserGoal.SAVE_MORE,
        location: 'Toronto, ON',
      });
    });

    it('excludes INCOME and TRANSFER categories from spending totals', async () => {
      mockTransactions.getCategorySpending
        .mockResolvedValueOnce([
          spend(TransactionCategory.FOOD, 300),
          spend(TransactionCategory.INCOME, 2000),
          spend(TransactionCategory.TRANSFER, 500),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getWeeklySummary('user-1');

      // Only FOOD ($300) should be counted — INCOME and TRANSFER stripped out
      expect(result.thisWeekTotal).toBe(300);
    });

    it('computes lastWeekTotal from last-week data only (also excludes INCOME/TRANSFER)', async () => {
      mockTransactions.getCategorySpending
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          spend(TransactionCategory.SHOPPING, 200),
          spend(TransactionCategory.INCOME, 1500),
        ]);

      const result = await service.getWeeklySummary('user-1');

      expect(result.lastWeekTotal).toBe(200);
    });

    it('extracts incomeThisWeek from the INCOME category of this-week data', async () => {
      mockTransactions.getCategorySpending
        .mockResolvedValueOnce([
          spend(TransactionCategory.FOOD, 300),
          spend(TransactionCategory.INCOME, 4500),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getWeeklySummary('user-1');

      expect(result.thisWeekTotal).toBe(300);
      // incomeThisWeek is passed to the AI — verify via AI call args
      expect(mockAi.generateWeeklySummary).toHaveBeenCalledWith(
        expect.objectContaining({ incomeThisWeek: 4500 }),
      );
    });

    it('picks the highest-spend category as topCategory', async () => {
      mockTransactions.getCategorySpending
        .mockResolvedValueOnce([
          spend(TransactionCategory.FOOD, 300),
          spend(TransactionCategory.ENTERTAINMENT, 500), // highest
          spend(TransactionCategory.SHOPPING, 100),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getWeeklySummary('user-1');

      expect(result.topCategory).toBe(TransactionCategory.ENTERTAINMENT);
    });

    it('defaults topCategory to "other" when there is no spending', async () => {
      mockTransactions.getCategorySpending
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getWeeklySummary('user-1');

      expect(result.topCategory).toBe('other');
    });

    it('passes user goal and location to the AI when preferences exist', async () => {
      mockTransactions.getCategorySpending
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getWeeklySummary('user-1');

      expect(mockAi.generateWeeklySummary).toHaveBeenCalledWith(
        expect.objectContaining({
          userGoal: UserGoal.SAVE_MORE,
          location: 'Toronto, ON',
        }),
      );
    });

    it('falls back to default goal and location when preferences cannot be loaded', async () => {
      mockUsers.getPreferences.mockRejectedValue(new Error('Not found'));
      mockTransactions.getCategorySpending
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getWeeklySummary('user-1');

      expect(mockAi.generateWeeklySummary).toHaveBeenCalledWith(
        expect.objectContaining({
          userGoal: UserGoal.SAVE_MORE,
          location: 'Edmonton, AB, Canada',
        }),
      );
    });

    it('sets weekOf to the ISO date of 7 days ago', async () => {
      mockTransactions.getCategorySpending
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getWeeklySummary('user-1');

      // System time pinned to 2024-06-15 → 7 days ago = 2024-06-08
      expect(result.weekOf).toBe('2024-06-08');
    });

    it('merges the AI summary fields into the return value', async () => {
      mockAi.generateWeeklySummary.mockResolvedValue({ headline: 'Great!', advice: 'Save more.' });
      mockTransactions.getCategorySpending
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getWeeklySummary('user-1');

      expect(result).toMatchObject({ headline: 'Great!', advice: 'Save more.' });
    });
  });
});

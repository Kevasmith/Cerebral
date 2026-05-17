import { AccountsService } from './accounts.service';
import { AccountType } from '../../entities/account.entity';
import { Transaction } from '../../entities/transaction.entity';

// ── query-builder helpers ─────────────────────────────────────────────────────

/** Fluent raw-query builder stub (for getSpendingTrend). */
function makeRawQb(rawValue: Record<string, string | number>) {
  return {
    select:   jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where:    jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(rawValue),
  };
}

/** Fluent entity-query builder stub (for disconnectInstitution). */
function makeEntityQb(result: object[]) {
  return {
    where:    jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany:  jest.fn().mockResolvedValue(result),
    delete:   jest.fn().mockReturnThis(),
    execute:  jest.fn().mockResolvedValue({}),
  };
}

// ── shared mock objects ────────────────────────────────────────────────────────

const mockTransRepo = { createQueryBuilder: jest.fn() };

const mockAccountRepo = {
  find:               jest.fn(),
  findOne:            jest.fn(),
  create:             jest.fn(),
  save:               jest.fn(),
  createQueryBuilder: jest.fn(),
  manager: {
    getRepository:  jest.fn().mockReturnValue(mockTransRepo),
    transaction:    jest.fn(),
  },
};

const mockFlinks           = {};
const mockTransactionsService = { getCategorySpending: jest.fn(), syncFromFlinks: jest.fn() };
const mockBankProviderRouter  = {};

function makeService() {
  return new AccountsService(
    mockAccountRepo            as any,
    mockFlinks                 as any,
    mockTransactionsService    as any,
    mockBankProviderRouter     as any,
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe('AccountsService', () => {
  let service: AccountsService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
    // Restore default: getRepository returns the transaction repo stub
    mockAccountRepo.manager.getRepository.mockReturnValue(mockTransRepo);
  });

  // ── mapAccountType (private) ──────────────────────────────────────────────

  describe('mapAccountType', () => {
    it.each([
      ['savings account',     AccountType.SAVINGS],
      ['Savings',             AccountType.SAVINGS],
      ['credit card',         AccountType.CREDIT],
      ['Credit',              AccountType.CREDIT],
      ['investment portfolio',AccountType.INVESTMENT],
      ['INVEST',              AccountType.INVESTMENT],
      ['chequing',            AccountType.CHECKING],
      ['current',             AccountType.CHECKING],
      ['',                    AccountType.CHECKING],
    ])('maps "%s" → %s', (input, expected) => {
      expect((service as any).mapAccountType(input)).toBe(expected);
    });
  });

  // ── normalizedTypeToEnum (private) ───────────────────────────────────────

  describe('normalizedTypeToEnum', () => {
    it.each([
      ['savings',    AccountType.SAVINGS],
      ['credit',     AccountType.CREDIT],
      ['investment', AccountType.INVESTMENT],
      ['checking',   AccountType.CHECKING],
      ['unknown',    AccountType.CHECKING], // default
    ])('maps "%s" → %s', (input, expected) => {
      expect((service as any).normalizedTypeToEnum(input)).toBe(expected);
    });
  });

  // ── getSpendingTrend ──────────────────────────────────────────────────────

  describe('getSpendingTrend', () => {
    it('returns up direction when current spend is more than 5% above previous', async () => {
      mockTransRepo.createQueryBuilder
        .mockReturnValueOnce(makeRawQb({ total: '1300' })) // current month
        .mockReturnValueOnce(makeRawQb({ total: '1000' })); // previous month

      const result = await service.getSpendingTrend('user-1');

      expect(result.currentMonth).toBe(1300);
      expect(result.previousMonth).toBe(1000);
      expect(result.percentageChange).toBeCloseTo(30);
      expect(result.direction).toBe('up');
    });

    it('returns down direction when current spend is more than 5% below previous', async () => {
      mockTransRepo.createQueryBuilder
        .mockReturnValueOnce(makeRawQb({ total: '800' }))
        .mockReturnValueOnce(makeRawQb({ total: '1000' }));

      const result = await service.getSpendingTrend('user-1');

      expect(result.currentMonth).toBe(800);
      expect(result.direction).toBe('down');
      expect(result.percentageChange).toBeCloseTo(-20);
    });

    it('returns stable when the change is within ±5%', async () => {
      mockTransRepo.createQueryBuilder
        .mockReturnValueOnce(makeRawQb({ total: '1040' })) // +4%
        .mockReturnValueOnce(makeRawQb({ total: '1000' }));

      const result = await service.getSpendingTrend('user-1');

      expect(result.direction).toBe('stable');
    });

    it('returns stable with 0% change when there is no previous-month data', async () => {
      mockTransRepo.createQueryBuilder
        .mockReturnValueOnce(makeRawQb({ total: '500' }))
        .mockReturnValueOnce(makeRawQb({ total: '0' }));

      const result = await service.getSpendingTrend('user-1');

      expect(result.previousMonth).toBe(0);
      expect(result.percentageChange).toBe(0);
      expect(result.direction).toBe('stable');
    });

    it('uses the Transaction entity to fetch the repository', async () => {
      mockTransRepo.createQueryBuilder
        .mockReturnValueOnce(makeRawQb({ total: '0' }))
        .mockReturnValueOnce(makeRawQb({ total: '0' }));

      await service.getSpendingTrend('user-1');

      expect(mockAccountRepo.manager.getRepository).toHaveBeenCalledWith(Transaction);
    });
  });

  // ── getFinancialStatus ───────────────────────────────────────────────────

  describe('getFinancialStatus', () => {
    it('returns overspending when spend is up > 20%', async () => {
      mockTransRepo.createQueryBuilder
        .mockReturnValueOnce(makeRawQb({ total: '1300' })) // +30%
        .mockReturnValueOnce(makeRawQb({ total: '1000' }));

      expect(await service.getFinancialStatus('user-1')).toBe('overspending');
    });

    it('returns underspending when spend is down > 20%', async () => {
      mockTransRepo.createQueryBuilder
        .mockReturnValueOnce(makeRawQb({ total: '700' }))  // −30%
        .mockReturnValueOnce(makeRawQb({ total: '1000' }));

      expect(await service.getFinancialStatus('user-1')).toBe('underspending');
    });

    it('returns on-track when change is within ±20%', async () => {
      mockTransRepo.createQueryBuilder
        .mockReturnValueOnce(makeRawQb({ total: '1150' })) // +15%
        .mockReturnValueOnce(makeRawQb({ total: '1000' }));

      expect(await service.getFinancialStatus('user-1')).toBe('on-track');
    });
  });

  // ── disconnectInstitution ─────────────────────────────────────────────────

  describe('disconnectInstitution', () => {
    it('returns accountsRemoved: 0 and skips the transaction when no accounts match', async () => {
      const qb = makeEntityQb([]); // no accounts
      mockAccountRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.disconnectInstitution('user-1', 'RBC');

      expect(result).toEqual({ accountsRemoved: 0 });
      expect(mockAccountRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('deletes accounts and transactions and returns the correct count', async () => {
      const accounts = [
        { id: 'acct-1', userId: 'user-1', institutionName: 'TD Bank' },
        { id: 'acct-2', userId: 'user-1', institutionName: 'TD Bank' },
      ];

      const deleteQb = {
        delete:  jest.fn().mockReturnThis(),
        where:   jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };
      const mockEm = {
        getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(deleteQb) }),
      };

      const findQb = makeEntityQb(accounts);
      mockAccountRepo.createQueryBuilder.mockReturnValue(findQb);
      mockAccountRepo.manager.transaction.mockImplementation(
        async (fn: (em: any) => Promise<void>) => fn(mockEm),
      );

      const result = await service.disconnectInstitution('user-1', 'TD Bank');

      expect(result).toEqual({ accountsRemoved: 2 });
      expect(mockAccountRepo.manager.transaction).toHaveBeenCalledTimes(1);
      // delete should have been called twice: once for transactions, once for accounts
      expect(mockEm.getRepository).toHaveBeenCalledTimes(2);
    });

    it('performs a case-insensitive match on institutionName', async () => {
      const qb = makeEntityQb([]);
      mockAccountRepo.createQueryBuilder.mockReturnValue(qb);

      await service.disconnectInstitution('user-1', 'ROYAL BANK');

      // Verify the andWhere call uses LOWER() for case-insensitive comparison
      expect(qb.andWhere).toHaveBeenCalledWith(
        'LOWER(a.institutionName) = LOWER(:institutionName)',
        { institutionName: 'ROYAL BANK' },
      );
    });
  });
});

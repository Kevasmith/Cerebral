import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountType } from '../../entities/account.entity';
import { Transaction } from '../../entities/transaction.entity';
import { FlinksService } from '../flinks/flinks.service';
import { TransactionsService } from '../transactions/transactions.service';
import { FlinksAccount } from '../flinks/flinks.types';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly flinks: FlinksService,
    private readonly transactionsService: TransactionsService,
  ) {}

  getConnectUrl(redirectUrl: string): string {
    return this.flinks.getConnectUrl(redirectUrl);
  }

  async syncFromLoginId(userId: string, loginId: string): Promise<Account[]> {
    // 1. Exchange loginId for a requestId
    const { RequestId: requestId } = await this.flinks.authorize(loginId);

    // 2. Fetch account details
    const { Accounts: flinksAccounts, Login } =
      await this.flinks.getAccountsDetail(requestId);

    // 3. Upsert accounts
    const saved = await Promise.all(
      flinksAccounts.map((fa) => this.upsertAccount(userId, fa, Login.InstitutionName)),
    );

    // 4. Sync transactions for each account
    await this.transactionsService.syncFromFlinks(requestId, saved);

    return saved;
  }

  async findAllByUser(userId: string): Promise<Account[]> {
    return this.accountRepo.find({ where: { userId } });
  }

  private async upsertAccount(
    userId: string,
    fa: FlinksAccount,
    institutionName: string,
  ): Promise<Account> {
    let account = await this.accountRepo.findOne({
      where: { flinksAccountId: fa.Id },
    });

    if (!account) {
      account = this.accountRepo.create({ userId, flinksAccountId: fa.Id });
    }

    account.institutionName = institutionName;
    account.accountName = fa.Title;
    account.balance = fa.Balance.Available ?? fa.Balance.Current;
    account.currency = fa.Currency ?? 'CAD';
    account.accountType = this.mapAccountType(fa.Type);
    account.lastSyncedAt = new Date();

    return this.accountRepo.save(account);
  }

  private mapAccountType(flinksType: string): AccountType {
    const t = (flinksType ?? '').toLowerCase();
    if (t.includes('saving')) return AccountType.SAVINGS;
    if (t.includes('credit')) return AccountType.CREDIT;
    if (t.includes('invest')) return AccountType.INVESTMENT;
    return AccountType.CHECKING;
  }

  /**
   * Get total cash available across all user accounts
   */
  async getTotalCashAvailable(userId: string): Promise<number> {
    const accounts = await this.accountRepo.find({
      where: { userId },
    });

    return accounts.reduce((total, account) => {
      return total + (parseFloat(account.balance.toString()) || 0);
    }, 0);
  }

  /**
   * Calculate spending trend (current month vs previous month)
   */
  async getSpendingTrend(
    userId: string,
  ): Promise<{
    currentMonth: number;
    previousMonth: number;
    percentageChange: number;
    direction: 'up' | 'down' | 'stable';
  }> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Current month dates
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

    // Previous month dates
    const previousMonthStart = new Date(
      currentMonth === 0 ? currentYear - 1 : currentYear,
      currentMonth === 0 ? 11 : currentMonth - 1,
      1,
    );
    const previousMonthEnd = new Date(currentYear, currentMonth, 0);

    // Get current month spending (using a raw query to avoid TypeORM issues)
    const transactionRepository = this.accountRepo.manager.getRepository(Transaction);

    const currentMonthResult = await transactionRepository
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.amount), 0)', 'total')
      .leftJoin('transaction.account', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.isDebit = :isDebit', { isDebit: true })
      .andWhere('transaction.date BETWEEN :startDate AND :endDate', {
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
      })
      .getRawOne();

    // Get previous month spending
    const previousMonthResult = await transactionRepository
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.amount), 0)', 'total')
      .leftJoin('transaction.account', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.isDebit = :isDebit', { isDebit: true })
      .andWhere('transaction.date BETWEEN :startDate AND :endDate', {
        startDate: previousMonthStart,
        endDate: previousMonthEnd,
      })
      .getRawOne();

    const currentMonthValue = parseFloat(currentMonthResult?.total || 0);
    const previousMonthValue = parseFloat(previousMonthResult?.total || 0);

    let percentageChange = 0;
    let direction: 'up' | 'down' | 'stable' = 'stable';

    if (previousMonthValue > 0) {
      percentageChange = ((currentMonthValue - previousMonthValue) / previousMonthValue) * 100;
      direction = percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'stable';
    }

    return {
      currentMonth: currentMonthValue,
      previousMonth: previousMonthValue,
      percentageChange,
      direction,
    };
  }

  /**
   * Determine financial status based on spending patterns
   */
  async getFinancialStatus(
    userId: string,
  ): Promise<'on-track' | 'overspending' | 'underspending'> {
    const trend = await this.getSpendingTrend(userId);

    if (trend.direction === 'up' && trend.percentageChange > 20) {
      return 'overspending';
    } else if (trend.direction === 'down' && trend.percentageChange < -20) {
      return 'underspending';
    }

    return 'on-track';
  }

  /**
   * Get dashboard snapshot for the current user
   */
  async getDashboardSnapshot(
    userId: string,
  ): Promise<{
    totalCashAvailable: number;
    spendingTrend: {
      currentMonth: number;
      previousMonth: number;
      percentageChange: number;
      direction: 'up' | 'down' | 'stable';
    };
    status: 'on-track' | 'overspending' | 'underspending';
    accounts: Account[];
  }> {
    const [totalCashAvailable, spendingTrend, status, accounts] =
      await Promise.all([
        this.getTotalCashAvailable(userId),
        this.getSpendingTrend(userId),
        this.getFinancialStatus(userId),
        this.accountRepo.find({ where: { userId } }),
      ]);

    return {
      totalCashAvailable,
      spendingTrend,
      status,
      accounts,
    };
  }
}

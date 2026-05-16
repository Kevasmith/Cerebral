import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountType } from '../../entities/account.entity';
import { Transaction } from '../../entities/transaction.entity';
import { FlinksService } from '../flinks/flinks.service';
import { TransactionsService } from '../transactions/transactions.service';
import { FlinksAccount } from '../flinks/flinks.types';
import { BankProviderRouter } from '../bank/bank-provider.router';
import { NormalizedAccount } from '../bank/bank-provider.interface';
import { UserGoal } from '../../entities/preference.entity';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly flinks: FlinksService,
    private readonly transactionsService: TransactionsService,
    private readonly bankProviderRouter: BankProviderRouter,
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

  /**
   * Disconnect a single institution for this user. Wipes the user's accounts
   * under that institutionName and every transaction tied to those accounts.
   * Plaid item/remove (revoking the access token at Plaid's side) is left as
   * a follow-up — see TODO below — so for now we trust the local cleanup.
   *
   * Returns the count of accounts removed so the caller can confirm.
   */
  async disconnectInstitution(
    userId: string,
    institutionName: string,
  ): Promise<{ accountsRemoved: number }> {
    // Find every account this user owns under the institution. The match is
    // case-insensitive because Plaid / Flinks sometimes return slightly
    // different casing across syncs (e.g. "Chase" vs "CHASE BANK").
    const accounts = await this.accountRepo
      .createQueryBuilder('a')
      .where('a.userId = :userId', { userId })
      .andWhere('LOWER(a.institutionName) = LOWER(:institutionName)', { institutionName })
      .getMany();

    if (accounts.length === 0) {
      return { accountsRemoved: 0 };
    }

    const accountIds = accounts.map((a) => a.id);

    // Wipe transactions first (FK from transactions.accountId → accounts.id)
    // then the accounts themselves, all in one transaction so we don't end
    // up with orphans on a partial failure.
    await this.accountRepo.manager.transaction(async (em) => {
      await em.getRepository(Transaction)
        .createQueryBuilder()
        .delete()
        .where('"accountId" IN (:...ids)', { ids: accountIds })
        .execute();
      await em.getRepository(Account)
        .createQueryBuilder()
        .delete()
        .where('id IN (:...ids)', { ids: accountIds })
        .execute();
    });

    this.logger.log(
      `User ${userId} disconnected ${institutionName} (${accounts.length} account(s) removed)`,
    );

    // TODO: when Plaid is fully wired, also call plaid.itemRemove(access_token)
    // for each unique plaidItemId in `accounts` so the token is revoked upstream.

    return { accountsRemoved: accounts.length };
  }

  /**
   * Plaid sync: exchange public_token for access_token, persist accounts +
   * transactions. Mirrors syncFromLoginId on the Flinks side; the two paths
   * unify in step 5 via the BankProviderRouter (current code already routes
   * the connection through the router, so step 5 is mostly removing the
   * Flinks-specific branches in this file).
   */
  async syncFromPlaidPublicToken(
    userId: string,
    publicToken: string,
  ): Promise<Account[]> {
    const provider = this.bankProviderRouter.forProvider('plaid');

    // 1. Exchange public_token → access_token + item_id
    const { accessRef: accessToken, externalId: itemId } =
      await provider.finalizeConnection({ provider: 'plaid', publicToken });

    // 2. Fetch normalized accounts
    const normalized = await provider.fetchAccounts(accessToken);

    // 3. Upsert each account row, persisting access_token (encrypted) +
    // item_id so future syncs can reuse them without re-linking.
    const saved = await Promise.all(
      normalized.map((na) =>
        this.upsertPlaidAccount(userId, na, accessToken, itemId),
      ),
    );

    // 4. Pull initial transactions and persist (no cursor on first run).
    const { transactions, nextCursor } = await provider.fetchTransactions(
      accessToken,
    );
    await this.upsertPlaidTransactions(saved, transactions, nextCursor);

    return saved;
  }

  /**
   * Webhook dispatcher. Plaid pushes here when an item's transactions update,
   * an item errors, or a user revokes permission. JWT verification has already
   * happened in PlaidWebhookController before this is called.
   */
  async handlePlaidWebhook(payload: any): Promise<void> {
    const type = payload?.webhook_type;
    const code = payload?.webhook_code;
    const itemId = payload?.item_id;

    this.logger.log(`Plaid webhook: ${type}:${code} for item ${itemId}`);
    if (!itemId) return;

    switch (`${type}:${code}`) {
      case 'TRANSACTIONS:DEFAULT_UPDATE':
      case 'TRANSACTIONS:HISTORICAL_UPDATE':
      case 'TRANSACTIONS:SYNC_UPDATES_AVAILABLE':
        await this.refreshTransactionsForItem(itemId);
        return;

      case 'ITEM:ERROR':
        this.logger.warn(
          `Plaid item error for ${itemId}: ${JSON.stringify(payload.error)}`,
        );
        // TODO: surface a "reconnect bank" prompt to the user (push + UI).
        return;

      case 'ITEM:USER_PERMISSION_REVOKED':
      case 'ITEM:PENDING_DISCONNECT':
        this.logger.warn(`Plaid access revoked for item ${itemId}`);
        // TODO: soft-delete affected accounts.
        return;

      default:
        // Many webhook types we don't handle yet — log at debug and ignore.
        this.logger.debug(`Unhandled Plaid webhook: ${type}:${code}`);
    }
  }

  /**
   * Webhook-driven re-sync. Fetches transactions for the Plaid item using
   * its persisted access_token + cursor, persists new ones, and updates the
   * cursor. Idempotent — duplicate transactionsSync calls return the same
   * deltas (cursor advances atomically when we save).
   */
  async refreshTransactionsForItem(itemId: string): Promise<void> {
    const accounts = await this.accountRepo.find({
      where: { plaidItemId: itemId, provider: 'plaid' },
    });
    if (accounts.length === 0) {
      this.logger.warn(`refreshTransactionsForItem: no accounts for item ${itemId}`);
      return;
    }

    const accessToken = accounts[0].plaidAccessToken;
    if (!accessToken) {
      this.logger.warn(`refreshTransactionsForItem: no access token for item ${itemId}`);
      return;
    }

    const provider = this.bankProviderRouter.forProvider('plaid');
    const { transactions, nextCursor } = await provider.fetchTransactions(
      accessToken,
      { cursor: accounts[0].plaidTxCursor ?? undefined },
    );

    await this.upsertPlaidTransactions(accounts, transactions, nextCursor);

    this.logger.log(
      `refreshTransactionsForItem ${itemId}: ${transactions.length} new/modified transactions`,
    );
  }

  /**
   * Shared transaction-persistence helper used by both initial sync and
   * webhook re-sync. Dedups by plaidTransactionId; advances the cursor on
   * every account that belongs to this Plaid item.
   */
  private async upsertPlaidTransactions(
    accounts: Account[],
    transactions: Array<{
      externalTransactionId: string;
      externalAccountId: string;
      description: string;
      merchantName: string | null;
      amount: number;
      isDebit: boolean;
      currency: string | null;
      date: string;
      pending: boolean;
      providerPrimaryCategory?: string | null;
    }>,
    nextCursor?: string,
  ): Promise<void> {
    const accountByExternalId = new Map(
      accounts.map((a) => [a.plaidAccountId, a] as const),
    );

    for (const t of transactions) {
      const acct = accountByExternalId.get(t.externalAccountId);
      if (!acct) continue;
      const existing = await this.accountRepo.manager
        .getRepository('transactions')
        .findOne({ where: { plaidTransactionId: t.externalTransactionId } });
      if (existing) continue;
      await this.transactionsService.createTransaction({
        accountId: acct.id,
        plaidTransactionId: t.externalTransactionId,
        description: t.description,
        merchantName: t.merchantName ?? undefined,
        amount: t.amount,
        isDebit: t.isDebit,
        date: new Date(t.date),
        currency: t.currency ?? 'CAD',
        plaidPrimaryCategory: t.providerPrimaryCategory ?? null,
        pending: t.pending,
      });
    }

    if (nextCursor) {
      await Promise.all(
        accounts.map((a) => {
          a.plaidTxCursor = nextCursor;
          return this.accountRepo.save(a);
        }),
      );
    }
  }

  private async upsertPlaidAccount(
    userId: string,
    na: NormalizedAccount,
    accessToken: string,
    itemId: string,
  ): Promise<Account> {
    let account = await this.accountRepo.findOne({
      where: { plaidAccountId: na.externalAccountId },
    });

    if (!account) {
      account = this.accountRepo.create({
        userId,
        provider: 'plaid',
        plaidAccountId: na.externalAccountId,
      });
    }

    account.provider = 'plaid';
    account.plaidAccountId = na.externalAccountId;
    account.plaidItemId = itemId;
    account.plaidAccessToken = accessToken;
    account.institutionName = na.institutionName || 'Bank';
    account.accountName = na.accountName;
    account.balance = na.balance.current ?? na.balance.available ?? 0;
    account.currency = na.balance.currency ?? 'CAD';
    account.accountType = this.normalizedTypeToEnum(na.accountType);
    account.lastSyncedAt = new Date();

    return this.accountRepo.save(account);
  }

  private normalizedTypeToEnum(t: string): AccountType {
    switch (t) {
      case 'savings': return AccountType.SAVINGS;
      case 'credit': return AccountType.CREDIT;
      case 'investment': return AccountType.INVESTMENT;
      default: return AccountType.CHECKING;
    }
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

  async generatePlanPreview(userId: string, goal: string): Promise<{
    bankName: string | null;
    savings: { label: string; amount: string; icon: string }[];
    guardrail: { category: string; pct: number; note: string };
    years: string;
    probability: string;
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const [accounts, spendingByCategory, trend] = await Promise.all([
      this.accountRepo.find({ where: { userId } }),
      this.transactionsService.getCategorySpending(userId, thirtyDaysAgo, now),
      this.getSpendingTrend(userId),
    ]);

    // Liquid assets: checking + savings with positive balances only
    const liquidBalance = accounts
      .filter(a => [AccountType.CHECKING, AccountType.SAVINGS].includes(a.accountType))
      .reduce((sum, a) => sum + Math.max(0, Number(a.balance)), 0);

    // Primary bank name from first non-credit account
    const primaryAccount = accounts.find(a => a.accountType !== AccountType.CREDIT);
    const bankName = primaryAccount?.institutionName ?? null;

    // Monthly savings capacity: estimate income from spending, target 25% savings rate
    // If no transaction data, fall back to a sensible Canadian default
    const monthlySpend = trend.currentMonth || 0;
    const estimatedIncome = monthlySpend > 0 ? monthlySpend / 0.70 : 0;
    const rawCapacity = estimatedIncome > 0 ? estimatedIncome * 0.25 : 1200;
    const monthlyCapacity = Math.max(rawCapacity, 300);

    // Top discretionary spending category for the guardrail
    const DISCRETIONARY = ['food', 'entertainment', 'shopping', 'travel'];
    const CATEGORY_LABELS: Record<string, string> = {
      food: 'Dining & Food', entertainment: 'Entertainment',
      shopping: 'Shopping', travel: 'Travel', bills: 'Bills & Utilities',
    };
    const topDiscretionary = spendingByCategory.find(c => DISCRETIONARY.includes(c.category));
    const guardrailCategory = topDiscretionary
      ? (CATEGORY_LABELS[topDiscretionary.category] ?? topDiscretionary.category)
      : 'Dining & Entertainment';

    // Goal-specific allocations and targets (CAD)
    const GOAL_CONFIGS: Record<string, {
      alloc: [number, string, string][];
      guardPct: number;
      guardNote: string;
      targetAmount: number;
    }> = {
      save_for_house:  {
        alloc: [[0.65, 'DOWN PAYMENT FUND', 'home-outline'], [0.35, 'EMERGENCY FUND', 'shield-outline']],
        guardPct: 12, guardNote: 'Suggested reduction based on peers with similar savings goals.',
        targetAmount: 100_000,
      },
      retire_early: {
        alloc: [[0.70, 'INDEX FUNDS', 'trending-up-outline'], [0.30, 'EMERGENCY FUND', 'shield-outline']],
        guardPct: 15, guardNote: 'Suggested reduction based on peers with similar growth targets.',
        targetAmount: 1_200_000,
      },
      optimize_taxes: {
        alloc: [[0.60, 'RRSP CONTRIBUTION', 'trending-up-outline'], [0.40, 'TFSA ALLOCATION', 'shield-outline']],
        guardPct: 20, guardNote: 'Optimizing recurring expenses improves your taxable income position.',
        targetAmount: 70_000,
      },
      emergency_fund: {
        alloc: [[0.75, 'EMERGENCY FUND', 'shield-outline'], [0.25, 'SAVINGS BUFFER', 'wallet-outline']],
        guardPct: 18, guardNote: 'Cutting recurring expenses accelerates your safety net.',
        targetAmount: 18_000,
      },
      custom: {
        alloc: [[0.65, 'PRIMARY ALLOCATION', 'trending-up-outline'], [0.35, 'EMERGENCY FUND', 'shield-outline']],
        guardPct: 10, guardNote: 'Suggested reduction to accelerate your custom goal timeline.',
        targetAmount: 50_000,
      },
    };

    const config = GOAL_CONFIGS[goal] ?? GOAL_CONFIGS.retire_early;

    // Round to nearest $50 for clean display
    const roundNice = (n: number) => Math.max(50, Math.round(n / 50) * 50);
    const fmt = (n: number) => `$${n.toLocaleString('en-CA')}/mo`;

    const savings = config.alloc.map(([pct, label, icon]) => ({
      label, icon, amount: fmt(roundNice(monthlyCapacity * pct)),
    }));

    // Years to goal
    const remaining = Math.max(0, config.targetAmount - liquidBalance);
    const annualSavings = monthlyCapacity * 12;
    const rawYears = annualSavings > 0 ? remaining / annualSavings : 99;
    const years = Math.min(rawYears, 40).toFixed(1);

    const probability = rawYears < 15 ? 'HIGH PROBABILITY'
      : rawYears < 25 ? 'MODERATE PROBABILITY'
      : 'ON TRACK';

    return {
      bankName,
      savings,
      guardrail: { category: guardrailCategory, pct: config.guardPct, note: config.guardNote },
      years,
      probability,
    };
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
  async getDashboardSnapshot(userId: string): Promise<{
    totalCashAvailable: number;
    spendingTrend: {
      currentMonth: number;
      previousMonth: number;
      percentageChange: number;
      direction: 'up' | 'down' | 'stable';
    };
    status: 'on-track' | 'overspending' | 'underspending';
    accounts: Account[];
    spendingByCategory: { category: string; total: number; count: number }[];
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [totalCashAvailable, spendingTrend, status, accounts, spendingByCategory] =
      await Promise.all([
        this.getTotalCashAvailable(userId),
        this.getSpendingTrend(userId),
        this.getFinancialStatus(userId),
        this.accountRepo.find({ where: { userId } }),
        this.transactionsService.getCategorySpending(userId, monthStart, monthEnd),
      ]);

    return {
      totalCashAvailable,
      spendingTrend,
      status,
      accounts,
      spendingByCategory,
    };
  }
}

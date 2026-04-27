import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Transaction, TransactionCategory } from '../../entities/transaction.entity';
import { Account } from '../../entities/account.entity';
import { FlinksService } from '../flinks/flinks.service';

interface CategoryPatterns {
  [key: string]: string[];
}

@Injectable()
export class TransactionsService {
  private readonly categoryPatterns: CategoryPatterns = {
    [TransactionCategory.FOOD]: [
      'restaurant',
      'cafe',
      'coffee',
      'pizza',
      'burger',
      'sushi',
      'grocery',
      'safeway',
      'costco',
      'whole foods',
      'trader joe',
      'loblaws',
      'metro',
      'walmart',
      'food',
      'doordash',
      'uber eats',
      'skip',
      'grubhub',
      'dine',
      'grill',
      'bistro',
      'bakery',
      'deli',
      'market',
    ],
    [TransactionCategory.TRANSPORT]: [
      'uber',
      'lyft',
      'taxi',
      'transit',
      'bus',
      'train',
      'railway',
      'gas',
      'fuel',
      'esso',
      'shell',
      'petro',
      'chevron',
      'parking',
      'car wash',
      'mechanic',
      'auto',
      'insurance',
      'metro transit',
    ],
    [TransactionCategory.ENTERTAINMENT]: [
      'cinema',
      'movie',
      'theatre',
      'concert',
      'spotify',
      'netflix',
      'disney',
      'hulu',
      'gaming',
      'steam',
      'playstation',
      'xbox',
      'bar',
      'pub',
      'club',
      'sports',
      'gym',
      'fitness',
      'entertainment',
    ],
    [TransactionCategory.SHOPPING]: [
      'amazon',
      'mall',
      'shop',
      'retail',
      'boutique',
      'clothing',
      'apparel',
      'fashion',
      'shoes',
      'h&m',
      'zara',
      'target',
      'old navy',
      'best buy',
      'electronics',
    ],
    [TransactionCategory.BILLS]: [
      'hydro',
      'bell',
      'rogers',
      'shaw',
      'internet',
      'phone',
      'electric',
      'water',
      'gas',
      'utility',
      'insurance',
      'phone bill',
      'cable',
    ],
    [TransactionCategory.HEALTH]: [
      'pharmacy',
      'doctor',
      'hospital',
      'clinic',
      'medical',
      'dental',
      'dentist',
      'health',
      'cvs',
      'walgreens',
      'rexall',
      'gym',
      'wellness',
      'yoga',
    ],
    [TransactionCategory.TRAVEL]: [
      'hotel',
      'airbnb',
      'booking',
      'flight',
      'airline',
      'air canada',
      'westjet',
      'united',
      'delta',
      'resort',
      'motel',
      'vacation',
      'travel',
    ],
    [TransactionCategory.INCOME]: [
      'salary',
      'payroll',
      'deposit',
      'transfer in',
      'payment received',
      'income',
      'refund',
      'credit',
    ],
  };

  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly flinks: FlinksService,
  ) {}

  async syncFromFlinks(requestId: string, accounts: Account[]): Promise<void> {
    const { Accounts: flinksAccounts } = await this.flinks.getTransactions(requestId);

    for (const fa of flinksAccounts) {
      const account = accounts.find((a) => a.flinksAccountId === fa.Id);
      if (!account) continue;

      for (const ft of fa.Transactions) {
        const exists = await this.transactionRepository.findOne({
          where: { flinksTransactionId: ft.Id },
        });
        if (exists) continue;

        const isDebit = (ft.Debit ?? 0) > 0;
        const amount = isDebit ? (ft.Debit ?? 0) : (ft.Credit ?? 0);

        await this.createTransaction({
          accountId: account.id,
          flinksTransactionId: ft.Id,
          description: ft.Description,
          amount,
          isDebit,
          date: new Date(ft.Date),
          currency: ft.Currency ?? 'CAD',
        });
      }
    }

    this.logger.log(`Synced transactions for requestId ${requestId}`);
  }

  /**
   * Categorize a transaction based on its description and merchant name
   */
  private categorizeTransaction(
    description: string,
    merchantName?: string,
    isDebit?: boolean,
  ): TransactionCategory {
    const searchText = `${description} ${merchantName || ''}`.toLowerCase();

    // Income transactions (credit deposits)
    if (!isDebit && description.toLowerCase().includes('deposit')) {
      return TransactionCategory.INCOME;
    }

    // Check each category's patterns
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      if (patterns.some((pattern) => searchText.includes(pattern.toLowerCase()))) {
        return category as TransactionCategory;
      }
    }

    return TransactionCategory.OTHER;
  }

  /**
   * Create a new transaction with auto-categorization
   */
  async createTransaction(data: {
    accountId: string;
    description: string;
    amount: number;
    isDebit: boolean;
    date: Date;
    merchantName?: string;
    flinksTransactionId?: string;
    currency?: string;
  }): Promise<Transaction> {
    const category = this.categorizeTransaction(
      data.description,
      data.merchantName,
      data.isDebit,
    );

    const transaction = this.transactionRepository.create({
      ...data,
      category,
    });

    return this.transactionRepository.save(transaction);
  }

  /**
   * Get all transactions for an account with optional filtering
   */
  async getTransactions(
    accountId: string,
    filters?: {
      category?: TransactionCategory;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.accountId = :accountId', { accountId });

    if (filters?.category) {
      query.andWhere('transaction.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate && filters.endDate) {
        query.andWhere('transaction.date BETWEEN :startDate AND :endDate', {
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      } else if (filters.startDate) {
        query.andWhere('transaction.date >= :startDate', {
          startDate: filters.startDate,
        });
      } else if (filters.endDate) {
        query.andWhere('transaction.date <= :endDate', {
          endDate: filters.endDate,
        });
      }
    }

    const total = await query.getCount();

    const transactions = await query
      .orderBy('transaction.date', 'DESC')
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0)
      .getMany();

    return { transactions, total };
  }

  /**
   * Get transactions for a specific user across all accounts
   */
  async getUserTransactions(
    userId: string,
    filters?: {
      search?: string;
      category?: TransactionCategory;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.account', 'account')
      .where('account.userId = :userId', { userId });

    if (filters?.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      query.andWhere(
        '(LOWER(transaction.description) LIKE :term OR LOWER(transaction.merchantName) LIKE :term)',
        { term },
      );
    }

    if (filters?.category) {
      query.andWhere('transaction.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate && filters.endDate) {
        query.andWhere('transaction.date BETWEEN :startDate AND :endDate', {
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      } else if (filters.startDate) {
        query.andWhere('transaction.date >= :startDate', {
          startDate: filters.startDate,
        });
      } else if (filters.endDate) {
        query.andWhere('transaction.date <= :endDate', {
          endDate: filters.endDate,
        });
      }
    }

    const total = await query.getCount();

    const transactions = await query
      .orderBy('transaction.date', 'DESC')
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0)
      .getMany();

    return { transactions, total };
  }

  /**
   * Get transaction summary by category for a date range
   */
  async getCategorySpending(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ category: TransactionCategory; total: number; count: number }[]> {
    const results = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.category', 'category')
      .addSelect('SUM(transaction.amount)', 'total')
      .addSelect('COUNT(transaction.id)', 'count')
      .leftJoin('transaction.account', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.isDebit = :isDebit', { isDebit: true })
      .groupBy('transaction.category')
      .orderBy('total', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      category: r.category,
      total: parseFloat(r.total) || 0,
      count: parseInt(r.count, 10) || 0,
    }));
  }

  /**
   * Recategorize a specific transaction
   */
  async updateTransactionCategory(
    transactionId: string,
    category: TransactionCategory,
  ): Promise<Transaction> {
    await this.transactionRepository.update(transactionId, { category });
    return this.transactionRepository.findOneOrFail({ where: { id: transactionId } });
  }
}

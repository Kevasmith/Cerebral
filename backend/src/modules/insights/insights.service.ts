import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insight } from '../../entities/insight.entity';
import { InsightEngineService } from './insight-engine.service';
import { AiService } from '../ai/ai.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { TransactionCategory } from '../../entities/transaction.entity';
import { UserGoal } from '../../entities/preference.entity';

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Insight)
    private readonly insightRepo: Repository<Insight>,
    private readonly engine: InsightEngineService,
    private readonly ai: AiService,
    private readonly transactions: TransactionsService,
    private readonly users: UsersService,
  ) {}

  // Run the engine then return all active insights for this user
  async refreshAndGetInsights(userId: string): Promise<Insight[]> {
    await this.engine.runForUser(userId);
    return this.getActiveInsights(userId);
  }

  async getActiveInsights(userId: string): Promise<Insight[]> {
    return this.insightRepo
      .createQueryBuilder('insight')
      .where('insight.userId = :userId', { userId })
      .andWhere('(insight.expiresAt IS NULL OR insight.expiresAt > NOW())')
      .orderBy('insight.createdAt', 'DESC')
      .getMany();
  }

  async markRead(insightId: string, userId: string): Promise<void> {
    await this.insightRepo.update(
      { id: insightId, userId },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.insightRepo.count({
      where: { userId, isRead: false },
    });
  }

  async getWeeklySummary(userId: string) {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);
    const lastWeekEnd = new Date(thisWeekStart);

    const [thisWeek, lastWeek] = await Promise.all([
      this.transactions.getCategorySpending(userId, thisWeekStart, now),
      this.transactions.getCategorySpending(userId, lastWeekStart, lastWeekEnd),
    ]);

    const exclude = [TransactionCategory.INCOME, TransactionCategory.TRANSFER];
    const thisWeekSpend = thisWeek.filter((r) => !exclude.includes(r.category as TransactionCategory));
    const lastWeekSpend = lastWeek.filter((r) => !exclude.includes(r.category as TransactionCategory));

    const thisWeekTotal = thisWeekSpend.reduce((s, r) => s + r.total, 0);
    const lastWeekTotal = lastWeekSpend.reduce((s, r) => s + r.total, 0);
    const incomeThisWeek = thisWeek.find((r) => r.category === TransactionCategory.INCOME)?.total ?? 0;

    const topCategory = thisWeekSpend.length
      ? thisWeekSpend.sort((a, b) => b.total - a.total)[0].category
      : 'other';

    const prefs = await this.users.getPreferences(userId).catch(() => null);

    const aiSummary = await this.ai.generateWeeklySummary({
      userGoal: (prefs?.goal as UserGoal) ?? UserGoal.SAVE_MORE,
      location: prefs?.location ?? 'Edmonton, AB, Canada',
      thisWeekTotal,
      lastWeekTotal,
      topCategory,
      categories: thisWeekSpend.map((r) => ({ category: r.category, total: r.total })),
      incomeThisWeek,
    });

    return {
      ...aiSummary,
      weekOf: thisWeekStart.toISOString().split('T')[0],
      thisWeekTotal,
      lastWeekTotal,
      topCategory,
    };
  }
}

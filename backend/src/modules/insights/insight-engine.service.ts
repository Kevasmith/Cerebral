import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insight, InsightType } from '../../entities/insight.entity';
import { User } from '../../entities/user.entity';
import { Preference, UserGoal, UserInterest } from '../../entities/preference.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { AccountsService } from '../accounts/accounts.service';
import { AiService } from '../ai/ai.service';
import { TransactionCategory } from '../../entities/transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';

const IDLE_CASH_THRESHOLD = 1000;
const OVERSPEND_PERCENT_THRESHOLD = 10;
const CATEGORY_OVERSPEND_THRESHOLD = 15;
const CATEGORY_CREEP_POINT_THRESHOLD = 5;       // percentage points of total spend
const LIFESTYLE_INFLATION_PERCENT_THRESHOLD = 20;

// Discretionary categories used for lifestyle-inflation detection. Mirrors the
// "discretionary" framing in the behavioural-pattern-recognition skill.
const DISCRETIONARY_CATEGORIES = [
  TransactionCategory.FOOD,
  TransactionCategory.ENTERTAINMENT,
  TransactionCategory.SHOPPING,
  TransactionCategory.TRAVEL,
];

// Categories excluded from category-creep detection (not user-controlled).
const NON_DISCRETIONARY_CATEGORIES = new Set<string>([
  TransactionCategory.INCOME,
  TransactionCategory.TRANSFER,
  TransactionCategory.BILLS,
  TransactionCategory.LOANS,
  TransactionCategory.FEES,
  TransactionCategory.GOVERNMENT,
]);

interface RuleTrigger {
  type: InsightType;
  aiType: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

@Injectable()
export class InsightEngineService {
  private readonly logger = new Logger(InsightEngineService.name);

  constructor(
    @InjectRepository(Insight)
    private readonly insightRepo: Repository<Insight>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Preference)
    private readonly preferenceRepo: Repository<Preference>,
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
    private readonly ai: AiService,
    private readonly notifications: NotificationsService,
  ) {}

  async runForUser(userId: string): Promise<Insight[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return [];

    const preference = await this.preferenceRepo.findOne({ where: { userId } });
    const userGoal = preference?.goal ?? UserGoal.SAVE_MORE;
    const userInterests = preference?.interests ?? [];

    const triggers = await this.evaluateRules(userId);
    const newInsights: Insight[] = [];

    for (const trigger of triggers) {
      const alreadyExists = await this.recentInsightExists(userId, trigger.type, trigger.metadata);
      if (alreadyExists) continue;

      const { title, body } = await this.ai.generateInsightCard({
        type: trigger.aiType,
        data: trigger.data,
        userGoal,
        userInterests: userInterests as UserInterest[],
        userName: user.displayName ?? undefined,
      });

      const insight = this.insightRepo.create({
        userId,
        type: trigger.type,
        title,
        body,
        metadata: trigger.metadata,
        expiresAt: this.expiresIn(7),
      });

      newInsights.push(await this.insightRepo.save(insight));
    }

    this.logger.log(`Generated ${newInsights.length} new insights for user ${userId}`);

    // Respect the user's notification preference. `notificationsEnabled`
    // defaults to true on the entity, so an absent preference row counts as
    // opted-in (matches the onboarding default). Only suppress when the user
    // explicitly disabled notifications in Settings.
    const notificationsAllowed = preference?.notificationsEnabled !== false;

    if (newInsights.length > 0 && user.expoPushToken && notificationsAllowed) {
      const title = newInsights.length === 1
        ? newInsights[0].title
        : `${newInsights.length} new insights`;
      const body = newInsights.length === 1
        ? newInsights[0].body.slice(0, 100)
        : 'Tap to see your latest financial insights.';
      await this.notifications.send(user.expoPushToken, title, body);
    }

    return newInsights;
  }

  private async evaluateRules(userId: string): Promise<RuleTrigger[]> {
    const triggers: RuleTrigger[] = [];
    const now = new Date();

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentSpend, previousSpend] = await Promise.all([
      this.transactionsService.getCategorySpending(userId, currentMonthStart, currentMonthEnd),
      this.transactionsService.getCategorySpending(userId, prevMonthStart, prevMonthEnd),
    ]);

    // Rule 1: Overall monthly overspend
    const currentTotal = currentSpend.reduce((s, r) => s + r.total, 0);
    const previousTotal = previousSpend.reduce((s, r) => s + r.total, 0);
    if (previousTotal > 0) {
      const pct = ((currentTotal - previousTotal) / previousTotal) * 100;
      if (pct >= OVERSPEND_PERCENT_THRESHOLD) {
        triggers.push({
          type: InsightType.OVERSPENDING,
          aiType: 'monthly_overspend',
          data: { current: currentTotal.toFixed(2), previous: previousTotal.toFixed(2), percentChange: pct.toFixed(1) },
          metadata: { rule: 'monthly_overspend', month: now.getMonth() },
        });
      }
    }

    // Rule 2: Category-level overspend (food, entertainment, shopping)
    const watchedCategories = [
      TransactionCategory.FOOD,
      TransactionCategory.ENTERTAINMENT,
      TransactionCategory.SHOPPING,
    ];
    for (const cat of watchedCategories) {
      const curr = currentSpend.find((r) => r.category === cat)?.total ?? 0;
      const prev = previousSpend.find((r) => r.category === cat)?.total ?? 0;
      if (prev > 0) {
        const pct = ((curr - prev) / prev) * 100;
        if (pct >= CATEGORY_OVERSPEND_THRESHOLD) {
          triggers.push({
            type: InsightType.OVERSPENDING,
            aiType: 'overspending',
            data: { category: cat, current: curr.toFixed(2), previous: prev.toFixed(2), percentChange: pct.toFixed(1) },
            metadata: { rule: 'category_overspend', category: cat, month: now.getMonth() },
          });
        }
      }
    }

    // Rule 3: Idle cash
    const dashboard = await this.accountsService.getDashboardSnapshot(userId);
    if (dashboard.totalCashAvailable >= IDLE_CASH_THRESHOLD) {
      triggers.push({
        type: InsightType.IDLE_CASH,
        aiType: 'idle_cash',
        data: { idleAmount: dashboard.totalCashAvailable.toFixed(2) },
        metadata: { rule: 'idle_cash', amount: dashboard.totalCashAvailable },
      });
    }

    // Rule 4: Positive — spending down meaningfully vs last month
    if (previousTotal > 0 && currentTotal > 0) {
      const pct = ((currentTotal - previousTotal) / previousTotal) * 100;
      if (pct <= -10) {
        triggers.push({
          type: InsightType.SAVINGS_TIP,
          aiType: 'savings_opportunity',
          data: { category: 'overall', amount: Math.abs(currentTotal - previousTotal).toFixed(2) },
          metadata: { rule: 'spending_down', month: now.getMonth() },
        });
      }
    }

    // Rule 5: Subscription detection — entertainment/bills appearing in both months
    const recurringCategories = [TransactionCategory.ENTERTAINMENT, TransactionCategory.BILLS];
    const subscriptionSpend = recurringCategories
      .map((cat) => ({
        category: cat,
        current: currentSpend.find((r) => r.category === cat)?.total ?? 0,
        previous: previousSpend.find((r) => r.category === cat)?.total ?? 0,
      }))
      .filter((s) => s.current > 0 && s.previous > 0);

    if (subscriptionSpend.length > 0) {
      const totalMonthly = subscriptionSpend.reduce((sum, s) => sum + s.current, 0);
      triggers.push({
        type: InsightType.SAVINGS_TIP,
        aiType: 'savings_opportunity',
        data: {
          category: 'subscriptions',
          amount: totalMonthly.toFixed(2),
          subscriptions: subscriptionSpend.map((s) => s.category).join(', '),
        },
        metadata: { rule: 'subscription_detected', month: now.getMonth() },
      });
    }

    // Rule 6.5: Category creep — a single category's *share* of total spend
    // grew by 5+ percentage points vs last month. Different from overspend:
    // composition shift, not amount. Skip non-discretionary categories.
    if (currentTotal > 0 && previousTotal > 0) {
      for (const row of currentSpend) {
        if (NON_DISCRETIONARY_CATEGORIES.has(row.category)) continue;
        const currShare = (row.total / currentTotal) * 100;
        const prevRow = previousSpend.find((r) => r.category === row.category);
        const prevShare = prevRow ? (prevRow.total / previousTotal) * 100 : 0;
        const pointDelta = currShare - prevShare;
        if (pointDelta >= CATEGORY_CREEP_POINT_THRESHOLD) {
          triggers.push({
            type: InsightType.OVERSPENDING,
            aiType: 'category_creep',
            data: {
              category: row.category,
              currentShare: currShare.toFixed(1),
              previousShare: prevShare.toFixed(1),
              pointDelta: pointDelta.toFixed(1),
              currentAmount: row.total.toFixed(2),
            },
            metadata: { rule: 'category_creep', category: row.category, month: now.getMonth() },
          });
          break; // surface at most one creep insight per run
        }
      }
    }

    // Rule 6.75: Lifestyle inflation — discretionary spend baseline rose 20%+
    // vs prior month. Catches "spending creep" across all discretionary buckets,
    // not just one category.
    const currDiscretionary = DISCRETIONARY_CATEGORIES.reduce(
      (s, cat) => s + (currentSpend.find((r) => r.category === cat)?.total ?? 0),
      0,
    );
    const prevDiscretionary = DISCRETIONARY_CATEGORIES.reduce(
      (s, cat) => s + (previousSpend.find((r) => r.category === cat)?.total ?? 0),
      0,
    );
    if (prevDiscretionary >= 100 && currDiscretionary > prevDiscretionary) {
      const pct = ((currDiscretionary - prevDiscretionary) / prevDiscretionary) * 100;
      if (pct >= LIFESTYLE_INFLATION_PERCENT_THRESHOLD) {
        triggers.push({
          type: InsightType.OVERSPENDING,
          aiType: 'lifestyle_inflation',
          data: {
            current: currDiscretionary.toFixed(2),
            previous: prevDiscretionary.toFixed(2),
            percentChange: pct.toFixed(1),
            delta: (currDiscretionary - prevDiscretionary).toFixed(2),
          },
          metadata: { rule: 'lifestyle_inflation', month: now.getMonth() },
        });
      }
    }

    // Rule 7: Income trend
    const incomeCurrentMonth = currentSpend.find((r) => r.category === TransactionCategory.INCOME)?.total ?? 0;
    const incomePrevMonth = previousSpend.find((r) => r.category === TransactionCategory.INCOME)?.total ?? 0;
    if (incomePrevMonth > 0 && incomeCurrentMonth > 0) {
      const delta = incomeCurrentMonth - incomePrevMonth;
      const pct = (delta / incomePrevMonth) * 100;
      if (Math.abs(pct) >= 10) {
        triggers.push({
          type: InsightType.INCOME_TREND,
          aiType: 'income_trend',
          data: {
            direction: delta > 0 ? 'up' : 'down',
            delta: Math.abs(delta).toFixed(2),
            percentChange: Math.abs(pct).toFixed(1),
          },
          metadata: { rule: 'income_trend', month: now.getMonth() },
        });
      }
    }

    return triggers;
  }

  // Prevent duplicate insights for the same rule within 30 days
  private async recentInsightExists(
    userId: string,
    type: InsightType,
    metadata: Record<string, any>,
  ): Promise<boolean> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existing = await this.insightRepo
      .createQueryBuilder('insight')
      .where('insight.userId = :userId', { userId })
      .andWhere('insight.type = :type', { type })
      .andWhere('insight.createdAt >= :since', { since: thirtyDaysAgo })
      .andWhere("insight.metadata->>'rule' = :rule", { rule: metadata.rule })
      .andWhere("COALESCE(insight.metadata->>'month', '') = :month", {
        month: String(metadata.month ?? ''),
      })
      .getOne();

    return !!existing;
  }

  private expiresIn(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }
}

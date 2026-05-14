import { Injectable, Logger } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { UserGoal } from '../../entities/preference.entity';

export interface CashFlowForecast {
  // Lowest projected balance over the forecast horizon
  projectedLow: number;
  // Approximate date (YYYY-MM-DD) the low is expected
  projectedLowDate: string;
  // Daily spend rate used in the projection
  dailySpendRate: number;
  // Days included in the projection
  horizonDays: number;
  // 0..1 — model confidence
  confidence: number;
}

export interface GoalForecast {
  // Plain label for the goal target (e.g. "Down Payment Fund")
  goalLabel: string;
  // Dollar target derived from the goal plan
  target: number;
  // Current liquid + investment progress toward target
  current: number;
  // Detected monthly contribution rate (income - spend over recent months)
  monthlyRate: number;
  // Months until target hit at current pace (null if stalled or already hit)
  monthsToTarget: number | null;
  // Status copy ready for UI ("On track", "Stalled", etc.)
  status: 'on_track' | 'stalled' | 'achieved';
  // 0..1
  confidence: number;
}

export interface ForecastBundle {
  cashFlow: CashFlowForecast | null;
  goal: GoalForecast | null;
}

// Target amounts per goal — mirror of opportunities.service GOAL_PLANS targets.
// (Could share a constant later, but Phase 1 keeps the modules independent.)
const GOAL_TARGETS: Record<string, { label: string; amount: number }> = {
  save_for_house: { label: 'Down Payment Fund',    amount: 100_000 },
  retire_early:   { label: 'Retirement Portfolio', amount: 1_200_000 },
  optimize_taxes: { label: 'RRSP + TFSA',          amount: 70_000 },
  emergency_fund: { label: 'Emergency Fund',       amount: 18_000 },
  custom:         { label: 'Your Goal',            amount: 50_000 },
};

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(private readonly accountsService: AccountsService) {}

  async getBundle(userId: string, goal?: UserGoal): Promise<ForecastBundle> {
    const [cashFlow, goalForecast] = await Promise.all([
      this.cashFlowForecast(userId).catch((err) => {
        this.logger.warn(`Cash flow forecast failed: ${err?.message ?? err}`);
        return null;
      }),
      this.goalForecast(userId, goal).catch((err) => {
        this.logger.warn(`Goal forecast failed: ${err?.message ?? err}`);
        return null;
      }),
    ]);

    return { cashFlow, goal: goalForecast };
  }

  // Project end-of-month balance using the user's daily spend rate so far this
  // month. Keep the model simple: linear extrapolation of MTD spend over the
  // remaining days, applied to current liquid cash.
  private async cashFlowForecast(userId: string): Promise<CashFlowForecast | null> {
    const dashboard = await this.accountsService.getDashboardSnapshot(userId);
    const cash = Number(dashboard?.totalCashAvailable ?? 0);
    const monthSpend = Number(dashboard?.spendingTrend?.currentMonth ?? 0);

    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dayOfMonth = now.getDate();
    const daysInMonth = monthEnd.getDate();
    const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);

    if (monthSpend <= 0 || dayOfMonth < 3) {
      // Not enough data this month — surface a low-confidence "comfortable" view
      return {
        projectedLow: cash,
        projectedLowDate: monthEnd.toISOString().slice(0, 10),
        dailySpendRate: 0,
        horizonDays: daysRemaining,
        confidence: 0.4,
      };
    }

    const dailySpendRate = monthSpend / dayOfMonth;
    const projectedSpendRemaining = dailySpendRate * daysRemaining;
    const projectedLow = Math.max(0, cash - projectedSpendRemaining);

    // Confidence climbs with more days of MTD data
    const dataConfidence = Math.min(0.9, 0.5 + dayOfMonth / 30 * 0.4);

    return {
      projectedLow: Math.round(projectedLow),
      projectedLowDate: monthEnd.toISOString().slice(0, 10),
      dailySpendRate: Math.round(dailySpendRate * 100) / 100,
      horizonDays: daysRemaining,
      confidence: Math.round(dataConfidence * 100) / 100,
    };
  }

  // Translate the user's goal into a months-to-target estimate using their
  // detected savings rate (currentMonth income - currentMonth spend, fallen
  // back to a sane default when transactions are sparse).
  private async goalForecast(userId: string, goal?: UserGoal): Promise<GoalForecast | null> {
    const goalKey = (goal ?? UserGoal.RETIRE_EARLY) as keyof typeof GOAL_TARGETS;
    const target = GOAL_TARGETS[goalKey] ?? GOAL_TARGETS.retire_early;

    const dashboard = await this.accountsService.getDashboardSnapshot(userId);
    const cash = Number(dashboard?.totalCashAvailable ?? 0);

    const trend = dashboard?.spendingTrend;
    // Crude monthly contribution estimate: previous month's spend as a proxy
    // for run-rate, against an assumed 25% savings rate over implied income.
    // (When the insights/income module lands, swap this for measured savings.)
    const monthlySpend = Number(trend?.previousMonth ?? trend?.currentMonth ?? 0);
    const impliedIncome = monthlySpend > 0 ? monthlySpend / 0.70 : 0;
    const monthlyRate = impliedIncome > 0 ? Math.round((impliedIncome - monthlySpend) * 100) / 100 : 0;

    const remaining = Math.max(0, target.amount - cash);

    if (remaining <= 0) {
      return {
        goalLabel: target.label,
        target: target.amount,
        current: cash,
        monthlyRate,
        monthsToTarget: 0,
        status: 'achieved',
        confidence: 0.8,
      };
    }

    if (monthlyRate <= 0) {
      return {
        goalLabel: target.label,
        target: target.amount,
        current: cash,
        monthlyRate: 0,
        monthsToTarget: null,
        status: 'stalled',
        confidence: 0.5,
      };
    }

    return {
      goalLabel: target.label,
      target: target.amount,
      current: cash,
      monthlyRate,
      monthsToTarget: Math.ceil(remaining / monthlyRate),
      status: 'on_track',
      confidence: 0.7,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { TransactionCategory } from '../../entities/transaction.entity';
import { UserGoal, UserInterest } from '../../entities/preference.entity';

// Only block direct execution advice, not educational queries
const EXECUTION_PATTERNS = [
  /\bbuy\s+(this\s+)?stock\b/i,
  /\bpurchase\s+shares?\b/i,
  /\bput\s+\$?\d+\s+(into|in)\b/i,
  /\bshould\s+i\s+buy\s+\w+\s+stock\b/i,
  /\bwhich\s+stock(s)?\s+should\b/i,
  /\bshould\s+i\s+invest\s+in\s+\w+\s+stock\b/i,
];

@Injectable()
export class ChatService {
  constructor(
    private readonly ai: AiService,
    private readonly accountsService: AccountsService,
    private readonly transactionsService: TransactionsService,
    private readonly usersService: UsersService,
  ) {}

  async ask(betterAuthId: string, message: string): Promise<string> {
    if (this.isExecutionAdvice(message)) {
      return "I can't tell you what to buy or sell — that's investment execution advice. But I can explain how different options work, what the risks are, or how to get started. What would you like to learn?";
    }

    const context = await this.buildContext(betterAuthId);
    return this.ai.generateChatResponse(message, context);
  }

  private async buildContext(betterAuthId: string) {
    try {
      const user = await this.usersService.findByBetterAuthId(betterAuthId);
      const prefs = await this.usersService.getPreferences(user.id);
      const dashboard = await this.accountsService.getDashboardSnapshot(user.id);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const spending = await this.transactionsService.getCategorySpending(user.id, monthStart, monthEnd);

      const topCategory = spending.length
        ? spending.sort((a, b) => b.total - a.total)[0].category
        : TransactionCategory.OTHER;

      const monthlySpending = spending
        .filter((s) => s.category !== TransactionCategory.INCOME)
        .reduce((sum, s) => sum + s.total, 0);

      return {
        totalCash: dashboard.totalCashAvailable,
        monthlySpending,
        topCategory,
        userGoal: prefs.goal ?? UserGoal.SAVE_MORE,
        userInterests: (prefs.interests ?? []) as UserInterest[],
      };
    } catch {
      return {
        totalCash: 0,
        monthlySpending: 0,
        topCategory: TransactionCategory.OTHER,
        userGoal: UserGoal.SAVE_MORE,
      };
    }
  }

  private isExecutionAdvice(message: string): boolean {
    return EXECUTION_PATTERNS.some((p) => p.test(message));
  }
}

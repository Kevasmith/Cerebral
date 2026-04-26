import { Controller, Get, UseGuards } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UserInterest, UserGoal } from '../../entities/preference.entity';
import { TransactionCategory } from '../../entities/transaction.entity';

@Controller('opportunities')
@UseGuards(BetterAuthGuard)
export class OpportunitiesController {
  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get()
  async getFeed(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    const prefs = await this.usersService.getPreferences(profile.id);

    const [dashboard, spending] = await Promise.all([
      this.accountsService.getDashboardSnapshot(profile.id).catch(() => null),
      this.transactionsService
        .getCategorySpending(
          profile.id,
          new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          new Date(),
        )
        .catch(() => [] as { category: string; total: number }[]),
    ]);

    const topCategory =
      spending
        .filter((s) => s.category !== TransactionCategory.INCOME)
        .sort((a, b) => b.total - a.total)[0]?.category ?? 'other';

    return this.opportunitiesService.getFeed(
      (prefs.interests ?? []) as UserInterest[],
      prefs.location ?? profile.location ?? undefined,
      {
        userGoal: (prefs.goal as UserGoal) ?? UserGoal.SAVE_MORE,
        availableCash: dashboard?.totalCashAvailable ?? 0,
        topSpendingCategory: topCategory,
      },
    );
  }
}

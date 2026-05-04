import {
  Controller,
  Get,
  Query,
  Param,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { UsersService } from '../users/users.service';
import { Transaction } from '../../entities/transaction.entity';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  TransactionQueryDto,
  SpendingSummaryQueryDto,
  UpdateCategoryDto,
  AccountIdParamDto,
  TransactionIdParamDto,
} from './dto/transaction-query.dto';
import { posthog } from '../../posthog';

@Controller('transactions')
@UseGuards(BetterAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async getUserTransactions(
    @CurrentUser() user: { id: string },
    @Query() query: TransactionQueryDto,
  ) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.transactionsService.getUserTransactions(profile.id, {
      search: query.search,
      category: query.category,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  @Get('account/:accountId')
  async getAccountTransactions(
    @Param() params: AccountIdParamDto,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionsService.getTransactions(params.accountId, {
      category: query.category,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  @Get('spending/summary')
  async getSpendingSummary(
    @CurrentUser() user: { id: string },
    @Query() query: SpendingSummaryQueryDto,
  ) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.transactionsService.getCategorySpending(
      profile.id,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Patch(':id/category')
  async updateTransactionCategory(
    @CurrentUser() user: { id: string },
    @Param() params: TransactionIdParamDto,
    @Body() body: UpdateCategoryDto,
  ): Promise<Transaction> {
    const result = await this.transactionsService.updateTransactionCategory(
      params.id,
      body.category,
    );
    posthog.capture({
      distinctId: user.id,
      event: 'transaction_category_updated',
      properties: { transaction_id: params.id, new_category: body.category },
    });
    return result;
  }
}

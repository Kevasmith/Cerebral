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
import { Transaction, TransactionCategory } from '../../entities/transaction.entity';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('transactions')
@UseGuards(FirebaseAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * GET /transactions
   * Get paginated transactions for the current user with optional filters
   */
  @Get()
  async getUserTransactions(
    @CurrentUser() user: { uid: string },
    @Query('category') category?: TransactionCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    return this.transactionsService.getUserTransactions(user.uid, filters);
  }

  /**
   * GET /transactions/account/:accountId
   * Get transactions for a specific account
   */
  @Get('account/:accountId')
  async getAccountTransactions(
    @Param('accountId') accountId: string,
    @CurrentUser() user: { uid: string },
    @Query('category') category?: TransactionCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    return this.transactionsService.getTransactions(accountId, filters);
  }

  /**
   * GET /transactions/spending/summary
   * Get spending summary by category for a date range
   */
  @Get('spending/summary')
  async getSpendingSummary(
    @CurrentUser() user: { uid: string },
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transactionsService.getCategorySpending(
      user.uid,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * PATCH /transactions/:id/category
   * Update the category of a specific transaction
   */
  @Patch(':id/category')
  async updateTransactionCategory(
    @Param('id') transactionId: string,
    @Body('category') category: TransactionCategory,
  ): Promise<Transaction> {
    return this.transactionsService.updateTransactionCategory(
      transactionId,
      category,
    );
  }
}

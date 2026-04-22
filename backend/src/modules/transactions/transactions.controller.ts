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
import { Transaction, TransactionCategory } from '../../entities/transaction.entity';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('transactions')
@UseGuards(FirebaseAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async getUserTransactions(
    @CurrentUser() user: { uid: string },
    @Query('category') category?: TransactionCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return this.transactionsService.getUserTransactions(profile.id, {
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('account/:accountId')
  async getAccountTransactions(
    @Param('accountId') accountId: string,
    @Query('category') category?: TransactionCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.transactionsService.getTransactions(accountId, {
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('spending/summary')
  async getSpendingSummary(
    @CurrentUser() user: { uid: string },
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return this.transactionsService.getCategorySpending(
      profile.id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Patch(':id/category')
  async updateTransactionCategory(
    @Param('id') transactionId: string,
    @Body('category') category: TransactionCategory,
  ): Promise<Transaction> {
    return this.transactionsService.updateTransactionCategory(transactionId, category);
  }
}

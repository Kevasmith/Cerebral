import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('accounts')
@UseGuards(FirebaseAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * GET /accounts
   * Get all accounts for the current user
   */
  @Get()
  async getUserAccounts(@CurrentUser() user: { uid: string }) {
    return this.accountsService.findAllByUser(user.uid);
  }

  /**
   * GET /accounts/dashboard
   * Get dashboard snapshot with financial overview
   */
  @Get('dashboard')
  async getDashboard(@CurrentUser() user: { uid: string }) {
    return this.accountsService.getDashboardSnapshot(user.uid);
  }
}

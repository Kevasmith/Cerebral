import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AccountsService } from './accounts.service';
import { UsersService } from '../users/users.service';
import { BankProviderRouter } from '../bank/bank-provider.router';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { posthog } from '../../posthog';

class SyncBankDto {
  @IsString()
  @MaxLength(200)
  loginId: string;
}

const FLINKS_REDIRECT_URL = 'https://cerebral.app/bank-connected';

@Controller('accounts')
@UseGuards(BetterAuthGuard)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly bankProviderRouter: BankProviderRouter,
  ) {}

  @Get()
  async getUserAccounts(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.accountsService.findAllByUser(profile.id);
  }

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.accountsService.getDashboardSnapshot(profile.id);
  }

  @Get('plan-preview')
  async getPlanPreview(
    @CurrentUser() user: { id: string },
    @Query('goal') goal: string,
  ) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.accountsService.generatePlanPreview(profile.id, goal);
  }

  @Get('connect-url')
  getConnectUrl() {
    return { url: this.accountsService.getConnectUrl(FLINKS_REDIRECT_URL) };
  }

  // Plaid step 3: returns a link_token the frontend hands to Plaid Link.
  // The router picks Flinks vs Plaid based on the BANK_PROVIDER env var,
  // so the response shape is { kind: 'link_token' | 'iframe_url'; value: string }.
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  @Post('link-token')
  async createLinkToken(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.bankProviderRouter
      .forNewConnection()
      .initConnection(profile.id, { redirectUrl: FLINKS_REDIRECT_URL });
  }

  // 5 bank syncs per minute per IP — Flinks is slow and expensive
  @Throttle({ global: { limit: 5, ttl: 60_000 } })
  @Post('sync')
  async syncBank(
    @CurrentUser() user: { id: string },
    @Body() body: SyncBankDto,
  ) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    const result = await this.accountsService.syncFromLoginId(
      profile.id,
      body.loginId,
    );
    posthog.capture({
      distinctId: user.id,
      event: 'bank_account_synced',
      properties: {
        accounts_synced: Array.isArray(result) ? result.length : undefined,
      },
    });
    return result;
  }
}

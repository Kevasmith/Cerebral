import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AccountsService } from './accounts.service';
import { UsersService } from '../users/users.service';
import { BankProviderRouter } from '../bank/bank-provider.router';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { posthog } from '../../posthog';

class SyncBankDto {
  // Discriminator. Optional for backward compatibility with the existing
  // Flinks payload shape ({ loginId }). Plaid clients must send 'plaid'.
  @IsOptional()
  @IsString()
  @IsIn(['flinks', 'plaid'])
  provider?: 'flinks' | 'plaid';

  // Flinks payload
  @IsOptional()
  @IsString()
  @MaxLength(200)
  loginId?: string;

  // Plaid payload — short-lived, returned by Plaid Link on the client.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  publicToken?: string;
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

  // 5 bank syncs per minute per IP — bank aggregator calls are slow + expensive.
  @Throttle({ global: { limit: 5, ttl: 60_000 } })
  @Post('sync')
  async syncBank(
    @CurrentUser() user: { id: string },
    @Body() body: SyncBankDto,
  ) {
    const profile = await this.usersService.findByBetterAuthId(user.id);

    // Route on payload shape (publicToken → Plaid; loginId → Flinks).
    // The provider field is informational; the shape is authoritative so a
    // payload with the wrong combo gets rejected explicitly.
    let result;
    let resolvedProvider: 'plaid' | 'flinks';
    if (body.publicToken) {
      resolvedProvider = 'plaid';
      result = await this.accountsService.syncFromPlaidPublicToken(
        profile.id,
        body.publicToken,
      );
    } else if (body.loginId) {
      resolvedProvider = 'flinks';
      result = await this.accountsService.syncFromLoginId(
        profile.id,
        body.loginId,
      );
    } else {
      throw new BadRequestException(
        'Missing publicToken (Plaid) or loginId (Flinks)',
      );
    }

    posthog.capture({
      distinctId: user.id,
      event: 'bank_account_synced',
      properties: {
        provider: resolvedProvider,
        accounts_synced: Array.isArray(result) ? result.length : undefined,
      },
    });
    return result;
  }
}

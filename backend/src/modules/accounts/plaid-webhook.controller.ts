import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AccountsService } from './accounts.service';
import { PlaidService } from '../plaid/plaid.service';

// Plaid POSTs here when an item's transactions update, an item errors, or a
// user revokes access. No auth guard — Plaid is the caller. JWT verification
// happens via PlaidService.verifyWebhook before any side effect runs.
//
// The endpoint sits under /accounts/webhooks/* (not /accounts/*) so it's
// outside the class-level BetterAuthGuard on AccountsController.
@Controller('accounts/webhooks')
export class PlaidWebhookController {
  private readonly logger = new Logger(PlaidWebhookController.name);

  constructor(
    private readonly accounts: AccountsService,
    private readonly plaid: PlaidService,
  ) {}

  @Throttle({ global: { limit: 60, ttl: 60_000 } })
  @Post('plaid')
  @HttpCode(HttpStatus.OK)
  async plaidWebhook(
    @Headers('plaid-verification') jwt: string,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<{ ok: true }> {
    const rawBody = req.rawBody?.toString('utf8') ?? '';

    const valid = await this.plaid.verifyWebhook(rawBody, jwt);
    if (!valid) {
      this.logger.warn('Rejected Plaid webhook: invalid JWT or body hash');
      throw new UnauthorizedException('Invalid Plaid webhook signature');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      this.logger.warn('Rejected Plaid webhook: invalid JSON body');
      throw new UnauthorizedException('Malformed Plaid webhook body');
    }

    // Don't await the dispatcher — Plaid expects a fast 2xx and will retry
    // on timeout. The handler logs internally; failures don't block the ack.
    this.accounts.handlePlaidWebhook(payload).catch((err) => {
      this.logger.error('Plaid webhook handler threw', err);
    });

    return { ok: true };
  }
}

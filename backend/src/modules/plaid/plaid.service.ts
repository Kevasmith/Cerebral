import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import {
  PlaidAccount,
  PlaidExchangeResult,
  PlaidLinkToken,
  PlaidTransactionsSyncResult,
} from './plaid.types';

@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly client: PlaidApi;
  private readonly env: string;
  private readonly hasCredentials: boolean;

  constructor(private readonly config: ConfigService) {
    this.env = config.get<string>('PLAID_ENV') ?? 'sandbox';
    const clientId = config.get<string>('PLAID_CLIENT_ID') ?? '';
    const secret = config.get<string>('PLAID_SECRET') ?? '';
    this.hasCredentials = Boolean(clientId && secret);

    if (!this.hasCredentials) {
      this.logger.warn(
        'Plaid credentials not configured (PLAID_CLIENT_ID / PLAID_SECRET) — Plaid features will fail at call time',
      );
    }

    const basePath =
      PlaidEnvironments[this.env as keyof typeof PlaidEnvironments] ??
      PlaidEnvironments.sandbox;

    const configuration = new Configuration({
      basePath,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
          'Plaid-Version': '2020-09-14',
        },
      },
    });

    this.client = new PlaidApi(configuration);
  }

  // ─── API surface (bodies land in steps 3–8) ────────────────────────────────
  // Step 2 declares signatures so PlaidAdapter compiles. Each method throws
  // NotImplementedException at runtime; calling them before the corresponding
  // step is implemented is a programmer error.

  // Step 3
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createLinkToken(userId: string): Promise<PlaidLinkToken> {
    throw new NotImplementedException(
      'PlaidService.createLinkToken — implemented in Plaid integration step 3',
    );
  }

  // Step 4
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async exchangePublicToken(publicToken: string): Promise<PlaidExchangeResult> {
    throw new NotImplementedException(
      'PlaidService.exchangePublicToken — implemented in Plaid integration step 4',
    );
  }

  // Step 4
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    throw new NotImplementedException(
      'PlaidService.getAccounts — implemented in Plaid integration step 4',
    );
  }

  // Step 4 / 8 (cursor support comes online with the webhook handler)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async syncTransactions(
    accessToken: string,
    cursor?: string,
  ): Promise<PlaidTransactionsSyncResult> {
    throw new NotImplementedException(
      'PlaidService.syncTransactions — implemented in Plaid integration step 4',
    );
  }

  // Step 8
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verifyWebhook(rawBody: string, jwt: string): Promise<boolean> {
    throw new NotImplementedException(
      'PlaidService.verifyWebhook — implemented in Plaid integration step 8',
    );
  }
}

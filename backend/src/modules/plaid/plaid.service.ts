import {
  Injectable,
  Logger,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from 'plaid';
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

  // Step 3 — implemented
  async createLinkToken(userId: string): Promise<PlaidLinkToken> {
    if (!this.hasCredentials) {
      throw new ServiceUnavailableException('Plaid not configured');
    }
    const webhook = this.config.get<string>('PLAID_WEBHOOK_URL') || undefined;
    try {
      const { data } = await this.client.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: 'Cerebral',
        products: [Products.Transactions],
        country_codes: [CountryCode.Ca],
        language: 'en',
        ...(webhook ? { webhook } : {}),
      });
      return { linkToken: data.link_token, expiration: data.expiration };
    } catch (err) {
      this.logger.error('Plaid linkTokenCreate failed', err);
      throw new ServiceUnavailableException('Failed to create Plaid link token');
    }
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

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

  // Step 4 — implemented
  async exchangePublicToken(publicToken: string): Promise<PlaidExchangeResult> {
    if (!this.hasCredentials) {
      throw new ServiceUnavailableException('Plaid not configured');
    }
    try {
      const { data } = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      return { accessToken: data.access_token, itemId: data.item_id };
    } catch (err) {
      this.logger.error('Plaid itemPublicTokenExchange failed', err);
      throw new ServiceUnavailableException('Failed to exchange public token');
    }
  }

  // Step 4 — implemented
  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    if (!this.hasCredentials) {
      throw new ServiceUnavailableException('Plaid not configured');
    }
    try {
      const { data } = await this.client.accountsGet({ access_token: accessToken });
      return data.accounts.map((a) => ({
        accountId: a.account_id,
        name: a.name,
        officialName: a.official_name ?? null,
        type: String(a.type),
        subtype: a.subtype ? String(a.subtype) : null,
        balance: {
          current: a.balances.current ?? null,
          available: a.balances.available ?? null,
          currency: a.balances.iso_currency_code ?? null,
        },
        mask: a.mask ?? null,
      }));
    } catch (err) {
      this.logger.error('Plaid accountsGet failed', err);
      throw new ServiceUnavailableException('Failed to fetch accounts from Plaid');
    }
  }

  // Step 4 — first-pass implementation. Cursor support is wired in step 8
  // (webhook-driven re-sync). For now: pass cursor=undefined to fetch the
  // initial set; pass the persisted nextCursor on subsequent calls.
  async syncTransactions(
    accessToken: string,
    cursor?: string,
  ): Promise<PlaidTransactionsSyncResult> {
    if (!this.hasCredentials) {
      throw new ServiceUnavailableException('Plaid not configured');
    }
    try {
      const { data } = await this.client.transactionsSync({
        access_token: accessToken,
        cursor: cursor || undefined,
      });

      const mapTx = (t: any) => ({
        transactionId: t.transaction_id,
        accountId: t.account_id,
        amount: Number(t.amount),
        isoCurrencyCode: t.iso_currency_code ?? null,
        date: t.date,
        authorizedDate: t.authorized_date ?? null,
        name: t.name,
        merchantName: t.merchant_name ?? null,
        pending: Boolean(t.pending),
        primaryCategory: t.personal_finance_category?.primary ?? null,
        detailedCategory: t.personal_finance_category?.detailed ?? null,
      });

      return {
        added: (data.added ?? []).map(mapTx),
        modified: (data.modified ?? []).map(mapTx),
        removed: (data.removed ?? []).map((r: any) => ({
          transactionId: r.transaction_id,
        })),
        nextCursor: data.next_cursor,
        hasMore: Boolean(data.has_more),
      };
    } catch (err) {
      this.logger.error('Plaid transactionsSync failed', err);
      throw new ServiceUnavailableException('Failed to sync transactions from Plaid');
    }
  }

  // Step 8
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verifyWebhook(rawBody: string, jwt: string): Promise<boolean> {
    throw new NotImplementedException(
      'PlaidService.verifyWebhook — implemented in Plaid integration step 8',
    );
  }
}

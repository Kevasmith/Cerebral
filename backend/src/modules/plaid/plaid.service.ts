import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

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

  // Method implementations land in steps 3–8 of the Plaid integration plan.
  // Step 1 is scaffolding only — boot + DI verification.
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlinksAdapter } from './flinks.adapter';
import { PlaidAdapter } from './plaid.adapter';
import { BankProvider, BankProviderId } from './bank-provider.interface';

// Routes incoming connection flows to the active provider, and routes existing
// account fetches to whichever provider that account was linked through.
//
// Active provider is controlled by the BANK_PROVIDER env var ('plaid' or
// 'flinks'). Default: 'plaid'.
@Injectable()
export class BankProviderRouter {
  private readonly logger = new Logger(BankProviderRouter.name);
  private readonly activeProvider: BankProviderId;

  constructor(
    private readonly flinksAdapter: FlinksAdapter,
    private readonly plaidAdapter: PlaidAdapter,
    private readonly config: ConfigService,
  ) {
    const raw = (config.get<string>('BANK_PROVIDER') ?? 'plaid').toLowerCase();
    this.activeProvider =
      raw === 'flinks' || raw === 'plaid' ? raw : 'plaid';
    this.logger.log(`Active bank provider: ${this.activeProvider}`);
  }

  /** Returns the active provider for *new* connections (link-token / iframe). */
  forNewConnection(): BankProvider {
    return this.byId(this.activeProvider);
  }

  /** Returns the provider an existing account was linked through. Used by
   *  AccountsService / TransactionsService when refreshing data. Persisted
   *  account rows carry a `provider` column starting in Plaid step 4. */
  forProvider(id: BankProviderId): BankProvider {
    return this.byId(id);
  }

  /** Surface the active provider id to controllers (so `/accounts/sync` can
   *  validate the payload shape before dispatching). */
  getActiveProviderId(): BankProviderId {
    return this.activeProvider;
  }

  private byId(id: BankProviderId): BankProvider {
    return id === 'plaid' ? this.plaidAdapter : this.flinksAdapter;
  }
}

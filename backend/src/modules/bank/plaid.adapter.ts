import { Injectable, Logger } from '@nestjs/common';
import { PlaidService } from '../plaid/plaid.service';
import {
  BankConnectInit,
  BankConnectPayload,
  BankConnectResult,
  BankProvider,
  BankProviderId,
  FetchTransactionsOpts,
  FetchTransactionsResult,
  NormalizedAccount,
  NormalizedTransaction,
} from './bank-provider.interface';

@Injectable()
export class PlaidAdapter implements BankProvider {
  readonly id: BankProviderId = 'plaid';
  private readonly logger = new Logger(PlaidAdapter.name);

  constructor(private readonly plaid: PlaidService) {}

  async initConnection(userId: string): Promise<BankConnectInit> {
    const { linkToken } = await this.plaid.createLinkToken(userId);
    return { kind: 'link_token', value: linkToken };
  }

  async finalizeConnection(payload: BankConnectPayload): Promise<BankConnectResult> {
    if (payload.provider !== 'plaid') {
      throw new Error(`PlaidAdapter cannot finalize ${payload.provider} payload`);
    }
    const { accessToken, itemId } = await this.plaid.exchangePublicToken(
      payload.publicToken,
    );
    return { accessRef: accessToken, externalId: itemId };
  }

  async fetchAccounts(accessRef: string): Promise<NormalizedAccount[]> {
    const accounts = await this.plaid.getAccounts(accessRef);
    return accounts.map((a) => ({
      externalAccountId: a.accountId,
      institutionName: a.officialName ?? a.name ?? '',
      accountName: a.name ?? '',
      accountType: this.mapAccountType(a.type, a.subtype),
      balance: {
        current: a.balance.current,
        available: a.balance.available,
        currency: a.balance.currency,
      },
      mask: a.mask ?? null,
    }));
  }

  async fetchTransactions(
    accessRef: string,
    opts?: FetchTransactionsOpts,
  ): Promise<FetchTransactionsResult> {
    const result = await this.plaid.syncTransactions(accessRef, opts?.cursor);

    // Plaid `transactionsSync` returns `added`, `modified`, `removed`. For the
    // first pass we surface `added` + `modified` as the live set; consumers
    // dedup on externalTransactionId. `removed` is handled in step 8 (webhook).
    const incoming = [...result.added, ...result.modified];

    const transactions: NormalizedTransaction[] = incoming.map((t) => {
      // Plaid convention: positive amount = money out (debit). We keep amount
      // positive and split with isDebit so consumers don't infer sign.
      const isDebit = t.amount > 0;
      return {
        externalTransactionId: t.transactionId,
        externalAccountId: t.accountId,
        description: t.name,
        merchantName: t.merchantName ?? null,
        amount: Math.abs(t.amount),
        isDebit,
        currency: t.isoCurrencyCode,
        date: t.date,
        pending: t.pending,
        providerPrimaryCategory: t.primaryCategory ?? null,
      };
    });

    return { transactions, nextCursor: result.nextCursor };
  }

  private mapAccountType(type: string, subtype: string | null | undefined): string {
    // Plaid `type` values: depository, credit, loan, investment, brokerage, other.
    // `subtype` values include checking, savings, cd, money market, etc.
    if (type === 'credit') return 'credit';
    if (type === 'investment' || type === 'brokerage') return 'investment';
    if (type === 'loan') return 'credit'; // closest existing bucket; refine post-MVP
    if (type === 'depository') {
      const sub = (subtype ?? '').toLowerCase();
      if (sub.includes('saving')) return 'savings';
      return 'checking';
    }
    return 'checking';
  }
}

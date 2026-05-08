import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlinksService } from '../flinks/flinks.service';
import {
  BankConnectInit,
  BankConnectPayload,
  BankConnectResult,
  BankProvider,
  BankProviderId,
  FetchTransactionsOpts,
  FetchTransactionsResult,
  InitConnectionOpts,
  NormalizedAccount,
  NormalizedTransaction,
} from './bank-provider.interface';

const DEFAULT_REDIRECT_URL = 'https://cerebral.app/bank-connected';

@Injectable()
export class FlinksAdapter implements BankProvider {
  readonly id: BankProviderId = 'flinks';
  private readonly logger = new Logger(FlinksAdapter.name);

  constructor(
    private readonly flinks: FlinksService,
    private readonly config: ConfigService,
  ) {}

  async initConnection(
    _userId: string,
    opts?: InitConnectionOpts,
  ): Promise<BankConnectInit> {
    const redirectUrl =
      opts?.redirectUrl ??
      this.config.get<string>('FLINKS_REDIRECT_URL') ??
      DEFAULT_REDIRECT_URL;
    return { kind: 'iframe_url', value: this.flinks.getConnectUrl(redirectUrl) };
  }

  async finalizeConnection(payload: BankConnectPayload): Promise<BankConnectResult> {
    if (payload.provider !== 'flinks') {
      throw new Error(`FlinksAdapter cannot finalize ${payload.provider} payload`);
    }
    // Flinks gives a fresh requestId on every authorize() call, so the
    // persistent reference we hand back to AccountsService is the loginId.
    return { accessRef: payload.loginId, externalId: payload.loginId };
  }

  async fetchAccounts(accessRef: string): Promise<NormalizedAccount[]> {
    const { RequestId } = await this.flinks.authorize(accessRef);
    const detail = await this.flinks.getAccountsDetail(RequestId);
    const institutionName = detail.Login?.InstitutionName ?? '';

    return detail.Accounts.map((a) => ({
      externalAccountId: a.Id,
      institutionName: institutionName || '',
      accountName: a.Title ?? '',
      accountType: this.mapAccountType(a.Type),
      balance: {
        current: a.Balance?.Current ?? null,
        available: a.Balance?.Available ?? null,
        currency: a.Currency ?? null,
      },
      mask: this.maskFromAccountNumber(a.AccountNumber),
    }));
  }

  async fetchTransactions(
    accessRef: string,
    opts?: FetchTransactionsOpts,
  ): Promise<FetchTransactionsResult> {
    const { RequestId } = await this.flinks.authorize(accessRef);
    const txData = await this.flinks.getTransactions(RequestId, {
      fromDate: opts?.fromDate,
      toDate: opts?.toDate,
    });

    const transactions: NormalizedTransaction[] = [];
    for (const acct of txData.Accounts) {
      for (const t of acct.Transactions) {
        const debit = Number(t.Debit ?? 0);
        const credit = Number(t.Credit ?? 0);
        const isDebit = debit > 0;
        const amount = isDebit ? debit : credit;

        transactions.push({
          externalTransactionId: t.Id,
          externalAccountId: acct.Id,
          description: t.Description ?? '',
          merchantName: null, // Flinks doesn't supply a separate merchant name
          amount,
          isDebit,
          currency: t.Currency ?? null,
          date: this.normalizeDate(t.Date),
          pending: false, // Flinks doesn't expose a pending flag
          providerPrimaryCategory: null, // Flinks doesn't categorize
        });
      }
    }

    return { transactions };
  }

  private mapAccountType(flinksType: string | undefined): string {
    const t = (flinksType ?? '').toLowerCase();
    if (t.includes('saving')) return 'savings';
    if (t.includes('credit')) return 'credit';
    if (t.includes('invest')) return 'investment';
    return 'checking';
  }

  private maskFromAccountNumber(accountNumber: string | undefined): string | null {
    if (!accountNumber) return null;
    return accountNumber.length > 4 ? accountNumber.slice(-4) : accountNumber;
  }

  private normalizeDate(raw: string): string {
    // Flinks dates are typically already ISO-ish; defensively slice to YYYY-MM-DD.
    if (!raw) return '';
    return raw.length >= 10 ? raw.slice(0, 10) : raw;
  }
}

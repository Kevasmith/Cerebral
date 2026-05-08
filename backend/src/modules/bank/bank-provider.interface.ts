// Common contract both bank-aggregator providers (Flinks, Plaid) implement.
// AccountsService and TransactionsService consume this interface via the
// BankProviderRouter so they don't branch on provider.
//
// The shapes below are *normalized* — provider-specific responses are mapped
// into these by each adapter. Adding a third provider later is a new adapter
// + router branch with no changes to the consumers.

export type BankProviderId = 'flinks' | 'plaid';

// Returned by initConnection — what the frontend needs to start a link flow.
export type BankConnectInit =
  | { kind: 'iframe_url'; value: string }   // Flinks: full Flinks Connect URL
  | { kind: 'link_token'; value: string };  // Plaid: link_token for Plaid Link

// Sent to finalizeConnection after the user completes the link flow.
export type BankConnectPayload =
  | { provider: 'flinks'; loginId: string }
  | { provider: 'plaid'; publicToken: string };

export interface BankConnectResult {
  /** Credential reused for subsequent fetches. Plaid: access_token (must be
   *  encrypted at rest). Flinks: loginId (already a non-secret reference). */
  accessRef: string;
  /** Provider-side identifier for the connection. Plaid: item_id. Flinks: loginId. */
  externalId: string;
}

export interface NormalizedBalance {
  current: number | null;
  available: number | null;
  currency: string | null;
}

export interface NormalizedAccount {
  externalAccountId: string;
  institutionName: string;
  accountName: string;
  /** Lower-case key: 'checking' | 'savings' | 'credit' | 'investment' | other. */
  accountType: string;
  balance: NormalizedBalance;
  mask: string | null;
}

export interface NormalizedTransaction {
  externalTransactionId: string;
  externalAccountId: string;
  description: string;
  merchantName: string | null;
  /** Always positive. `isDebit` carries the sign so consumers don't have to
   *  guess a provider's sign convention. */
  amount: number;
  isDebit: boolean;
  currency: string | null;
  /** ISO YYYY-MM-DD. */
  date: string;
  pending: boolean;
  /** Provider-supplied category hint. Plaid sets this from
   *  `personal_finance_category.primary`; Flinks leaves it null. The merchant-
   *  pattern table in transactions.service.ts wins; this is the fallback. */
  providerPrimaryCategory?: string | null;
}

export interface FetchTransactionsOpts {
  fromDate?: string;
  toDate?: string;
  /** Plaid-only: cursor for transactionsSync. Flinks ignores. */
  cursor?: string;
}

export interface FetchTransactionsResult {
  transactions: NormalizedTransaction[];
  /** Plaid-only: cursor to persist for the next sync call. Empty for Flinks. */
  nextCursor?: string;
}

export interface InitConnectionOpts {
  /** Flinks-only: where the iframe should redirect after a successful link. */
  redirectUrl?: string;
}

export interface BankProvider {
  readonly id: BankProviderId;
  initConnection(userId: string, opts?: InitConnectionOpts): Promise<BankConnectInit>;
  finalizeConnection(payload: BankConnectPayload): Promise<BankConnectResult>;
  fetchAccounts(accessRef: string): Promise<NormalizedAccount[]>;
  fetchTransactions(
    accessRef: string,
    opts?: FetchTransactionsOpts,
  ): Promise<FetchTransactionsResult>;
}

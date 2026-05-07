// Cerebral-shaped Plaid types. These wrap the official SDK types so callers
// in `accounts.service.ts` / `transactions.service.ts` don't depend on Plaid
// SDK internals (and so the Flinks adapter can populate the same shapes).

export interface PlaidLinkToken {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeResult {
  accessToken: string;
  itemId: string;
}

export interface PlaidAccountBalance {
  current: number | null;
  available: number | null;
  currency: string | null;
}

export interface PlaidAccount {
  accountId: string;
  name: string;
  officialName?: string | null;
  type: string;
  subtype?: string | null;
  balance: PlaidAccountBalance;
  mask?: string | null;
}

export interface PlaidTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  isoCurrencyCode: string | null;
  date: string;                 // ISO YYYY-MM-DD
  authorizedDate?: string | null;
  name: string;
  merchantName?: string | null;
  pending: boolean;
  primaryCategory?: string | null;   // personal_finance_category.primary
  detailedCategory?: string | null;  // personal_finance_category.detailed
}

export interface PlaidTransactionsSyncResult {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transactionId: string }[];
  nextCursor: string;
  hasMore: boolean;
}

export interface PlaidWebhookPayload {
  webhookType: string;          // e.g. 'TRANSACTIONS', 'ITEM'
  webhookCode: string;          // e.g. 'DEFAULT_UPDATE', 'ERROR'
  itemId: string;
  // Plaid attaches type-specific extras (new_transactions, error, etc.)
  [key: string]: unknown;
}

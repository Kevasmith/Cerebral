export interface FlinksAuthorizeResponse {
  RequestId: string;
  FlinksCode: string;
  Login: {
    Id: string;
    IsScheduledRefresh: boolean;
  };
}

export interface FlinksAccount {
  Id: string;
  Title: string;
  AccountNumber: string;
  Balance: {
    Available: number;
    Current: number;
    Limit: number;
  };
  Currency: string;
  Type: string;
  InstitutionName: string;
  TransitNumber: string;
  InstitutionNumber: string;
}

export interface FlinksAccountsDetailResponse {
  RequestId: string;
  Accounts: FlinksAccount[];
  Login: {
    Id: string;
    InstitutionName: string;
  };
}

export interface FlinksTransaction {
  Id: string;
  AccountId: string;
  Date: string;
  Description: string;
  Credit: number | null;
  Debit: number | null;
  Balance: number;
  Currency: string;
}

export interface FlinksTransactionsResponse {
  RequestId: string;
  Accounts: Array<{
    Id: string;
    Transactions: FlinksTransaction[];
  }>;
}

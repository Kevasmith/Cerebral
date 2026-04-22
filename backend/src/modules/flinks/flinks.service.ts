import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  FlinksAuthorizeResponse,
  FlinksAccountsDetailResponse,
  FlinksTransactionsResponse,
} from './flinks.types';

@Injectable()
export class FlinksService {
  private readonly logger = new Logger(FlinksService.name);
  private readonly client: AxiosInstance;
  private readonly instance: string;
  private readonly customerId: string;

  constructor(private config: ConfigService) {
    this.instance = config.get<string>('FLINKS_INSTANCE') ?? '';
    this.customerId = config.get<string>('FLINKS_CUSTOMER_ID') ?? '';

    this.client = axios.create({
      baseURL: `https://${this.instance}-api.private.fin.ag/v3/${this.customerId}/`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
  }

  getConnectUrl(redirectUrl: string): string {
    return `https://${this.instance}-iframe.private.fin.ag/v2/?redirectUrl=${encodeURIComponent(redirectUrl)}`;
  }

  async authorize(loginId: string): Promise<FlinksAuthorizeResponse> {
    try {
      const { data } = await this.client.post<FlinksAuthorizeResponse>(
        'BankingServices/Authorize',
        { LoginId: loginId, MostRecentCached: true },
      );
      return data;
    } catch (err) {
      this.logger.error('Flinks authorize failed', err);
      throw new ServiceUnavailableException('Bank authorization failed');
    }
  }

  async getAccountsDetail(requestId: string): Promise<FlinksAccountsDetailResponse> {
    try {
      const { data } = await this.client.get<FlinksAccountsDetailResponse>(
        `BankingServices/GetAccountsDetail/${requestId}`,
      );
      return data;
    } catch (err) {
      this.logger.error('Flinks GetAccountsDetail failed', err);
      throw new ServiceUnavailableException('Failed to fetch account details');
    }
  }

  async getTransactions(
    requestId: string,
    options: { fromDate?: string; toDate?: string } = {},
  ): Promise<FlinksTransactionsResponse> {
    try {
      const { data } = await this.client.post<FlinksTransactionsResponse>(
        `BankingServices/GetTransactions`,
        {
          RequestId: requestId,
          // Default: last 90 days
          DaysOfTransactions: 'Days90',
          ...(options.fromDate && { StartDate: options.fromDate }),
          ...(options.toDate && { EndDate: options.toDate }),
        },
      );
      return data;
    } catch (err) {
      this.logger.error('Flinks GetTransactions failed', err);
      throw new ServiceUnavailableException('Failed to fetch transactions');
    }
  }
}

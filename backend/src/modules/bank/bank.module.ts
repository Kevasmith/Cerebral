import { Module } from '@nestjs/common';
import { FlinksModule } from '../flinks/flinks.module';
import { PlaidModule } from '../plaid/plaid.module';
import { FlinksAdapter } from './flinks.adapter';
import { PlaidAdapter } from './plaid.adapter';
import { BankProviderRouter } from './bank-provider.router';

@Module({
  imports: [FlinksModule, PlaidModule],
  providers: [FlinksAdapter, PlaidAdapter, BankProviderRouter],
  exports: [BankProviderRouter, FlinksAdapter, PlaidAdapter],
})
export class BankModule {}

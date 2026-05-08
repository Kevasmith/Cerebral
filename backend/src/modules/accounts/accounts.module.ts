import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { Account } from '../../entities/account.entity';
import { FlinksModule } from '../flinks/flinks.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { BankModule } from '../bank/bank.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account]), FlinksModule, TransactionsModule, UsersModule, BankModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}

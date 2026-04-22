import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../../entities/transaction.entity';
import { FlinksModule } from '../flinks/flinks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction]), FlinksModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightEngineService } from './insight-engine.service';
import { Insight } from '../../entities/insight.entity';
import { User } from '../../entities/user.entity';
import { Preference } from '../../entities/preference.entity';
import { AiModule } from '../ai/ai.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Insight, User, Preference]),
    AiModule,
    AccountsModule,
    TransactionsModule,
    UsersModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService, InsightEngineService],
  exports: [InsightsService],
})
export class InsightsModule {}

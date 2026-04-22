import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import * as admin from 'firebase-admin';

import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';

import { User } from './entities/user.entity';
import { Account } from './entities/account.entity';
import { Transaction } from './entities/transaction.entity';
import { Insight } from './entities/insight.entity';
import { Opportunity } from './entities/opportunity.entity';
import { Preference } from './entities/preference.entity';

import { UsersModule } from './modules/users/users.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { InsightsModule } from './modules/insights/insights.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get<number>('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        entities: [User, Account, Transaction, Insight, Opportunity, Preference],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
      }),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [
          createKeyv(
            `redis://${config.get('redis.host')}:${config.get('redis.port')}`,
          ),
        ],
        ttl: config.get<number>('redis.ttl'),
      }),
    }),

    UsersModule,
    AccountsModule,
    TransactionsModule,
    InsightsModule,
    OpportunitiesModule,
    ChatModule,
  ],
})
export class AppModule {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }
}

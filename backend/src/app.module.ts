import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
    }),

    // Global rate limiting: 120 req / 60 s per IP by default
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 120,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get('database') as any;
        const entities = [User, Account, Transaction, Insight, Opportunity, Preference];

        // Allow explicit override: TYPEORM_SYNCHRONIZE=true/false
        const syncEnv = process.env.TYPEORM_SYNCHRONIZE;
        const synchronize = typeof syncEnv !== 'undefined' ? syncEnv === 'true' : (process.env.NODE_ENV !== 'production');

        const base: any = {
          type: 'postgres',
          entities,
          synchronize,
          logging: process.env.NODE_ENV === 'development',
        };

        // Prefer full DATABASE_URL when provided (Railway)
        if (db?.url || process.env.DATABASE_URL) {
          base.url = db?.url || process.env.DATABASE_URL;
          // Optionally enable SSL if requested (set DATABASE_SSL=true)
          if (process.env.DATABASE_SSL === 'true') {
            base.extra = { ssl: { rejectUnauthorized: false } };
          }
        } else {
          base.host = db?.host || config.get('database.host');
          base.port = db?.port || config.get<number>('database.port');
          base.username = db?.username || config.get('database.username');
          base.password = db?.password || config.get('database.password');
          base.database = db?.database || config.get('database.database');
        }

        return base;
      },
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const r = config.get('redis') as any;
        const redisUrl = r?.url || process.env.REDIS_URL || `redis://${config.get('redis.host')}:${config.get('redis.port')}`;
        return {
          stores: [createKeyv(redisUrl)],
          ttl: config.get<number>('redis.ttl'),
        };
      },
    }),

    UsersModule,
    AccountsModule,
    TransactionsModule,
    InsightsModule,
    OpportunitiesModule,
    ChatModule,
    HealthModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally; individual endpoints can override with @Throttle()
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {
  constructor() {
    if (!admin.apps.length) {
      // Prefer full JSON service account in FIREBASE_SERVICE_ACCOUNT (stringified JSON)
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

      try {
        if (serviceAccountJson) {
          const parsed = JSON.parse(serviceAccountJson);
          if (parsed && parsed.project_id) {
            admin.initializeApp({
              credential: admin.credential.cert(parsed),
            });
            return;
          }
        }

        // Fallback to individual env vars if provided
        if (projectId && clientEmail && privateKeyRaw) {
          const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
          return;
        }

        // If we reach here, Firebase credentials are not configured; skip init to avoid crash.
        // The app will continue to run without admin SDK features (auth guards relying on Firebase client still work for token verification elsewhere).
        // Log a clear warning so deploys can detect missing config.
        // eslint-disable-next-line no-console
        console.warn(
          'Firebase admin SDK not initialized: missing FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars',
        );
      } catch (err) {
        // If parsing or initialization fails, log and continue to avoid crashing the whole app.
        // eslint-disable-next-line no-console
        console.error('Failed to initialize Firebase admin SDK:', err?.message || err);
      }
    }
  }
}

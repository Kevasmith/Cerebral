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
    } as any),

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
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      const projectIdEnv = process.env.FIREBASE_PROJECT_ID;
      const clientEmailEnv = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKeyRawEnv = process.env.FIREBASE_PRIVATE_KEY;

      let sa: any = null;
      try {
        if (serviceAccountJson) {
          try {
            sa = JSON.parse(serviceAccountJson);
          } catch (e) {
            // Try to repair common formatting: replace escaped newlines then parse
            try {
              const repaired = serviceAccountJson.replace(/\\n/g, '\n');
              sa = JSON.parse(repaired);
            } catch (e2) {
              sa = null;
            }
          }
        }

        // Normalize and supplement from individual env vars if needed
        if (sa) {
          sa.project_id = sa.project_id || sa.projectId || projectIdEnv;
          sa.client_email = sa.client_email || sa.clientEmail || clientEmailEnv;
          if (typeof sa.private_key === 'string') sa.private_key = sa.private_key.replace(/\\n/g, '\n');
        } else if (projectIdEnv && clientEmailEnv && privateKeyRawEnv) {
          sa = {
            project_id: projectIdEnv,
            client_email: clientEmailEnv,
            private_key: privateKeyRawEnv.replace(/\\n/g, '\n'),
          };
        }

        const hasRequired = sa && typeof sa.project_id === 'string' && sa.project_id && typeof sa.client_email === 'string' && sa.client_email && typeof sa.private_key === 'string' && sa.private_key;

        if (hasRequired) {
          try {
            admin.initializeApp({
              credential: admin.credential.cert({
                projectId: sa.project_id,
                clientEmail: sa.client_email,
                privateKey: sa.private_key,
              } as any),
            });
            // eslint-disable-next-line no-console
            console.log('Firebase admin SDK initialized');
          } catch (initErr) {
            // eslint-disable-next-line no-console
            console.error('Firebase admin SDK initialization error:', initErr && initErr.message ? initErr.message : initErr);
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn('Skipping Firebase admin init: missing service account project_id/client_email/private_key');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Unexpected error while preparing Firebase admin SDK:', err && err.message ? err.message : err);
      }
    }
  }
}

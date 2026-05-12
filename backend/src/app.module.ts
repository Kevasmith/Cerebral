import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { createKeyv } from '@keyv/redis';
import { DataSource } from 'typeorm';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';

import { User } from './entities/user.entity';
import { Account } from './entities/account.entity';
import { Transaction } from './entities/transaction.entity';
import { Insight } from './entities/insight.entity';
import { Preference } from './entities/preference.entity';

import { UsersModule } from './modules/users/users.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { InsightsModule } from './modules/insights/insights.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { ChatModule } from './modules/chat/chat.module';
import { HealthModule } from './modules/health/health.module';
import { BillingModule } from './modules/billing/billing.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { PlaidModule } from './modules/plaid/plaid.module';
import { BankModule } from './modules/bank/bank.module';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { Subscription } from './entities/subscription.entity';
import { RlsInterceptor } from './common/rls/rls.interceptor';
import { rlsContext } from './common/rls/rls-context';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
    }),

    // Global rate limiting: 120 req / 60 s per IP by default
    ThrottlerModule.forRoot([{
      name: 'global',
      ttl: 60_000,
      limit: 120,
    }]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get('database') as any;
        const entities = [User, Account, Transaction, Insight, Preference, WaitlistEntry, Subscription];

        const syncEnv = process.env.TYPEORM_SYNCHRONIZE;
        const synchronize = syncEnv === 'false' ? false : true;

        const base: any = {
          type: 'postgres',
          entities,
          synchronize,
          logging: process.env.NODE_ENV === 'development',
          extra: {
            connectionTimeoutMillis: 5000,  // fail fast if pool is exhausted
            idleTimeoutMillis: 60_000,      // close idle connections after 60s (before Railway drops them)
            keepAlive: true,                // TCP keepalive detects silently dropped connections
            keepAliveInitialDelayMillis: 10_000,
          },
        };

        // Prefer full DATABASE_URL when provided (Railway)
        if (db?.url || process.env.DATABASE_URL) {
          base.url = db?.url || process.env.DATABASE_URL;
          // Optionally enable SSL if requested (set DATABASE_SSL=true)
          if (process.env.DATABASE_SSL === 'true') {
            base.extra = { ...base.extra, ssl: { rejectUnauthorized: false } };
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
    BillingModule,
    WaitlistModule,
    PlaidModule,
    BankModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Sets app.current_user_id on every pg query based on the authenticated user.
    // Runs after guards so request.user (from BetterAuthGuard) is already set.
    { provide: APP_INTERCEPTOR, useClass: RlsInterceptor },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // Hook pool.connect so set_config runs once per connection checkout, not
  // before every query. Avoids the pg@8 "already executing" deprecation warning
  // that fired when two queries were chained on the same client.
  onModuleInit() {
    const driver = (this.dataSource as any).driver;
    const pool = driver?.master; // pg.Pool instance
    if (!pool?.connect) {
      console.warn('[RLS] Could not find pg pool — row-level security hook skipped');
      return;
    }

    const origConnect = pool.connect.bind(pool);

    // TypeORM calls pool.connect(callback) — callback style.
    // Direct callers may use pool.connect() — Promise style.
    // The old hook was async () => {} with no params, so the callback was
    // silently ignored and TypeORM's internal Promise hung forever.
    pool.connect = function (callback?: (err: Error | null, client?: any, release?: () => void) => void) {
      const userId = rlsContext.getUserId();
      const escapedId = (userId ?? '').replace(/'/g, "''");
      const sql = `SELECT set_config('app.current_user_id', '${escapedId}', false)`;

      if (typeof callback === 'function') {
        // TypeORM callback path
        origConnect((err: any, client: any, release: any) => {
          if (err) return callback(err);
          client.query(sql, (qErr: any) => {
            if (qErr) console.error('[RLS] set_config error:', qErr.message);
            callback(null, client, release);
          });
        });
      } else {
        // Promise path
        return (async () => {
          const client = await origConnect();
          try {
            await client.query(sql);
          } catch (err: any) {
            console.error('[RLS] set_config error:', err.message);
          }
          return client;
        })();
      }
    };

    console.log('[RLS] pg pool hook registered — row-level security active');
  }
}

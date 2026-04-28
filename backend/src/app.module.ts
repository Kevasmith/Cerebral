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
import { Opportunity } from './entities/opportunity.entity';
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
        const entities = [User, Account, Transaction, Insight, Opportunity, Preference, WaitlistEntry, Subscription];

        const syncEnv = process.env.TYPEORM_SYNCHRONIZE;
        const synchronize = syncEnv === 'false' ? false : true;

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
    BillingModule,
    WaitlistModule,
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

  /**
   * Hook into the pg connection pool once all modules are initialized.
   * Every new physical connection gets a wrapped `query()` that injects
   * `set_config('app.current_user_id', ...)` before the real query using
   * the user ID stored in AsyncLocalStorage by RlsInterceptor.
   *
   * Because Node.js is single-threaded and AsyncLocalStorage is async-context-
   * scoped, concurrent requests using the same pooled connection are correctly
   * isolated — each query reads the ID for its own async context.
   */
  onModuleInit() {
    const driver = (this.dataSource as any).driver;
    const pool = driver?.master; // pg.Pool instance
    if (!pool?.on) {
      console.warn('[RLS] Could not find pg pool — row-level security hook skipped');
      return;
    }

    pool.on('connect', (client: any) => {
      const origQuery: (...args: unknown[]) => unknown = client.query.bind(client);

      client.query = (...args: unknown[]) => {
        const userId = rlsContext.getUserId();
        // set_config(name, value, is_local):
        //   is_local=false → session-scoped (survives the current transaction boundary)
        const setCfg = userId
          ? `SELECT set_config('app.current_user_id', '${userId.replace(/'/g, "''")}', false)`
          : `SELECT set_config('app.current_user_id', '', false)`;

        const hasCallback = typeof args[args.length - 1] === 'function';

        if (hasCallback) {
          const cb = args[args.length - 1] as (...a: unknown[]) => void;
          const rest = args.slice(0, -1);
          origQuery(setCfg, (err: Error | null) => {
            if (err) console.error('[RLS] set_config error:', err.message);
            origQuery(...rest, cb);
          });
        } else {
          return (origQuery(setCfg) as Promise<unknown>).then(
            () => origQuery(...args),
            () => origQuery(...args), // still run the query on set_config failure
          );
        }
      };
    });

    console.log('[RLS] pg pool hook registered — row-level security active');
  }
}

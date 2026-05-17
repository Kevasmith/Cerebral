// TypeORM CLI entry point. NestJS's TypeOrmModule loads its own DataSource at
// runtime — this file exists exclusively for the `typeorm` CLI when generating
// or running migrations from the command line.
//
// Usage examples (from backend/):
//   bun run migration:generate src/migrations/AddBudgetColumn
//   bun run migration:run
//   bun run migration:revert
//   bun run migration:show
//
// The config below mirrors the production runtime config in src/app.module.ts:
// same entities, same SSL handling, same DATABASE_URL preference. Keeping the
// two in sync is the cost of having a separate CLI data source — when you add
// a new entity, register it both here and in app.module.

import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User }         from './entities/user.entity';
import { Account }      from './entities/account.entity';
import { Transaction }  from './entities/transaction.entity';
import { Insight }      from './entities/insight.entity';
import { Preference }   from './entities/preference.entity';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { Subscription } from './entities/subscription.entity';

const url = process.env.DATABASE_URL;
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

export default new DataSource({
  type: 'postgres',
  ...(url
    ? { url }
    : {
        host:     process.env.DB_HOST     || process.env.PGHOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT ?? process.env.PGPORT ?? '5432', 10),
        username: process.env.DB_USERNAME || process.env.PGUSER     || 'postgres',
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
        database: process.env.DB_NAME     || process.env.PGDATABASE || 'cerebral',
      }),
  ssl,
  entities: [User, Account, Transaction, Insight, Preference, WaitlistEntry, Subscription],
  // Migrations live in src/migrations during dev (loaded as .ts via ts-node) and
  // in dist/migrations after `nest build` for the production runtime.
  migrations: ['src/migrations/*.ts', 'dist/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});

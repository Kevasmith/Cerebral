import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial baseline migration.
 *
 * The Cerebral schema was created by TypeORM's `synchronize: true` mode before
 * migrations were wired up, so the production DB already has every table the
 * entities describe. This migration is intentionally empty — its only job is
 * to be recorded in the `typeorm_migrations` table so that future migrations
 * generated via `bun run migration:generate` have a clean baseline to diff
 * against.
 *
 * Rollout (one-time, on the prod DB the first time we set
 * TYPEORM_SYNCHRONIZE=false):
 *   - The runtime calls `migrationsRun: true` on boot.
 *   - This migration's `up()` is a no-op, so applying it costs nothing.
 *   - The migration row is inserted, marking the baseline.
 *   - Future entity changes get diffed from here and emit real migrations.
 *
 * If for any reason migrations need to be marked "applied" manually (e.g. you
 * want to flip synchronize off without booting the app first), insert the row
 * directly:
 *
 *   INSERT INTO typeorm_migrations (timestamp, name)
 *   VALUES (1715900000000, 'InitialBaseline1715900000000');
 */
export class InitialBaseline1715900000000 implements MigrationInterface {
  name = 'InitialBaseline1715900000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op. Baseline only — schema was created by synchronize mode.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op. There is nothing to roll back.
  }
}

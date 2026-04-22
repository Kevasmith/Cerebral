import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // Full connection string (Railway provides DATABASE_URL)
  url: process.env.DATABASE_URL || null,
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? process.env.PGPORT ?? '5432', 10) || 5432,
  username: process.env.DB_USERNAME || process.env.PGUSER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
  database: process.env.DB_NAME || process.env.PGDATABASE || 'cerebral',
  // Allow overriding TypeORM synchronize behavior (true/false)
  synchronize: process.env.TYPEORM_SYNCHRONIZE,
}));

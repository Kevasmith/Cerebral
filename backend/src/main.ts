import 'dotenv/config'; // must be first — loads .env before any entity decorator runs
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth';
import { Pool } from 'pg';
import { posthog } from './posthog';
import { PostHogExceptionFilter } from './common/filters/posthog-exception.filter';

async function runBetterAuthMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DATABASE_SSL === 'true' && {
      ssl: { rejectUnauthorized: false },
    }),
  });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id"            TEXT NOT NULL PRIMARY KEY,
        "name"          TEXT NOT NULL,
        "email"         TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "image"         TEXT,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "session" (
        "id"          TEXT NOT NULL PRIMARY KEY,
        "expiresAt"   TIMESTAMP NOT NULL,
        "token"       TEXT NOT NULL UNIQUE,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "ipAddress"   TEXT,
        "userAgent"   TEXT,
        "userId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "account" (
        "id"                     TEXT NOT NULL PRIMARY KEY,
        "accountId"              TEXT NOT NULL,
        "providerId"             TEXT NOT NULL,
        "userId"                 TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accessToken"            TEXT,
        "refreshToken"           TEXT,
        "idToken"                TEXT,
        "accessTokenExpiresAt"   TIMESTAMP,
        "refreshTokenExpiresAt"  TIMESTAMP,
        "scope"                  TEXT,
        "password"               TEXT,
        "createdAt"              TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"              TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "verification" (
        "id"         TEXT NOT NULL PRIMARY KEY,
        "identifier" TEXT NOT NULL,
        "value"      TEXT NOT NULL,
        "expiresAt"  TIMESTAMP NOT NULL,
        "createdAt"  TIMESTAMP DEFAULT now(),
        "updatedAt"  TIMESTAMP DEFAULT now()
      );

      -- admin plugin columns (idempotent)
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role"        TEXT;
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned"      BOOLEAN DEFAULT false;
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banReason"   TEXT;
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banExpires"  TIMESTAMP;
      ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonatedBy" TEXT;

      -- organization plugin tables (idempotent)
      CREATE TABLE IF NOT EXISTS "organization" (
        "id"        TEXT NOT NULL PRIMARY KEY,
        "name"      TEXT NOT NULL,
        "slug"      TEXT NOT NULL UNIQUE,
        "logo"      TEXT,
        "metadata"  TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "member" (
        "id"             TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
        "userId"         TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "role"           TEXT NOT NULL DEFAULT 'member',
        "createdAt"      TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "invitation" (
        "id"             TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
        "email"          TEXT NOT NULL,
        "role"           TEXT,
        "status"         TEXT NOT NULL DEFAULT 'pending',
        "teamId"         TEXT,
        "inviterId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "expiresAt"      TIMESTAMP NOT NULL,
        "createdAt"      TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "team" (
        "id"             TEXT NOT NULL PRIMARY KEY,
        "name"           TEXT NOT NULL,
        "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
        "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP
      );
      ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "activeOrganizationId" TEXT;
    `);
  } finally {
    await pool.end();
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

  // Create Better Auth tables if they don't exist
  await runBetterAuthMigrations();

  // Better Auth handles /api/auth/** — intercept before NestJS routing so the
  // full path (including /api/auth prefix) reaches the Better Auth handler.
  // We also answer CORS preflights here because NestJS CORS middleware runs
  // after this intercept and never sees these routes.
  const betterAuthHandler = toNodeHandler(auth);
  app.use((req: any, res: any, next: any) => {
    if (!req.url.startsWith('/api/auth')) return next();

    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type',
      );
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    return betterAuthHandler(req, res);
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new PostHogExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  if (isProd && !corsOrigin) {
    logger.warn(
      'CORS_ORIGIN is not set in production — defaulting to * which allows all origins. Set CORS_ORIGIN to your frontend URL.',
    );
  }

  // CORS_ORIGIN supports comma-separated values for multiple allowed origins
  // e.g. "https://app.cerebral.ca,https://cerebral.ca"
  const allowedOrigins = corsOrigin
    ? corsOrigin
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : null;

  app.enableCors({
    origin: allowedOrigins
      ? (origin, cb) => {
          // Allow same-origin (no Origin header) and listed origins
          if (!origin || allowedOrigins.includes(origin)) cb(null, true);
          else cb(new Error(`CORS: ${origin} not allowed`));
        }
      : isProd
        ? false
        : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Cerebral API running on http://localhost:${port}/api/v1`);

  process.on('SIGINT', async () => {
    await posthog.shutdown();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await posthog.shutdown();
    process.exit(0);
  });
}

bootstrap();

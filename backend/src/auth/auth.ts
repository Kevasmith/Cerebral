import { betterAuth } from 'better-auth';
import { bearer, admin, organization } from 'better-auth/plugins';
import { dash } from '@better-auth/infra';
import { Pool } from 'pg';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  appName: 'Cerebral',
  baseURL: process.env.BETTER_AUTH_BASE_URL || 'http://localhost:3000',
  trustedOrigins: [
    ...(process.env.CORS_ORIGIN || '').split(',').filter(Boolean),
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000',
    'https://www.better-auth.com',
    'https://better-auth.com',
  ],

  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DATABASE_SSL === 'true' && {
      ssl: { rejectUnauthorized: false },
    }),
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  experimental: {
    joins: true,
  },

  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for'],
    },
  },

  plugins: [
    bearer(),
    admin(),
    dash({ apiKey: process.env.BETTER_AUTH_API_KEY }),
    organization(),
  ],
});

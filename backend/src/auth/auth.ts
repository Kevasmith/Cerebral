import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { Pool } from 'pg';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_BASE_URL || 'http://localhost:3000',
  trustedOrigins: [
    ...(process.env.CORS_ORIGIN || '').split(',').filter(Boolean),
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000',
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

  plugins: [bearer()],
});

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
    'https://cerebral-production.up.railway.app',
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
    sendResetPassword: async ({ user, url }) => {
      // Log for Railway logs (always)
      console.log(`[PasswordReset] Reset link for ${user.email}: ${url}`);
      // Send via Resend if key is configured
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) return;
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Cerebral <no-reply@cerebral.app>',
            to: user.email,
            subject: 'Reset your Cerebral password',
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <h2 style="color:#0F172A">Reset your password</h2>
              <p style="color:#555">Click the link below to set a new password. This link expires in 1 hour.</p>
              <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0a9165;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a>
              <p style="color:#aaa;font-size:12px">If you didn't request this, ignore this email.</p>
            </div>`,
          }),
        });
      } catch (err) {
        console.error('[PasswordReset] Resend failed:', err);
      }
    },
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

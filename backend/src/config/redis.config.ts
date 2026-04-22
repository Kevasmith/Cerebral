import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  // Support REDIS_URL (Railway) or individual host/port vars
  url: process.env.REDIS_URL || null,
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  ttl: parseInt(process.env.REDIS_TTL ?? '300', 10) || 300,
}));

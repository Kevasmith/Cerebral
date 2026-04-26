import 'dotenv/config'; // must be first — loads .env before any entity decorator runs
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

  // Better Auth handles /api/auth/** — intercept before NestJS routing so the
  // full path (including /api/auth prefix) reaches the Better Auth handler
  const betterAuthHandler = toNodeHandler(auth);
  app.use((req: any, res: any, next: any) => {
    if (req.url.startsWith('/api/auth')) return betterAuthHandler(req, res);
    next();
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  if (isProd && !corsOrigin) {
    logger.warn('CORS_ORIGIN is not set in production — defaulting to * which allows all origins. Set CORS_ORIGIN to your frontend URL.');
  }

  app.enableCors({
    origin: corsOrigin ?? (isProd ? false : '*'),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Cerebral API running on http://localhost:${port}/api/v1`);
}

bootstrap();

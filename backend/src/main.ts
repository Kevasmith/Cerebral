import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

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
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Cerebral API running on http://localhost:${port}/api/v1`);
}

bootstrap();

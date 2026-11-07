import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  const { warnings } = validateEnv();
  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // За nginx/балансировщиком нужен trust proxy, иначе req.ip всегда = IP
  // прокси и rate limit/auth-cookie (secure) работают некорректно.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Статическая раздача загруженных изображений (см. UploadsModule).
  const uploadsDir = join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
    setHeaders: (res) => {
      // Запрещаем MIME-sniffing и выполнение любых активных форматов при
      // прямом переходе по ссылке на загруженный файл.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });

  // Корректно закрываем пул Prisma и завершаем текущие HTTP-ответы при
  // деплое/перезапуске, не обрывая соединения участников.
  app.enableShutdownHooks();

  const port = process.env.BACKEND_PORT || 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}
bootstrap();

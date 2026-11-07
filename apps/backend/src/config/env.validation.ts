/**
 * Fail-fast валидация переменных окружения.
 *
 * Вызывается до NestFactory.create(), чтобы приложение не стартовало
 * «наполовину настроенным» (например, с дефолтным localhost в проде или
 * без JWT_SECRET). Специально без внешних зависимостей: zod/joi здесь
 * избыточны, а лишний пакет в runtime не нужен.
 */
export interface EnvValidationResult {
  warnings: string[];
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function requireValue(errors: string[], key: string): void {
  const value = process.env[key];
  if (!value || !value.trim()) {
    errors.push(`${key} обязателен`);
  }
}

function validateUrl(errors: string[], key: string): void {
  const value = process.env[key];
  if (!value) return;
  try {
    new URL(value);
  } catch {
    errors.push(`${key} должен быть корректным URL`);
  }
}

export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const production = isProduction();

  requireValue(errors, 'DATABASE_URL');

  if (production) {
    requireValue(errors, 'JWT_SECRET');
    requireValue(errors, 'FRONTEND_URL');
    requireValue(errors, 'BACKEND_URL');
  } else {
    if (!process.env.JWT_SECRET) {
      warnings.push(
        'JWT_SECRET не задан — используется dev-секрет (недопустимо в production)',
      );
    }
    if (!process.env.FRONTEND_URL) {
      process.env.FRONTEND_URL = 'http://localhost:3000';
      warnings.push('FRONTEND_URL не задан — используется http://localhost:3000');
    }
    if (!process.env.BACKEND_URL) {
      process.env.BACKEND_URL = `http://localhost:${process.env.BACKEND_PORT || 4000}`;
      warnings.push(
        `BACKEND_URL не задан — используется ${process.env.BACKEND_URL}`,
      );
    }
  }

  validateUrl(errors, 'FRONTEND_URL');
  validateUrl(errors, 'BACKEND_URL');

  for (const [idKey, secretKey] of [
    ['VK_CLIENT_ID', 'VK_CLIENT_SECRET'],
    ['YANDEX_CLIENT_ID', 'YANDEX_CLIENT_SECRET'],
  ] as const) {
    const id = process.env[idKey];
    const secret = process.env[secretKey];
    if (Boolean(id) !== Boolean(secret)) {
      errors.push(`${idKey} и ${secretKey} должны быть заданы вместе`);
    }
    if (!id && !secret) {
      warnings.push(`${idKey}/${secretKey} не заданы — OAuth-провайдер отключён`);
    }
  }

  // S3/MinIO: либо всё, либо ничего. Иначе загрузки молча упадут в рантайме.
  const s3Keys = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'];
  const configuredS3 = s3Keys.filter((key) => Boolean(process.env[key]));
  if (configuredS3.length > 0 && configuredS3.length < s3Keys.length) {
    errors.push(`S3 настроен частично: заданы ${configuredS3.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(
      `Некорректная конфигурация окружения:\n- ${errors.join('\n- ')}`,
    );
  }

  return { warnings };
}

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Простой in-memory rate limiter для CPU-дорогих auth-эндпоинтов (bcrypt).
 *
 * Заменяет @nestjs/throttler, чтобы не добавлять зависимость и внешнее
 * хранилище: при горизонтальном масштабировании лимит становится
 * «на инстанс», что для защиты от единичного DoS-клиента достаточно
 * (а строгий глобальный лимит лучше выносить на nginx/API-gateway).
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly limit = Number(process.env.AUTH_RATE_LIMIT ?? 10);
  private readonly windowMs = Number(process.env.AUTH_RATE_WINDOW_MS ?? 60_000);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.clientKey(request);
    const now = Date.now();

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      this.prune(now);
      return true;
    }

    if (bucket.count >= this.limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Слишком много попыток. Попробуйте позже.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    return true;
  }

  private clientKey(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }

  /** Удаляет просроченные бакеты, чтобы Map не рос бесконечно. */
  private prune(now: number): void {
    if (this.buckets.size < 1000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

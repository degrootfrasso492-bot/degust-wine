import { randomBytes, timingSafeEqual } from 'crypto';
import type { CookieOptions, Response } from 'express';

export const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function secureCookie(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    (process.env.BACKEND_URL ?? '').startsWith('https://')
  );
}

/** Криптографически случайный state, привязанный к провайдеру. */
export function createOAuthState(provider: 'vk' | 'yandex'): string {
  return `${provider}.${randomBytes(32).toString('hex')}`;
}

export function setOAuthStateCookie(res: Response, state: string): void {
  const options: CookieOptions = {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_TTL_MS,
  };
  res.cookie(OAUTH_STATE_COOKIE, state, options);
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Проверяет state из callback против httpOnly-cookie.
 * Сравнение — постоянное по времени, чтобы не давать тайминг-оракул.
 */
export function verifyOAuthState(
  cookieValue: string | null,
  state: string | undefined,
  provider: 'vk' | 'yandex',
): boolean {
  if (!cookieValue || !state) return false;
  if (!state.startsWith(`${provider}.`)) return false;

  const expected = Buffer.from(cookieValue);
  const actual = Buffer.from(state);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

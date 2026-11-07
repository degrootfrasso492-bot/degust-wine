import type { CookieOptions, Response } from 'express';

/** Имя httpOnly-cookie с JWT. */
export const AUTH_COOKIE = 'degust_token';
/**
 * Несекретное зеркало роли. Нужно только клиентскому middleware (proxy.ts),
 * чтобы не показывать админку до гидратации. Все решения о доступе всё равно
 * принимает backend по JWT и данным пользователя из БД.
 */
export const ROLE_COOKIE = 'degust_role';

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieIsSecure(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    (process.env.BACKEND_URL ?? '').startsWith('https://')
  );
}

/** Разбирает `JWT_EXPIRES_IN` (`7d`, `12h`, `30m`, `60s`) в миллисекунды. */
export function getAuthCookieMaxAge(): number {
  const raw = (process.env.JWT_EXPIRES_IN ?? '').trim();
  const match = /^(\d+)\s*([smhd])$/i.exec(raw);
  if (!match) return DEFAULT_MAX_AGE_MS;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return value * multiplier;
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: cookieIsSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: getAuthCookieMaxAge(),
  };
}

/** Ставит httpOnly-cookie с токеном и читаемую клиентом cookie роли. */
export function setAuthCookies(res: Response, accessToken: string, role: string): void {
  res.cookie(AUTH_COOKIE, accessToken, baseCookieOptions());
  res.cookie(ROLE_COOKIE, role, {
    ...baseCookieOptions(),
    httpOnly: false,
  });
}

/** Удаляет обе auth-cookie. */
export function clearAuthCookies(res: Response): void {
  const options: CookieOptions = {
    httpOnly: true,
    secure: cookieIsSecure(),
    sameSite: 'lax',
    path: '/',
  };
  res.clearCookie(AUTH_COOKIE, options);
  res.clearCookie(ROLE_COOKIE, { ...options, httpOnly: false });
}

/** Достаёт значение cookie из сырого заголовка `Cookie`. */
export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

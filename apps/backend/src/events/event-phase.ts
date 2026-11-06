export enum EventPhase {
  UPCOMING = 'UPCOMING',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export const DEFAULT_EVENT_TIMEZONE = 'Europe/Moscow';

/**
 * Локальный день (YYYY-MM-DD) момента `date` в часовом поясе `timeZone`.
 * Бросает RangeError, если timezone невалидна.
 */
export function getLocalDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function resolveTimeZone(timeZone: string): string {
  try {
    getLocalDay(new Date(0), timeZone);
    return timeZone;
  } catch {
    return DEFAULT_EVENT_TIMEZONE;
  }
}

/**
 * Фаза дегустации. Приоритет правил:
 * 1. isClosed -> CLOSED
 * 2. isManuallyOpen -> OPEN
 * 3. локальный день «сейчас» < дня события -> UPCOMING
 * 4. дни равны -> OPEN
 * 5. день «сейчас» > дня события -> CLOSED
 *
 * Важно: event.date хранится в UTC. Дата без времени (YYYY-MM-DD) трактуется
 * как 00:00Z. Для часовых поясов с положительным смещением (например, РФ)
 * локальный день события совпадает с датой из строки, поэтому это корректно.
 * Для поясов с отрицательным смещением потребуется отдельная обработка.
 */
export function computeEventPhase(
  event: { date: Date; isClosed: boolean; isManuallyOpen: boolean; timezone: string },
  now: Date = new Date(),
): EventPhase {
  if (event.isClosed === true) return EventPhase.CLOSED;
  if (event.isManuallyOpen === true) return EventPhase.OPEN;

  const tz = resolveTimeZone(event.timezone);
  const today = getLocalDay(now, tz);
  const eventDay = getLocalDay(new Date(event.date), tz);

  if (today < eventDay) return EventPhase.UPCOMING;
  if (today === eventDay) return EventPhase.OPEN;
  return EventPhase.CLOSED;
}

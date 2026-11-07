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
 * Календарный день события в его часовом поясе.
 *
 * `event.date` создаётся как `new Date('YYYY-MM-DD')`, то есть UTC-полночь,
 * обозначающая выбранную администратором календарную дату. Если приводить
 * такую дату к локальному поясу (как раньше), для UTC-X (например,
 * America/New_York) 00:00Z попадает в предыдущий день, и фаза сдвигается.
 *
 * Поэтому для «полуночных» значений берём UTC-компоненты (это и есть
 * записанный календарный день), а для дат со временем — локальный день пояса.
 */
function getEventDay(date: Date, timeZone: string): string {
  const d = new Date(date);
  const isUtcMidnight =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;

  if (isUtcMidnight) {
    return d.toISOString().slice(0, 10);
  }
  return getLocalDay(d, timeZone);
}

/**
 * Фаза дегустации. Приоритет правил:
 * 1. isClosed -> CLOSED
 * 2. isManuallyOpen -> OPEN
 * 3. локальный день «сейчас» < дня события -> UPCOMING
 * 4. дни равны -> OPEN
 * 5. день «сейчас» > дня события -> CLOSED
 */
export function computeEventPhase(
  event: { date: Date; isClosed: boolean; isManuallyOpen: boolean; timezone: string },
  now: Date = new Date(),
): EventPhase {
  if (event.isClosed === true) return EventPhase.CLOSED;
  if (event.isManuallyOpen === true) return EventPhase.OPEN;

  const tz = resolveTimeZone(event.timezone);
  const today = getLocalDay(now, tz);
  const eventDay = getEventDay(new Date(event.date), tz);

  if (today < eventDay) return EventPhase.UPCOMING;
  if (today === eventDay) return EventPhase.OPEN;
  return EventPhase.CLOSED;
}

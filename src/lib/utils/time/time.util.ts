/** Local-calendar date math and human-readable relative times. */

import { activeLocale } from '../locale.util.ts';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local calendar key (`YYYY-MM-DD`), never UTC. */
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight for a `YYYY-MM-DD` key, or null when the key is invalid. */
export function parseLocalDateKey(key: string): Date | null {
  const match = DATE_PATTERN.exec(key);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Calendar-day math that keeps the time of day, so DST never slips it an hour. */
export function addLocalDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/** Local midnight N days from today, as an epoch timestamp. */
export function localDayStartFromNow(offsetDays = 0): number {
  return addLocalDays(startOfLocalDay(new Date()), offsetDays).getTime();
}

/** Shifts an epoch timestamp by whole local calendar days. */
export function shiftLocalDays(timestampMs: number, days: number): number {
  return addLocalDays(new Date(timestampMs), days).getTime();
}

/** Local midnight for a `YYYY-MM-DD` key, or null when the key is invalid. */
export function dateKeyToMs(key: string): number | null {
  return parseLocalDateKey(key)?.getTime() ?? null;
}

/** The next local midnight strictly after `nowMs`, as an epoch timestamp. */
export function nextLocalMidnightMs(nowMs: number): number {
  return addLocalDays(startOfLocalDay(new Date(nowMs)), 1).getTime();
}

/**
 * Relative "checked X ago" text. `now` exists so a ticking store can keep the
 * label moving; correctness never depends on it. The effective reference time
 * is floored to the real clock, so a window whose timers were throttled in the
 * tray can never render a past timestamp as future ("in 5 minutes"), and a
 * clock-skewed future timestamp clamps to "just now" instead of counting up.
 */
export function formatRelative(timestampMs: number, now = Date.now(), locale?: string): string {
  const reference = Math.max(now, Date.now());
  const diffSeconds = Math.min(0, Math.round((timestampMs - reference) / 1000));
  const magnitude = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(activeLocale(locale), { numeric: 'auto' });
  if (magnitude < 60) {
    return subMinuteText(diffSeconds, formatter, locale);
  }
  if (magnitude < 60 * 60) {
    return formatter.format(Math.round(diffSeconds / 60), 'minute');
  }
  if (magnitude < 24 * 60 * 60) {
    return formatter.format(Math.round(diffSeconds / 60 / 60), 'hour');
  }
  return formatter.format(Math.round(diffSeconds / 60 / 60 / 24), 'day');
}

/**
 * Under a minute the formatter's bare "now" reads frozen on screen, so a
 * zero-second check says "刚刚"/"Just now" and the ticking clock keeps the
 * label moving instead of pinning it to the moment of render.
 */
function subMinuteText(
  diffSeconds: number,
  formatter: Intl.RelativeTimeFormat,
  locale?: string,
): string {
  if (Math.round(diffSeconds) !== 0) {
    return formatter.format(diffSeconds, 'second');
  }
  const lang = (activeLocale(locale) ?? '').toLowerCase();
  if (lang.startsWith('zh')) {
    return /tw|hk|mo|hant/.test(lang) ? '剛剛' : '刚刚';
  }
  if (lang.startsWith('en')) {
    return 'Just now';
  }
  return formatter.format(-1, 'second');
}

import type { Locale } from './locale';

/** Presets offered by the export panel; custom uses two date inputs. */
export type ExportPreset = 'Today' | 'ThisWeek' | 'ThisMonth' | 'ThisYear' | 'Custom';

/** Local calendar range. `toMs` is exclusive, so the end day is included. */
export interface ExportRange {
  startDate: string;
  endDate: string;
  fromMs: number;
  toMs: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local calendar key (`YYYY-MM-DD`), never UTC. */
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Calendar-day math, so DST changes never slip the range by an hour. */
export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Local midnight N days from today, as an epoch timestamp. */
export function localDayStartFromNow(offsetDays = 0): number {
  return addLocalDays(startOfLocalDay(new Date()), offsetDays).getTime();
}

/** Shifts an epoch timestamp by whole local calendar days. */
export function shiftLocalDays(timestampMs: number, days: number): number {
  return addLocalDays(new Date(timestampMs), days).getTime();
}

function parseDateKey(key: string): Date | null {
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

/** Local midnight for a `YYYY-MM-DD` key, or null when the key is invalid. */
export function dateKeyToMs(key: string): number | null {
  return parseDateKey(key)?.getTime() ?? null;
}

/** Builds an inclusive range from two local dates; invalid input returns null. */
export function rangeFromDates(startDate: string, endDate: string): ExportRange | null {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  if (!start || !end || start.getTime() > end.getTime()) {
    return null;
  }
  return {
    startDate,
    endDate,
    fromMs: start.getTime(),
    toMs: addLocalDays(end, 1).getTime(),
  };
}

/** Resolves a preset up to today; `ThisWeek` starts on Monday. */
export function rangeForPreset(
  preset: Exclude<ExportPreset, 'Custom'>,
  now = new Date(),
): ExportRange {
  const today = startOfLocalDay(now);
  let start = today;
  switch (preset) {
    case 'ThisWeek':
      start = addLocalDays(today, -((today.getDay() + 6) % 7));
      break;
    case 'ThisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'ThisYear':
      start = new Date(today.getFullYear(), 0, 1);
      break;
    case 'Today':
      break;
  }
  const range = rangeFromDates(localDateKey(start), localDateKey(today));
  if (!range) {
    throw new Error('the current date could not be resolved');
  }
  return range;
}

/** Localized, compact range label for the workbook and the preview. */
export function formatRangeLabel(range: ExportRange, locale: Locale): string {
  const start = parseDateKey(range.startDate);
  const end = parseDateKey(range.endDate);
  if (!start || !end) {
    return `${range.startDate} – ${range.endDate}`;
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  if (range.startDate === range.endDate) {
    return formatter.format(start);
  }
  try {
    return formatter.formatRange(start, end);
  } catch {
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  }
}

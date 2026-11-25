import type { Locale } from '../locale.util.ts';
import {
  addLocalDays,
  localDateKey,
  parseLocalDateKey,
  startOfLocalDay,
} from '../time/time.util.ts';

/** Presets offered by the export panel; custom uses two date inputs. */
export type ExportPreset = 'Today' | 'ThisWeek' | 'ThisMonth' | 'ThisYear' | 'Custom';

/** Local calendar range. `toMs` is exclusive, so the end day is included. */
export interface ExportRange {
  startDate: string;
  endDate: string;
  fromMs: number;
  toMs: number;
}

/** Builds an inclusive range from two local dates; invalid input returns null. */
export function rangeFromDates(startDate: string, endDate: string): ExportRange | null {
  const start = parseLocalDateKey(startDate);
  const end = parseLocalDateKey(endDate);
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
  const start = parseLocalDateKey(range.startDate);
  const end = parseLocalDateKey(range.endDate);
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

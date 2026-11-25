import type { InsightsDay, InsightsPayload, InsightsRange } from '../../ipc/types.ts';
import { localDateKey } from '../time/time.util.ts';

export const HEATMAP_DAYS = 371;
const HEATMAP_COLUMNS = 53;

export interface HeatmapWeek {
  key: string;
  days: Array<InsightsDay | null>;
}

/** One intensity bucket per day; 0 is no focus, 4 is at least two hours. */
export function heatLevel(focusMs: number): 0 | 1 | 2 | 3 | 4 {
  if (focusMs <= 0) {
    return 0;
  }
  if (focusMs < 30 * 60_000) {
    return 1;
  }
  if (focusMs < 60 * 60_000) {
    return 2;
  }
  if (focusMs < 120 * 60_000) {
    return 3;
  }
  return 4;
}

/** Splits the fixed 371-day series into 53 columns of seven days. */
export function heatmapWeeks(days: InsightsDay[]): HeatmapWeek[] {
  const weeks: HeatmapWeek[] = [];
  for (let column = 0; column < HEATMAP_COLUMNS; column += 1) {
    const slice = days.slice(column * 7, column * 7 + 7);
    weeks.push({
      key: slice[0]?.date ?? `week-${column}`,
      days: Array.from({ length: 7 }, (_, index) => slice[index] ?? null),
    });
  }
  return weeks;
}

/** Width of a tag bar as a percentage of the largest tag. */
export function tagBarPercent(focusMs: number, largestMs: number): number {
  if (largestMs <= 0) {
    return 0;
  }
  return Math.max(2, Math.round((focusMs / largestMs) * 100));
}

function emptyDay(offsetDays: number): InsightsDay {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return { date: localDateKey(date), focusMs: 0, rounds: 0 };
}

/** A browser-preview payload so the layout can be inspected without Rust. */
export function emptyInsights(range: InsightsRange): InsightsPayload {
  const heatmap = Array.from({ length: HEATMAP_DAYS }, (_, index) =>
    emptyDay(HEATMAP_DAYS - 1 - index),
  );
  return {
    range,
    totals: { focusMs: 0, rounds: 0, streakDays: 0 },
    days: [],
    heatmap,
    tags: [],
  };
}

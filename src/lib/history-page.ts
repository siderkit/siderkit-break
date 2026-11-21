import type { HistoryDay, HistorySession } from './ipc/types';

export interface HistoryListItem {
  key: string;
  kind: 'day' | 'session';
  day: HistoryDay;
  session: HistorySession | null;
  height: number;
}

export interface HistoryLayout {
  items: HistoryListItem[];
  offsets: number[];
  totalHeight: number;
}

/** Flattens day groups into fixed-height items the virtual list can measure. */
export function buildHistoryLayout(
  days: HistoryDay[],
  dayHeight: number,
  rowHeight: number,
): HistoryLayout {
  const items: HistoryListItem[] = [];
  const offsets: number[] = [];
  let height = 0;

  for (const day of days) {
    offsets.push(height);
    items.push({
      key: `day:${day.date}`,
      kind: 'day',
      day,
      session: null,
      height: dayHeight,
    });
    height += dayHeight;

    for (const session of day.sessions) {
      offsets.push(height);
      items.push({
        key: `session:${session.id}`,
        kind: 'session',
        day,
        session,
        height: rowHeight,
      });
      height += rowHeight;
    }
  }

  return { items, offsets, totalHeight: height };
}

/** First item whose bottom edge is below `target`. */
export function firstItemEndingAfter(
  offsets: number[],
  totalHeight: number,
  target: number,
): number {
  let low = 0;
  let high = offsets.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const bottom = middle + 1 < offsets.length ? (offsets[middle + 1] ?? totalHeight) : totalHeight;
    if (bottom <= target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

/** First item that starts at or after `target`; the exclusive scroll end. */
function firstItemStartingAtOrAfter(offsets: number[], target: number): number {
  let low = 0;
  let high = offsets.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((offsets[middle] ?? Number.POSITIVE_INFINITY) < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

/** Scroll position used to decide which fixed-height items are mounted. */
export interface ViewportMetrics {
  scrollTop: number;
  viewportHeight: number;
  overscan: number;
}

/** Inclusive start and exclusive end of the items inside the viewport. */
export function visibleItemRange(
  offsets: number[],
  totalHeight: number,
  metrics: ViewportMetrics,
): { start: number; end: number } {
  if (offsets.length === 0 || totalHeight <= 0) {
    return { start: 0, end: 0 };
  }
  const top = Math.max(0, metrics.scrollTop - metrics.overscan);
  const bottom = Math.min(
    totalHeight,
    metrics.scrollTop + metrics.viewportHeight + metrics.overscan,
  );
  const start = firstItemEndingAfter(offsets, totalHeight, top);
  const end = firstItemStartingAtOrAfter(offsets, bottom);
  return { start, end: Math.max(start, end) };
}

/** Local midnight for a `YYYY-MM-DD` key, or null when the key is invalid. */
export { dateKeyToMs as dayStartMs } from './export-range.ts';

/** Merges newest-first day groups; a day appears once even across page edges. */
export function mergeHistoryDays(existing: HistoryDay[], incoming: HistoryDay[]): HistoryDay[] {
  const byDate = new Map<string, HistoryDay>();
  for (const group of existing) {
    byDate.set(group.date, group);
  }
  for (const group of incoming) {
    byDate.set(group.date, group);
  }
  return [...byDate.values()].sort((left, right) => (left.date < right.date ? 1 : -1));
}

/** Space above and below the rendered slice, in pixels. */
export function spacerHeights(
  layout: HistoryLayout,
  start: number,
  end: number,
): { before: number; after: number } {
  const before = layout.offsets[start] ?? layout.totalHeight;
  const after =
    end < layout.offsets.length
      ? layout.totalHeight - (layout.offsets[end] ?? layout.totalHeight)
      : 0;
  return { before, after };
}

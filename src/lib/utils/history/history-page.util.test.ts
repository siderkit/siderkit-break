import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { HistoryDay } from '../../ipc/types.ts';
import { dateKeyToMs } from '../time/time.util.ts';
import {
  buildHistoryLayout,
  firstItemEndingAfter,
  mergeHistoryDays,
  spacerHeights,
  visibleItemRange,
} from './history-page.util.ts';

const TODAY = '2026-11-21';
const YESTERDAY = '2026-11-20';
const OLDER = '2026-11-19';

function day(date: string, count: number): HistoryDay {
  return {
    date,
    completedFocus: 0,
    focusMs: 0,
    completedCountdown: 0,
    countdownMs: 0,
    breakCount: 0,
    breakMs: 0,
    sessions: Array.from({ length: count }, (_, index) => ({
      id: `${date}-${index}`,
      kind: 'Focus',
      startedAtMs: index,
      endedAtMs: index + 1,
      plannedMs: 1,
      actualMs: 1,
      outcome: 'Completed',
      interruptions: 0,
    })),
  };
}

test('the layout flattens days and sessions with cumulative offsets', () => {
  const layout = buildHistoryLayout([day(TODAY, 2), day(YESTERDAY, 1)], 50, 30);
  assert.equal(layout.items.length, 5);
  assert.deepEqual(layout.offsets, [0, 50, 80, 110, 160]);
  assert.equal(layout.totalHeight, 190);
  assert.equal(layout.items[0]?.kind, 'day');
  assert.equal(layout.items[1]?.kind, 'session');
  assert.equal(layout.items[3]?.kind, 'day');
});

test('the visible range includes overscan and partial rows', () => {
  const layout = buildHistoryLayout([day(TODAY, 2), day(YESTERDAY, 2)], 50, 30);
  assert.deepEqual(
    visibleItemRange(layout.offsets, layout.totalHeight, {
      scrollTop: 0,
      viewportHeight: 60,
      overscan: 0,
    }),
    { start: 0, end: 2 },
  );
  assert.deepEqual(
    visibleItemRange(layout.offsets, layout.totalHeight, {
      scrollTop: 100,
      viewportHeight: 40,
      overscan: 0,
    }),
    { start: 2, end: 4 },
  );
  assert.deepEqual(
    visibleItemRange(layout.offsets, layout.totalHeight, {
      scrollTop: 0,
      viewportHeight: 60,
      overscan: 30,
    }),
    { start: 0, end: 3 },
  );
});

test('the range is empty when there is nothing to show', () => {
  assert.deepEqual(visibleItemRange([], 0, { scrollTop: 0, viewportHeight: 100, overscan: 20 }), {
    start: 0,
    end: 0,
  });
});

test('binary search finds the first item crossing a target', () => {
  const layout = buildHistoryLayout([day(TODAY, 2)], 50, 30);
  assert.equal(firstItemEndingAfter(layout.offsets, layout.totalHeight, 0), 0);
  assert.equal(firstItemEndingAfter(layout.offsets, layout.totalHeight, 50), 1);
  assert.equal(firstItemEndingAfter(layout.offsets, layout.totalHeight, 109), 2);
  assert.equal(firstItemEndingAfter(layout.offsets, layout.totalHeight, 110), 3);
});

test('spacers preserve the full scroll height around the rendered slice', () => {
  const layout = buildHistoryLayout([day(TODAY, 2), day(YESTERDAY, 2)], 50, 30);
  assert.deepEqual(spacerHeights(layout, 0, 2), { before: 0, after: 140 });
  assert.deepEqual(spacerHeights(layout, 2, 4), { before: 80, after: 60 });
  assert.deepEqual(spacerHeights(layout, 0, layout.items.length), { before: 0, after: 0 });
});

test('merging pages keeps one newest-first group per date', () => {
  const merged = mergeHistoryDays(
    [day(TODAY, 1), day(YESTERDAY, 2)],
    [day(YESTERDAY, 3), day(OLDER, 1)],
  );
  assert.deepEqual(
    merged.map((group) => group.date),
    [TODAY, YESTERDAY, OLDER],
  );
  assert.equal(merged[1]?.sessions.length, 3);
});

test('day keys resolve to local midnight and reject impossible dates', () => {
  assert.equal(dateKeyToMs(TODAY), new Date(2026, 10, 21).getTime());
  assert.equal(dateKeyToMs('2026-02-30'), null);
  assert.equal(dateKeyToMs('21-11-2026'), null);
});

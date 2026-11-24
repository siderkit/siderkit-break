import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HEATMAP_DAYS,
  emptyInsights,
  heatLevel,
  heatmapWeeks,
  tagBarPercent,
} from './insights.util.ts';
import { localDateKey } from '../format.util.ts';

test('heatLevel buckets the day by focused time', () => {
  assert.equal(heatLevel(0), 0);
  assert.equal(heatLevel(-1), 0);
  assert.equal(heatLevel(1), 1);
  assert.equal(heatLevel(30 * 60_000 - 1), 1);
  assert.equal(heatLevel(30 * 60_000), 2);
  assert.equal(heatLevel(60 * 60_000 - 1), 2);
  assert.equal(heatLevel(60 * 60_000), 3);
  assert.equal(heatLevel(120 * 60_000 - 1), 3);
  assert.equal(heatLevel(120 * 60_000), 4);
  assert.equal(heatLevel(4 * 60 * 60_000), 4);
});

test('heatmapWeeks pads the last partial column with nulls', () => {
  const days = [
    { date: '2026-01-01', focusMs: 0, rounds: 0 },
    { date: '2026-01-02', focusMs: 0, rounds: 0 },
  ];
  const weeks = heatmapWeeks(days);
  assert.equal(weeks.length, 53);
  assert.equal(weeks[0]?.key, '2026-01-01');
  assert.deepEqual(
    weeks[0]?.days.slice(0, 2).map((day) => day?.date),
    ['2026-01-01', '2026-01-02'],
  );
  assert.equal(weeks[0]?.days[2], null);
  assert.equal(weeks[1]?.key, 'week-1');
  assert.equal(weeks[52]?.key, 'week-52');
});

test('heatmapWeeks keeps every column at exactly seven slots', () => {
  const days = Array.from({ length: HEATMAP_DAYS }, (_, index) => ({
    date: `d${index}`,
    focusMs: 0,
    rounds: 0,
  }));
  const weeks = heatmapWeeks(days);
  assert.equal(weeks.length, 53);
  for (const week of weeks) {
    assert.equal(week.days.length, 7);
    assert.ok(week.days.every((day) => day !== null));
  }
  assert.equal(weeks[52]?.days[6]?.date, 'd370');
});

test('tagBarPercent scales against the largest tag with a floor', () => {
  assert.equal(tagBarPercent(60_000, 60_000), 100);
  assert.equal(tagBarPercent(15_000, 60_000), 25);
  assert.equal(tagBarPercent(1_000, 60_000), 2);
  assert.equal(tagBarPercent(0, 60_000), 2);
  assert.equal(tagBarPercent(1_000, 0), 0);
  assert.equal(tagBarPercent(1_000, -5), 0);
});

test('emptyInsights previews the layout with a full 371-day heatmap', () => {
  const today = localDateKey(new Date());
  const payload = emptyInsights('week');
  assert.equal(payload.range, 'week');
  assert.deepEqual(payload.totals, { focusMs: 0, rounds: 0, streakDays: 0 });
  assert.deepEqual(payload.days, []);
  assert.deepEqual(payload.tags, []);
  assert.equal(payload.heatmap.length, HEATMAP_DAYS);
  assert.equal(payload.heatmap.at(-1)?.date, today);
  assert.ok(payload.heatmap[0] && payload.heatmap[0].date !== today);
  assert.ok(payload.heatmap.every((day) => day.focusMs === 0 && day.rounds === 0));
});

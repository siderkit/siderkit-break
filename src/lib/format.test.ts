import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatClock,
  formatDateHeading,
  formatFullDate,
  formatMinutes,
  formatTimeWithSeconds,
} from './format.ts';

test('formatClock uses MM:SS below one hour', () => {
  assert.equal(formatClock(0), '00:00');
  assert.equal(formatClock(1_500), '00:02');
  assert.equal(formatClock(59 * 60_000), '59:00');
  assert.equal(formatClock(59 * 60_000 + 59_000), '59:59');
});

test('formatClock switches to HH:MM:SS at one hour', () => {
  assert.equal(formatClock(60 * 60_000), '01:00:00');
  assert.equal(formatClock(90 * 60_000), '01:30:00');
  assert.equal(formatClock(120 * 60_000), '02:00:00');
  assert.equal(formatClock(24 * 60 * 60_000), '24:00:00');
});

test('formatClock never shows a negative time', () => {
  assert.equal(formatClock(-5_000), '00:00');
});

test('formatClock rounds partial seconds up so the last second stays visible', () => {
  assert.equal(formatClock(999), '00:01');
  assert.equal(formatClock(1_001), '00:02');
});

test('formatMinutes rounds accumulated time to whole minutes', () => {
  assert.equal(formatMinutes(0), 0);
  assert.equal(formatMinutes(59_000), 1);
  assert.equal(formatMinutes(25 * 60_000), 25);
});

test('formatFullDate always keeps the year', () => {
  assert.equal(formatFullDate('2026-11-20', 'en'), 'November 20, 2026');
});

test('a day heading keeps the year, including today', () => {
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const heading = formatDateHeading(key, 'en');
  assert.equal(heading.includes('Today'), true);
  assert.equal(heading.includes(String(today.getFullYear())), true);
  assert.equal(formatDateHeading('2026-11-20', 'en').includes('2026'), true);
});

test('formatTimeWithSeconds keeps hours, minutes, and seconds', () => {
  assert.match(formatTimeWithSeconds(0, 'en'), /\d{2}:\d{2}:\d{2}/);
});

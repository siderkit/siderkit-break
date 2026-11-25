import assert from 'node:assert/strict';
import { test, vi } from 'vitest';

import {
  addLocalDays,
  dateKeyToMs,
  formatRelative,
  localDateKey,
  nextLocalMidnightMs,
  parseLocalDateKey,
  shiftLocalDays,
} from './time.util.ts';

test('date keys round-trip through local calendar days', () => {
  assert.equal(localDateKey(new Date(2026, 10, 25, 13, 45)), '2026-11-25');
  assert.equal(parseLocalDateKey('2026-11-25')?.getTime(), new Date(2026, 10, 25).getTime());
  assert.equal(dateKeyToMs('2026-11-25'), new Date(2026, 10, 25).getTime());
});

test('invalid date keys resolve to null instead of rolling over', () => {
  assert.equal(parseLocalDateKey('2026-02-30'), null);
  assert.equal(parseLocalDateKey('not-a-date'), null);
  assert.equal(dateKeyToMs('2026-02-30'), null);
});

test('day math crosses month and year boundaries without slipping', () => {
  assert.equal(addLocalDays(new Date(2026, 0, 31), 1).getTime(), new Date(2026, 1, 1).getTime());
  assert.equal(
    addLocalDays(new Date(2026, 11, 31, 8), 1).getTime(),
    new Date(2027, 0, 1, 8).getTime(),
  );
  assert.equal(
    shiftLocalDays(new Date(2026, 0, 31, 23, 59).getTime(), 1),
    new Date(2026, 1, 1, 23, 59).getTime(),
  );
});

test('the next midnight after a timestamp is the following local day', () => {
  const nextMidnight = new Date(2026, 10, 26).getTime();
  assert.equal(nextLocalMidnightMs(new Date(2026, 10, 25, 15, 30).getTime()), nextMidnight);
  assert.equal(nextLocalMidnightMs(new Date(2026, 10, 25).getTime()), nextMidnight);
});

/**
 * Pins the real clock to a fixture timestamp: `formatRelative` floors its
 * reference to `Date.now()`, so a historical fixture must freeze the clock
 * too or the floor would win and turn every diff into thousands of days.
 */
function withFrozenClock(now: number, run: () => void): void {
  vi.useFakeTimers({ now, toFake: ['Date'] });
  try {
    run();
  } finally {
    vi.useRealTimers();
  }
}

test('a recent check reads as a relative time', () => {
  const now = 1_700_000_000_000;
  withFrozenClock(now, () => {
    assert.equal(formatRelative(now - 5 * 60_000, now, 'en'), '5 minutes ago');
    assert.equal(formatRelative(now - 3 * 60 * 60_000, now, 'en'), '3 hours ago');
  });
});

test('a fresh check reads as just now and keeps moving', () => {
  const now = 1_700_000_000_000;
  withFrozenClock(now, () => {
    assert.equal(formatRelative(now, now, 'en'), 'Just now');
    assert.equal(formatRelative(now, now, 'zh-CN'), '刚刚');
    assert.equal(formatRelative(now, now, 'zh-TW'), '剛剛');
    assert.equal(formatRelative(now - 30_000, now, 'en'), '30 seconds ago');
  });
});

test('larger gaps fall back to hours and days', () => {
  const now = 1_700_000_000_000;
  withFrozenClock(now, () => {
    // numeric:'auto' spells a single trailing day "yesterday"; 90 minutes
    // rounds toward zero on the past side, reading as "1 hour ago".
    assert.equal(formatRelative(now - 25 * 60 * 60_000, now, 'en'), 'yesterday');
    assert.equal(formatRelative(now - 90 * 60_000, now, 'en'), '1 hour ago');
    assert.equal(formatRelative(now - 3 * 24 * 60 * 60_000, now, 'en'), '3 days ago');
  });
});

test('unsupported locales fall back to the formatter seconds text', () => {
  const now = 1_700_000_000_000;
  withFrozenClock(now, () => {
    // A locale with no hand-written "just now" uses the formatter directly.
    assert.doesNotThrow(() => formatRelative(now, now, 'fr'));
  });
});

test('a past check never reads as future time, even with a stale clock', () => {
  // The tray window can freeze the 30 s clock while the Rust scheduler keeps
  // advancing last-checked; the label must still read as past time.
  const realNow = 1_700_000_000_000;
  const lastChecked = realNow - 5 * 60_000;
  const staleNow = realNow - 10 * 60_000;
  withFrozenClock(realNow, () => {
    assert.equal(formatRelative(lastChecked, staleNow, 'en'), '5 minutes ago');
    assert.equal(formatRelative(lastChecked, staleNow, 'zh-CN'), '5分钟前');
  });
});

test('a clock-skewed future timestamp degrades to just now, never counts up', () => {
  const now = 1_700_000_000_000;
  const skewed = now + 7 * 60_000;
  withFrozenClock(now, () => {
    assert.equal(formatRelative(skewed, now, 'en'), 'Just now');
    assert.equal(formatRelative(skewed, now, 'zh-CN'), '刚刚');
  });
});

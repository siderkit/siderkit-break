import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { clockStore } from './clock.store.svelte.ts';

// A late evening so a single tick can cross midnight in the rollover test.
const BASE = new Date(2026, 10, 25, 23, 30, 0).getTime();

beforeEach(() => {
  vi.useFakeTimers({ now: BASE });
});

afterEach(() => {
  clockStore.stop();
  Reflect.deleteProperty(document, 'hidden');
  vi.useRealTimers();
});

test('the tick keeps now moving and the day key follows the local calendar', () => {
  clockStore.start();
  expect(clockStore.dayKey).toBe('2026-11-25');
  vi.advanceTimersByTime(30_000);
  expect(clockStore.now).toBe(BASE + 30_000);
  expect(clockStore.dayKey).toBe('2026-11-25');
});

test('a shown window catches up through visibilitychange without a tick', () => {
  clockStore.start();
  // Under the 30 s tick a short advance stays invisible until catch-up runs.
  vi.advanceTimersByTime(10_000);
  expect(clockStore.now).toBe(BASE);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(clockStore.now).toBe(BASE + 10_000);
});

test('a hidden window skips the catch-up', () => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  clockStore.start();
  vi.advanceTimersByTime(10_000);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(clockStore.now).toBe(BASE);
});

test('stop tears the ticker and listeners down', () => {
  clockStore.start();
  clockStore.stop();
  vi.advanceTimersByTime(60_000);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(clockStore.now).toBe(BASE);
});

test('crossing local midnight fires onDayChange once per day', () => {
  const seen: string[] = [];
  const unlisten = clockStore.onDayChange((key) => seen.push(key));
  clockStore.start();
  vi.advanceTimersByTime(45 * 60_000);
  expect(seen).toEqual(['2026-11-26']);
  vi.advanceTimersByTime(24 * 60 * 60_000);
  expect(seen).toEqual(['2026-11-26', '2026-11-27']);
  unlisten();
});

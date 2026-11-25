import { beforeEach, expect, test, vi } from 'vitest';

import type { HistoryDay } from '../ipc/types';
import { dateKeyToMs, shiftLocalDays } from '../utils/time/time.util';
import { HistoryListState, PAGE_DAYS } from './history-list.store.svelte.ts';

const ipc = vi.hoisted(() => ({
  isTauri: true,
  getHistoryWindow: vi.fn<() => Promise<{ days: HistoryDay[]; hasMore: boolean }>>(),
}));
vi.mock('../ipc/client', () => ipc);

function day(date: string): HistoryDay {
  return {
    date,
    completedFocus: 1,
    focusMs: 60_000,
    completedCountdown: 0,
    countdownMs: 0,
    breakCount: 0,
    breakMs: 0,
    sessions: [
      {
        id: `${date}-focus`,
        kind: 'Focus',
        startedAtMs: 0,
        endedAtMs: 60_000,
        plannedMs: 60_000,
        actualMs: 60_000,
        outcome: 'Completed',
        interruptions: 0,
      },
    ],
  };
}

const fresh = () => new HistoryListState(() => undefined);

const NEWEST_DAY = '2026-10-15';

beforeEach(() => {
  ipc.isTauri = true;
  ipc.getHistoryWindow.mockReset();
});

test('loadLatest skips empty recent months instead of a blank feed', async () => {
  ipc.getHistoryWindow
    .mockResolvedValueOnce({ days: [], hasMore: true })
    .mockResolvedValueOnce({ days: [day(NEWEST_DAY)], hasMore: false });
  const list = fresh();
  await list.loadLatest();
  expect(ipc.getHistoryWindow).toHaveBeenCalledTimes(2);
  expect(list.days.map((entry) => entry.date)).toEqual([NEWEST_DAY]);
  expect(list.hasMore).toBe(false);
  expect(list.loading).toBe(false);
  expect(list.loadError).toBeNull();
});

test('loadLatest surfaces IPC failures without pretending success', async () => {
  ipc.getHistoryWindow.mockRejectedValueOnce(new Error('offline'));
  const list = fresh();
  await list.loadLatest();
  expect(list.loadError).toBe('offline');
  expect(list.loading).toBe(false);
});

test('loadOlder pages back from the oldest visible day', async () => {
  ipc.getHistoryWindow.mockResolvedValueOnce({ days: [day('2026-08-30')], hasMore: false });
  const list = fresh();
  // A fresh store boots in its loading state; loadOlder refuses to run then.
  list.loading = false;
  list.days = [day(NEWEST_DAY), day('2026-09-20')];
  list.hasMore = true;
  await list.loadOlder();
  const oldest = dateKeyToMs('2026-09-20');
  expect(ipc.getHistoryWindow).toHaveBeenCalledWith(shiftLocalDays(oldest!, -PAGE_DAYS), oldest);
  expect(list.days.map((entry) => entry.date)).toEqual([NEWEST_DAY, '2026-09-20', '2026-08-30']);
  expect(list.hasMore).toBe(false);
});

test('loadOlder refuses to run without more pages', async () => {
  const list = fresh();
  list.hasMore = false;
  await list.loadOlder();
  expect(ipc.getHistoryWindow).not.toHaveBeenCalled();
});

test('loadOlder keeps the feed intact on failure', async () => {
  ipc.getHistoryWindow.mockRejectedValueOnce(new Error('offline'));
  const list = fresh();
  list.loading = false;
  list.days = [day(NEWEST_DAY)];
  list.hasMore = true;
  await list.loadOlder();
  expect(list.loadError).toBe('offline');
  expect(list.days.map((entry) => entry.date)).toEqual([NEWEST_DAY]);
});

test('applyTag edits a session in place without refetching', () => {
  const list = fresh();
  list.days = [day(NEWEST_DAY)];
  const session = list.days[0]!.sessions[0]!;
  list.applyTag(session.id, 'deep work');
  expect(list.days[0]!.sessions[0]!.tag).toBe('deep work');
});

test('the browser preview loads an empty feed', async () => {
  ipc.isTauri = false;
  const list = fresh();
  await list.loadLatest();
  expect(ipc.getHistoryWindow).not.toHaveBeenCalled();
  expect(list.days).toEqual([]);
  expect(list.hasMore).toBe(false);
  expect(list.loading).toBe(false);
});

test('loadOlder refuses to run on an empty feed', async () => {
  const list = fresh();
  list.loading = false;
  list.days = [];
  list.hasMore = true;
  await list.loadOlder();
  expect(ipc.getHistoryWindow).not.toHaveBeenCalled();
});

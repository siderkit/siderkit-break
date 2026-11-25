import { beforeEach, expect, test, vi } from 'vitest';

import type { InsightsPayload } from '../ipc/types';
import { emptyInsights } from '../utils/insights/insights.util';
import { insightsStore } from './insights.store.svelte.ts';

const ipc = vi.hoisted(() => ({
  isTauri: true,
  getInsights: vi.fn<() => Promise<InsightsPayload>>(),
}));
vi.mock('../ipc/client', () => ipc);

beforeEach(() => {
  ipc.isTauri = true;
  ipc.getInsights.mockReset();
  ipc.getInsights.mockResolvedValue(emptyInsights('week'));
});

test('load stores the payload for the requested range', async () => {
  ipc.getInsights.mockResolvedValueOnce(emptyInsights('month'));
  await insightsStore.load('month');
  expect(ipc.getInsights).toHaveBeenCalledWith('month');
  expect(insightsStore.payload?.range).toBe('month');
  expect(insightsStore.loading).toBe(false);
  expect(insightsStore.error).toBeNull();
});

test('a stale response never overwrites the newer payload', async () => {
  let releaseFirst!: (value: InsightsPayload) => void;
  const first = new Promise<InsightsPayload>((resolve) => {
    releaseFirst = resolve;
  });
  ipc.getInsights.mockImplementationOnce(() => first);
  ipc.getInsights.mockResolvedValueOnce(emptyInsights('today'));
  const slow = insightsStore.load('month');
  const fast = insightsStore.load('today');
  releaseFirst(emptyInsights('month'));
  await Promise.all([slow, fast]);
  expect(insightsStore.payload?.range).toBe('today');
});

test('a failed load surfaces the message and stops loading', async () => {
  ipc.getInsights.mockRejectedValueOnce(new Error('bridge down'));
  await insightsStore.load('year');
  expect(insightsStore.error).toBe('bridge down');
  expect(insightsStore.loading).toBe(false);
});

test('select skips a reload when the payload is already current', async () => {
  await insightsStore.load('week');
  ipc.getInsights.mockClear();
  insightsStore.select('week');
  expect(ipc.getInsights).not.toHaveBeenCalled();
  insightsStore.select('today');
  expect(ipc.getInsights).toHaveBeenCalledTimes(1);
  expect(insightsStore.range).toBe('today');
});

test('refresh reloads the visible range', async () => {
  await insightsStore.load('month');
  ipc.getInsights.mockClear();
  await insightsStore.refresh();
  expect(ipc.getInsights).toHaveBeenCalledWith('month');
});

test('the browser preview shows the empty payload without IPC', async () => {
  ipc.isTauri = false;
  await insightsStore.load('today');
  expect(ipc.getInsights).not.toHaveBeenCalled();
  expect(insightsStore.payload?.range).toBe('today');
  expect(insightsStore.loading).toBe(false);
});

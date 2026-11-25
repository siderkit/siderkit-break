import { beforeEach, expect, test, vi } from 'vitest';

import { clockStore } from './clock.store.svelte.ts';
import { updateStore } from './update.store.svelte.ts';

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(async () => '1.0.1'),
}));

const BASE = new Date(2026, 10, 25, 23, 30, 0).getTime();

const ipc = vi.hoisted(() => ({
  isTauri: true,
  getVersion: vi.fn(async () => '1.0.1'),
  getUpdateStatus: vi.fn(async () => ({
    supported: true,
    phase: 'Idle',
    version: null,
    notes: null,
    pubDate: null,
    downloaded: 0,
    total: null,
    lastCheckedMs: null,
    lastError: null,
    prompt: false,
    autoCheck: true,
    skippedVersion: null,
    snoozeUntilMs: null,
  })),
  onUpdateStatus: vi.fn(async () => () => {}),
  checkForUpdate: vi.fn(async () => ({})),
  downloadUpdate: vi.fn(async () => ({})),
  cancelUpdateDownload: vi.fn(async () => ({})),
  installUpdate: vi.fn(async () => {}),
  skipUpdateVersion: vi.fn(async () => ({})),
  snoozeUpdate: vi.fn(async () => ({})),
  clearSkippedUpdate: vi.fn(async () => ({})),
}));
vi.mock('../ipc/client', () => ipc);

beforeEach(() => {
  vi.useFakeTimers({ now: BASE });
});

test('now is a live read of the shared clock', () => {
  clockStore.start();
  expect(updateStore.now).toBe(BASE);
  vi.advanceTimersByTime(30_000);
  expect(updateStore.now).toBe(BASE + 30_000);
});

test('init wires version and status without owning a clock', async () => {
  await updateStore.init();
  expect(updateStore.currentVersion).toBe('1.0.1');
  expect(updateStore.status?.phase).toBe('Idle');
  // Whatever moves now must be the shared clock: both reads stay identical.
  vi.advanceTimersByTime(30_000);
  expect(updateStore.now).toBe(clockStore.now);
});

test('init runs only once', async () => {
  updateStore.destroy();
  ipc.getUpdateStatus.mockClear();
  await updateStore.init();
  await updateStore.init();
  expect(ipc.getUpdateStatus).toHaveBeenCalledTimes(1);
});

test('destroy lets init subscribe again', async () => {
  updateStore.destroy();
  ipc.getUpdateStatus.mockClear();
  await updateStore.init();
  expect(ipc.getUpdateStatus).toHaveBeenCalledTimes(1);
});

const baseStatus = {
  supported: true,
  phase: 'Idle',
  version: null,
  notes: null,
  pubDate: null,
  downloaded: 0,
  total: null,
  lastCheckedMs: null,
  lastError: null,
  prompt: false,
  autoCheck: true,
  skippedVersion: null,
  snoozeUntilMs: null,
};

test('visible gates by phase, prompt, and dismissal', async () => {
  await updateStore.init();
  expect(updateStore.visible).toBe(false);
  updateStore.status = { ...baseStatus, phase: 'Available', version: '1.0.2', prompt: true };
  expect(updateStore.visible).toBe(true);
  expect(updateStore.badgeVisible).toBe(true);
  updateStore.dismiss();
  expect(updateStore.dismissedVersion).toBe('1.0.2');
  expect(updateStore.visible).toBe(false);
  updateStore.dismissedVersion = null;
  updateStore.status = { ...baseStatus, phase: 'Downloading', prompt: false };
  expect(updateStore.visible).toBe(true);
  expect(updateStore.badgeVisible).toBe(false);
  updateStore.status = { ...baseStatus, phase: 'Failed', version: '1.0.2' };
  expect(updateStore.visible).toBe(true);
});

test('actions route to their commands', async () => {
  await updateStore.init();
  await updateStore.checkNow();
  expect(ipc.checkForUpdate).toHaveBeenCalledWith(true);
  await updateStore.download();
  expect(ipc.downloadUpdate).toHaveBeenCalledTimes(1);
  await updateStore.cancel();
  expect(ipc.cancelUpdateDownload).toHaveBeenCalledTimes(1);
  updateStore.act('Restart');
  updateStore.act('Download');
  await vi.waitFor(() => expect(ipc.installUpdate).toHaveBeenCalledTimes(1));
  await vi.waitFor(() => expect(ipc.downloadUpdate).toHaveBeenCalledTimes(2));
});

test('later snoozes a day, skip stores the version', async () => {
  await updateStore.later();
  expect(ipc.snoozeUpdate).toHaveBeenCalledWith(24);
  // later() mirrors its result into status; give skip a version to store.
  updateStore.status = { ...baseStatus, version: '1.0.2' };
  await updateStore.skip();
  expect(ipc.skipUpdateVersion).toHaveBeenCalledWith('1.0.2');
  await updateStore.restoreSkipped();
  expect(ipc.clearSkippedUpdate).toHaveBeenCalledTimes(1);
});

test('a failed versionless skip does nothing', async () => {
  updateStore.status = { ...baseStatus, version: null };
  await updateStore.skip();
  expect(ipc.skipUpdateVersion).not.toHaveBeenCalled();
});

test('errors surface and clear', async () => {
  updateStore.fail(new Error('boom'));
  expect(updateStore.error).toBe('boom');
  updateStore.clearError();
  expect(updateStore.error).toBeNull();
});

test('act routes the check and cancel actions', async () => {
  await updateStore.init();
  ipc.checkForUpdate.mockClear();
  ipc.cancelUpdateDownload.mockClear();
  updateStore.act('Check');
  await vi.waitFor(() => expect(ipc.checkForUpdate).toHaveBeenCalledTimes(1));
  updateStore.act('Cancel');
  await vi.waitFor(() => expect(ipc.cancelUpdateDownload).toHaveBeenCalledTimes(1));
});

test('retry re-runs the step that last failed', async () => {
  ipc.checkForUpdate.mockClear();
  ipc.downloadUpdate.mockClear();
  ipc.installUpdate.mockClear();
  updateStore.status = { ...baseStatus, lastError: 'download' };
  updateStore.act('Retry');
  await vi.waitFor(() => expect(ipc.downloadUpdate).toHaveBeenCalledTimes(1));
  updateStore.status = { ...baseStatus, lastError: 'install' };
  updateStore.act('Retry');
  await vi.waitFor(() => expect(ipc.installUpdate).toHaveBeenCalledTimes(1));
  updateStore.status = { ...baseStatus, lastError: null };
  updateStore.act('Retry');
  await vi.waitFor(() => expect(ipc.checkForUpdate).toHaveBeenCalledTimes(1));
});

test('a failed command surfaces the error', async () => {
  ipc.checkForUpdate.mockClear();
  ipc.checkForUpdate.mockRejectedValueOnce(new Error('offline'));
  await updateStore.checkNow();
  expect(updateStore.error).toBe('offline');
});

test('a new version re-shows a dismissed banner', async () => {
  updateStore.destroy();
  let emitStatus: (value: typeof baseStatus) => void = () => {};
  ipc.onUpdateStatus.mockImplementationOnce(async (handler) => {
    emitStatus = handler;
    return unlisten;
  });
  await updateStore.init();
  updateStore.status = { ...baseStatus, phase: 'Available', version: '1.0.2', prompt: true };
  updateStore.dismiss();
  expect(updateStore.visible).toBe(false);
  emitStatus({ ...baseStatus, phase: 'Available', version: '1.0.3', prompt: true });
  expect(updateStore.dismissedVersion).toBeNull();
  expect(updateStore.visible).toBe(true);
});

test('phases without prompts stay hidden and badge needs a visible banner', async () => {
  await updateStore.init();
  updateStore.status = { ...baseStatus, phase: 'Checking', prompt: true };
  expect(updateStore.visible).toBe(false);
  updateStore.status = null;
  expect(updateStore.badgeVisible).toBe(false);
});

test('unknown actions are ignored', () => {
  updateStore.act('None');
  expect(ipc.checkForUpdate).not.toHaveBeenCalled();
});

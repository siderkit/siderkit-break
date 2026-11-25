import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type { Settings, TimerSnapshot } from '../ipc/types';
import { clockStore } from './clock.store.svelte.ts';
import { timerStore } from './timer.store.svelte.ts';

const BASE = new Date(2026, 10, 25, 23, 30, 0).getTime();
const unlisten = () => {};

const ipc = vi.hoisted(() => ({
  isTauri: true,
  getSettings: vi.fn(async () => ({
    timer: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      autoStartBreaks: true,
      autoStartFocus: false,
    },
    overlay: { enabled: true, size: 'M', opacity: 100 },
    notifications: {
      enabled: true,
      sound: true,
      preset: 'Chime',
      volume: 70,
      customPath: null,
      tick: false,
    },
    general: {
      launchAtLogin: false,
      startMinimized: false,
      theme: 'System',
      palette: 'Forest',
      reduceMotion: false,
      locale: null,
    },
    update: { autoCheck: true, metrics: true, skippedVersion: null, snoozeUntilMs: null },
  })),
  getState: vi.fn(async () => ({
    phase: 'Focus',
    isPaused: false,
    remainingMs: 5 * 60_000,
    plannedMs: 25 * 60_000,
    endsAtMs: 1,
    cycleIndex: 1,
    completedFocusCount: 2,
    startedAtMs: 0,
    interruptions: 0,
    pendingBreak: null,
  })),
  getTodaySummary: vi.fn(async () => ({
    completedFocus: 3,
    focusMs: 90_000,
    completedCountdown: 1,
    countdownMs: 120_000,
  })),
  onTimerTick: vi.fn(async () => unlisten),
  onTimerState: vi.fn(async () => unlisten),
  onTimerPhase: vi.fn(async () => unlisten),
  onTimerMissed: vi.fn(async () => unlisten),
  onSettingsChanged: vi.fn(async () => unlisten),
  startFocus: vi.fn(async () => ({})),
  startCountdown: vi.fn(async () => ({})),
  pauseTimer: vi.fn(async () => ({})),
  resumeTimer: vi.fn(async () => ({})),
  skipTimer: vi.fn(async () => ({})),
  resetTimer: vi.fn(async () => ({})),
  postponeBreak: vi.fn(async () => ({})),
  updateSettings: vi.fn(async () => ({})),
}));
vi.mock('../ipc/client', () => ipc);

beforeEach(() => {
  vi.useFakeTimers({ now: BASE });
});

afterEach(() => {
  clockStore.stop();
  vi.useRealTimers();
});

test('init loads the snapshot, settings, and summary exactly once', async () => {
  await timerStore.init();
  expect(timerStore.snapshot.phase).toBe('Focus');
  expect(timerStore.settings.timer.focusMinutes).toBe(25);
  expect(timerStore.summary.completedFocus).toBe(3);
  expect(timerStore.loading).toBe(false);
  expect(timerStore.error).toBeNull();
  expect(ipc.getTodaySummary).toHaveBeenCalledTimes(1);
  // Settings drive the window appearance immediately.
  expect(document.documentElement.dataset.theme).toBeDefined();
});

test('a day rollover refetches the today summary', async () => {
  clockStore.start();
  await timerStore.init();
  ipc.getTodaySummary.mockClear();
  // 23:30 plus 45 minutes crosses local midnight; the tick catches it.
  vi.advanceTimersByTime(45 * 60_000);
  await vi.waitFor(() => expect(ipc.getTodaySummary).toHaveBeenCalledTimes(1));
  expect(timerStore.summary.completedFocus).toBe(3);
});

test('destroy unsubscribes the day rollover', async () => {
  clockStore.start();
  ipc.getTodaySummary.mockClear();
  timerStore.destroy();
  vi.advanceTimersByTime(45 * 60_000);
  expect(ipc.getTodaySummary).not.toHaveBeenCalled();
  // Allow a later init to subscribe again.
  await timerStore.init();
  expect(ipc.getTodaySummary).toHaveBeenCalledTimes(1);
});

function snapshotOf(phase: TimerSnapshot['phase'], isPaused: boolean): TimerSnapshot {
  return {
    phase,
    isPaused,
    remainingMs: 60_000,
    plannedMs: 25 * 60_000,
    endsAtMs: null,
    cycleIndex: 0,
    completedFocusCount: 0,
    startedAtMs: null,
    interruptions: 0,
    pendingBreak: null,
  };
}

test('primary starts, pauses, and resumes by phase', async () => {
  await timerStore.init();
  ipc.getTodaySummary.mockClear();
  timerStore.snapshot = snapshotOf('Idle', false);
  await timerStore.primary();
  expect(ipc.startFocus).toHaveBeenCalledTimes(1);
  timerStore.snapshot = snapshotOf('Focus', false);
  await timerStore.primary();
  expect(ipc.pauseTimer).toHaveBeenCalledTimes(1);
  timerStore.snapshot = snapshotOf('Focus', true);
  await timerStore.primary();
  expect(ipc.resumeTimer).toHaveBeenCalledTimes(1);
  // Every run refreshes the summary behind the action.
  expect(ipc.getTodaySummary).toHaveBeenCalledTimes(3);
});

test('skip, reset, and postpone route to their commands', async () => {
  await timerStore.skip();
  expect(ipc.skipTimer).toHaveBeenCalledTimes(1);
  await timerStore.reset();
  expect(ipc.resetTimer).toHaveBeenCalledTimes(1);
  await timerStore.postpone();
  expect(ipc.postponeBreak).toHaveBeenCalledWith(5);
});

test('startCountdown forwards the minutes', async () => {
  await timerStore.startCountdown(10);
  expect(ipc.startCountdown).toHaveBeenCalledWith(10);
});

test('saveSettings persists through IPC and repaints', async () => {
  await timerStore.init();
  const next = timerStore.settings;
  ipc.updateSettings.mockResolvedValueOnce(next);
  await timerStore.saveSettings(next);
  expect(ipc.updateSettings).toHaveBeenCalledWith(next);
  expect(timerStore.settings).toBe(next);
  expect(timerStore.error).toBeNull();
});

test('a failed command surfaces the error instead of throwing', async () => {
  await timerStore.init();
  timerStore.snapshot = snapshotOf('Focus', false);
  ipc.pauseTimer.mockRejectedValueOnce(new Error('countdown.timerBusy'));
  await timerStore.primary();
  expect(timerStore.error).not.toBeNull();
});

test('timer events mirror into state and missed marks the welcome', async () => {
  timerStore.destroy();
  let emitTick: (value: TimerSnapshot) => void = () => {};
  let emitMissed: () => void = () => {};
  ipc.onTimerTick.mockImplementationOnce(async (handler) => {
    emitTick = handler;
    return unlisten;
  });
  ipc.onTimerMissed.mockImplementationOnce(async (handler) => {
    emitMissed = handler;
    return unlisten;
  });
  await timerStore.init();
  emitTick(snapshotOf('Countdown', true));
  expect(timerStore.snapshot.phase).toBe('Countdown');
  emitMissed();
  expect(timerStore.missed).toBe(true);
  timerStore.dismissWelcome();
  expect(timerStore.missed).toBe(false);
});

test('phase events refresh the summary', async () => {
  timerStore.destroy();
  let emitPhase: () => void = () => {};
  ipc.onTimerPhase.mockImplementationOnce(async (handler) => {
    emitPhase = handler;
    return unlisten;
  });
  await timerStore.init();
  ipc.getTodaySummary.mockClear();
  emitPhase();
  await vi.waitFor(() => expect(ipc.getTodaySummary).toHaveBeenCalledTimes(1));
});

test('settings events repaint appearance live', async () => {
  timerStore.destroy();
  let emitSettings: (value: Settings) => void = () => {};
  ipc.onSettingsChanged.mockImplementationOnce(async (handler) => {
    emitSettings = handler;
    return unlisten;
  });
  await timerStore.init();
  const next = {
    ...timerStore.settings,
    general: { ...timerStore.settings.general, theme: 'Dark' as const },
  };
  emitSettings(next);
  expect(timerStore.settings.general.theme).toBe('Dark');
  expect(document.documentElement.dataset.theme).toBe('Dark');
});

test('init surfaces IPC failures as an error, not a broken window', async () => {
  timerStore.destroy();
  ipc.getState.mockRejectedValueOnce(new Error('engine down'));
  await timerStore.init();
  expect(timerStore.error).toBe('engine down');
  expect(timerStore.loading).toBe(false);
});

test('refreshSummary keeps the previous summary on failure', async () => {
  await timerStore.init();
  ipc.getTodaySummary.mockRejectedValueOnce(new Error('offline'));
  await timerStore.refreshSummary();
  expect(timerStore.error).toBe('offline');
});

test('a pending-break failure maps to its message', async () => {
  await timerStore.init();
  ipc.skipTimer.mockRejectedValueOnce(new Error('countdown.breakPending'));
  await timerStore.skip();
  expect(timerStore.error).not.toBeNull();
});

import type { UnlistenFn } from '@tauri-apps/api/event';

import {
  getSettings,
  getState,
  getTodaySummary,
  isTauri,
  onSettingsChanged,
  onTimerMissed,
  onTimerPhase,
  onTimerState,
  onTimerTick,
  pauseTimer,
  postponeBreak,
  resetTimer,
  resumeTimer,
  skipTimer,
  startCountdown,
  startFocus,
  updateSettings,
} from '../ipc/client';
import type { Settings, TimerSnapshot, TodaySummary } from '../ipc/types';
import { applyAppearance } from '../utils/theme.util';
import { m } from '../../paraglide/messages.js';

const emptySnapshot: TimerSnapshot = {
  phase: 'Idle',
  isPaused: false,
  remainingMs: 0,
  plannedMs: 0,
  endsAtMs: null,
  cycleIndex: 0,
  completedFocusCount: 0,
  startedAtMs: null,
  interruptions: 0,
  pendingBreak: null,
};

/**
 * Pomodoro defaults: 25 focus, 5 break, a 15-minute long break every 4 rounds.
 * "Restore defaults" writes exactly this object through the normal save path.
 */
const DEFAULT_SETTINGS: Settings = {
  timer: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoStartBreaks: true,
    autoStartFocus: false,
  },
  overlay: {
    enabled: true,
    size: 'M',
    opacity: 100,
  },
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
  update: {
    autoCheck: true,
    metrics: true,
    skippedVersion: null,
    snoozeUntilMs: null,
  },
};

/** A fresh copy of the shipped settings, used at startup and by "restore defaults". */
export function createDefaultSettings(): Settings {
  return structuredClone(DEFAULT_SETTINGS);
}

/** App-wide timer state shared by every window; Rust remains authoritative. */
class TimerStore {
  snapshot = $state<TimerSnapshot>(emptySnapshot);
  settings = $state<Settings>(createDefaultSettings());
  summary = $state<TodaySummary>({
    completedFocus: 0,
    focusMs: 0,
    completedCountdown: 0,
    countdownMs: 0,
  });
  missed = $state(false);
  loading = $state(true);
  error = $state<string | null>(null);

  private initialized = false;
  private unlisten: UnlistenFn[] = [];

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    if (!isTauri) {
      // The browser preview has no Rust engine; keep the layout usable
      // instead of painting an IPC error over it.
      this.loading = false;
      return;
    }
    try {
      // Subscribe before the first read so a transition that lands while the
      // initial queries run cannot leave this window stuck on stale state.
      this.unlisten.push(
        await onTimerTick((next) => {
          this.snapshot = next;
        }),
        await onTimerState((next) => {
          this.snapshot = next;
        }),
        await onTimerPhase(() => {
          void this.refreshSummary();
        }),
        await onTimerMissed(() => {
          this.missed = true;
        }),
        await onSettingsChanged((next) => {
          this.settings = next;
          applyAppearance(next.general);
        }),
      );
      const [snapshot, settings, summary] = await Promise.all([
        getState(),
        getSettings(),
        getTodaySummary(),
      ]);
      this.snapshot = snapshot;
      this.settings = settings;
      this.summary = summary;
      applyAppearance(settings.general);
    } catch (error) {
      this.error = messageFor(error);
    } finally {
      this.loading = false;
    }
  }

  destroy(): void {
    for (const unlisten of this.unlisten) {
      unlisten();
    }
    this.unlisten = [];
    this.initialized = false;
  }

  async primary(): Promise<void> {
    if (this.snapshot.phase === 'Idle') {
      await this.run(startFocus);
    } else if (this.snapshot.isPaused) {
      await this.run(resumeTimer);
    } else {
      await this.run(pauseTimer);
    }
  }

  async start(): Promise<void> {
    await this.run(startFocus);
  }

  async startCountdown(minutes: number): Promise<boolean> {
    return this.run(() => startCountdown(minutes));
  }

  async skip(): Promise<void> {
    await this.run(skipTimer);
  }

  async reset(): Promise<void> {
    await this.run(resetTimer);
  }

  async postpone(): Promise<void> {
    await this.run(() => postponeBreak(5));
  }

  async saveSettings(next: Settings): Promise<void> {
    this.error = null;
    if (!isTauri) {
      // The browser preview has no Rust engine; apply the choice locally so
      // the palette and theme stay inspectable without an IPC error.
      this.settings = next;
      applyAppearance(next.general);
      return;
    }
    try {
      this.settings = await updateSettings(next);
      applyAppearance(this.settings.general);
    } catch (error) {
      this.error = messageFor(error);
    }
  }

  async refreshSummary(): Promise<void> {
    try {
      this.summary = await getTodaySummary();
    } catch (error) {
      this.error = messageFor(error);
    }
  }

  dismissWelcome(): void {
    this.missed = false;
  }

  clearError(): void {
    this.error = null;
  }

  private async run(action: () => Promise<TimerSnapshot>): Promise<boolean> {
    this.error = null;
    try {
      this.snapshot = await action();
      this.missed = false;
      await this.refreshSummary();
      return true;
    } catch (error) {
      this.error = messageFor(error);
      return false;
    }
  }
}

export const timerStore = new TimerStore();

function messageFor(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'countdown.timerBusy') {
    return m['countdown.timerBusy']();
  }
  if (message === 'countdown.breakPending') {
    return m['countdown.breakPending']();
  }
  return message;
}

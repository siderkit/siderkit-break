import { localDateKey, nextLocalMidnightMs } from '../utils/time/time.util.ts';

type DayChangeCallback = (dayKey: string) => void;

const TICK_MS = 30_000;

/**
 * The one clock every window shares. Browsers throttle or pause timers for
 * hidden windows, so a bare interval goes stale while a window sits in the
 * tray; visibility and focus events catch the window up the instant it is
 * shown again, and a midnight timer rolls the day key even when the tick was
 * throttled past it. Every "today" read and every ticking relative label
 * derives from `now`, so no window keeps a private interval anymore.
 */
class ClockStore {
  /** Ticking wall-clock timestamp. */
  now = $state(Date.now());

  private started = false;
  private lastDayKey = localDateKey();
  private listeners = new Set<DayChangeCallback>();
  private ticker: ReturnType<typeof setInterval> | undefined;
  private midnightTimer: ReturnType<typeof setTimeout> | undefined;

  get dayKey(): string {
    return localDateKey(new Date(this.now));
  }

  /** Registers a callback fired once per local day rollover. */
  onDayChange(callback: DayChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  start(): void {
    if (this.started || typeof document === 'undefined') {
      return;
    }
    this.started = true;
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('focus', this.onFocus);
    this.catchUp();
    this.ticker = setInterval(() => {
      this.catchUp();
    }, TICK_MS);
    this.scheduleMidnight();
  }

  stop(): void {
    if (!this.started) {
      return;
    }
    this.started = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('focus', this.onFocus);
    clearInterval(this.ticker);
    clearTimeout(this.midnightTimer);
    this.ticker = undefined;
    this.midnightTimer = undefined;
  }

  private onVisibility = (): void => {
    if (!document.hidden) {
      this.catchUp();
    }
  };

  private onFocus = (): void => {
    this.catchUp();
  };

  private catchUp(): void {
    this.now = Date.now();
    this.advanceDayKey();
  }

  private advanceDayKey(): void {
    const key = this.dayKey;
    if (key === this.lastDayKey) {
      return;
    }
    this.lastDayKey = key;
    for (const listener of this.listeners) {
      listener(key);
    }
  }

  private scheduleMidnight(): void {
    const delay = Math.max(nextLocalMidnightMs(this.now) - Date.now() + 1_000, TICK_MS);
    this.midnightTimer = setTimeout(() => {
      this.catchUp();
      this.scheduleMidnight();
    }, delay);
  }
}

export const clockStore = new ClockStore();

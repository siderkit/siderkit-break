export const COUNTDOWN_PRESETS = [1, 5, 10, 15, 30, 45, 60, 90, 120];
export const MIN_COUNTDOWN_MINUTES = 1;
export const MAX_COUNTDOWN_MINUTES = 24 * 60;
export const DEFAULT_COUNTDOWN_MINUTES = 5;
export const COUNTDOWN_STORAGE_KEY = 'siderkit-break:countdown-minutes';

/** Reads the last countdown length the user picked, falling back to 5 minutes. */
export function storedCountdownMinutes(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < MIN_COUNTDOWN_MINUTES) {
    return DEFAULT_COUNTDOWN_MINUTES;
  }
  return Math.min(MAX_COUNTDOWN_MINUTES, parsed);
}

export interface CountdownParts {
  hours: number;
  minutes: number;
  totalMinutes: number;
}

/** Joins hour and minute fields into the single value Rust receives. */
export function countdownParts(hours: number, minutes: number): CountdownParts {
  const safeHours = Math.min(24, Math.max(0, Math.trunc(hours)));
  const safeMinutes = Math.min(safeHours === 24 ? 0 : 59, Math.max(0, Math.trunc(minutes)));
  const totalMinutes = Math.min(MAX_COUNTDOWN_MINUTES, Math.max(0, safeHours * 60 + safeMinutes));
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    totalMinutes,
  };
}

/** Splits a preset or restored total into the two stepper fields. */
export function countdownFields(totalMinutes: number): { hours: number; minutes: number } {
  const total = Math.min(MAX_COUNTDOWN_MINUTES, Math.max(0, Math.trunc(totalMinutes)));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

export function canStartCountdown(totalMinutes: number): boolean {
  return totalMinutes >= MIN_COUNTDOWN_MINUTES && totalMinutes <= MAX_COUNTDOWN_MINUTES;
}

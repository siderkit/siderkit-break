import type { Phase, SessionKind, SessionOutcome, TimerConfig } from './ipc/types';
import type { Locale } from './locale';
import { m } from '../paraglide/messages.js';

/**
 * Formats a remaining duration. Under one hour uses MM:SS; one hour or more
 * uses HH:MM:SS. Rounding partial seconds up keeps the last second visible.
 */
export function formatClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Rounds accumulated time to whole minutes for summary lines. */
export function formatMinutes(valueMs: number): number {
  return Math.round(valueMs / 60_000);
}

/** Returns the configured duration of a phase, used to preview a pending break. */
export function phaseDurationMs(phase: Phase, timer: TimerConfig): number {
  return minutesForPhase(phase, timer) * 60_000;
}

/** Returns the localized phase name. */
export function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'Focus':
      return m['timer.phase.focus']();
    case 'ShortBreak':
      return m['timer.phase.shortBreak']();
    case 'LongBreak':
      return m['timer.phase.longBreak']();
    case 'Countdown':
      return m['timer.phase.countdown']();
    case 'Idle':
      return m['timer.phase.ready']();
  }
}

/** Maps a phase to the shared is-* state class used by rings and chips. */
export function phaseClass(phase: Phase): 'is-focus' | 'is-break' | 'is-countdown' | 'is-idle' {
  switch (phase) {
    case 'Focus':
      return 'is-focus';
    case 'ShortBreak':
    case 'LongBreak':
      return 'is-break';
    case 'Countdown':
      return 'is-countdown';
    case 'Idle':
      return 'is-idle';
  }
}

/** Labels the skip action for the exact phase it will end. */
export function skipLabel(phase: Phase, pendingBreak: Phase | null): string {
  if (phase === 'Idle') {
    return pendingBreak ? m['timer.action.cancelPendingBreak']() : m['timer.action.skipFocus']();
  }
  if (phase === 'Focus') {
    return m['timer.action.skipFocus']();
  }
  if (phase === 'Countdown') {
    return m['timer.action.skipCountdown']();
  }
  return m['timer.action.skipBreak']();
}

/** Labels the reset action so it never reads as a generic "reset". */
export function cancelLabel(phase: Phase, pendingBreak: Phase | null): string {
  if (phase === 'Idle') {
    return pendingBreak ? m['timer.action.cancelPendingBreak']() : m['timer.action.cancelFocus']();
  }
  if (phase === 'Focus') {
    return m['timer.action.cancelFocus']();
  }
  if (phase === 'Countdown') {
    return m['timer.action.cancelCountdown']();
  }
  return m['timer.action.cancelBreak']();
}

export function sessionKindLabel(kind: SessionKind): string {
  switch (kind) {
    case 'Focus':
      return m['history.focus']();
    case 'ShortBreak':
      return m['history.shortBreak']();
    case 'LongBreak':
      return m['history.longBreak']();
    case 'Countdown':
      return m['history.countdown']();
  }
}

export function outcomeLabel(outcome: SessionOutcome): string {
  switch (outcome) {
    case 'Completed':
      return m['history.completed']();
    case 'Skipped':
      return m['history.skipped']();
    case 'Reset':
      return m['history.reset']();
    case 'Interrupted':
      return m['history.interrupted']();
  }
}

/** Local calendar key (`YYYY-MM-DD`) for "today" checks. */
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(date: string): Date | null {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Full calendar date with the year, e.g. 2026年11月20日 or November 20, 2026. */
export function formatFullDate(date: string, locale: Locale): string {
  const parsed = parseLocalDate(date);
  if (!parsed) {
    return date;
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
}

/** Formats a local `YYYY-MM-DD` heading; today keeps its label plus the date. */
export function formatDateHeading(date: string, locale: Locale): string {
  if (date === localDateKey()) {
    return `${m['history.today']()} · ${formatFullDate(date, locale)}`;
  }
  const parsed = parseLocalDate(date);
  if (!parsed) {
    return date;
  }
  return formatWithWeekday(parsed, locale);
}

/** Keeps the locale's part order but spaces the weekday away from CJK dates. */
function formatWithWeekday(parsed: Date, locale: Locale): string {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).formatToParts(parsed);
  return parts
    .map((part, index) => {
      const previous = parts[index - 1];
      if (part.type === 'weekday' && previous?.type === 'literal' && !/\s$/.test(previous.value)) {
        return ` ${part.value}`;
      }
      return part.value;
    })
    .join('');
}

export function formatTime(timestampMs: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestampMs));
}

/** Clock with seconds, used by the exported report. */
export function formatTimeWithSeconds(timestampMs: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestampMs));
}

export function formatMinutesLabel(valueMs: number): string {
  return `${formatMinutes(valueMs)} ${m['common.unit.minutes']()}`;
}

function minutesForPhase(phase: Phase, timer: TimerConfig): number {
  switch (phase) {
    case 'Focus':
      return timer.focusMinutes;
    case 'ShortBreak':
      return timer.shortBreakMinutes;
    case 'LongBreak':
      return timer.longBreakMinutes;
    case 'Countdown':
    case 'Idle':
      return 0;
  }
}

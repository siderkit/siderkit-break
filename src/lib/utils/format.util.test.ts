import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { TimerConfig } from '../ipc/types.ts';
import {
  cancelLabel,
  formatClock,
  formatCompactDuration,
  formatDateHeading,
  formatFullDate,
  formatMinutes,
  formatMinutesLabel,
  formatTime,
  outcomeLabel,
  phaseClass,
  phaseDurationMs,
  phaseLabel,
  sessionKindLabel,
  skipLabel,
} from './format.util.ts';
import { localDateKey } from './time/time.util.ts';

test('formatClock uses MM:SS below one hour', () => {
  assert.equal(formatClock(0), '00:00');
  assert.equal(formatClock(1_500), '00:02');
  assert.equal(formatClock(59 * 60_000), '59:00');
  assert.equal(formatClock(59 * 60_000 + 59_000), '59:59');
});

test('formatClock switches to HH:MM:SS at one hour', () => {
  assert.equal(formatClock(60 * 60_000), '01:00:00');
  assert.equal(formatClock(90 * 60_000), '01:30:00');
  assert.equal(formatClock(120 * 60_000), '02:00:00');
  assert.equal(formatClock(24 * 60 * 60_000), '24:00:00');
});

test('formatClock never shows a negative time', () => {
  assert.equal(formatClock(-5_000), '00:00');
});

test('formatClock rounds partial seconds up so the last second stays visible', () => {
  assert.equal(formatClock(999), '00:01');
  assert.equal(formatClock(1_001), '00:02');
});

test('formatMinutes rounds accumulated time to whole minutes', () => {
  assert.equal(formatMinutes(0), 0);
  assert.equal(formatMinutes(59_000), 1);
  assert.equal(formatMinutes(25 * 60_000), 25);
});

test('formatFullDate always keeps the year', () => {
  assert.equal(formatFullDate('2026-11-20', 'en'), 'November 20, 2026');
});

test('formatDateHeading keeps the year and today label', () => {
  const today = new Date();
  const key = localDateKey(today);
  const heading = formatDateHeading(key, 'en', key);
  assert.equal(heading.includes('Today'), true);
  assert.equal(heading.includes(String(today.getFullYear())), true);
  assert.equal(formatDateHeading('2026-11-20', 'en', key).includes('2026'), true);
});

const timer: TimerConfig = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
};

test('phase durations and classes map the full phase set', () => {
  assert.equal(phaseDurationMs('Focus', timer), 25 * 60_000);
  assert.equal(phaseDurationMs('ShortBreak', timer), 5 * 60_000);
  assert.equal(phaseDurationMs('LongBreak', timer), 15 * 60_000);
  assert.equal(phaseDurationMs('Countdown', timer), 0);
  assert.equal(phaseClass('Focus'), 'is-focus');
  assert.equal(phaseClass('ShortBreak'), 'is-break');
  assert.equal(phaseClass('LongBreak'), 'is-break');
  assert.equal(phaseClass('Countdown'), 'is-countdown');
  assert.equal(phaseClass('Idle'), 'is-idle');
});

test('labels cover every phase, kind, outcome, and action branch', () => {
  const phases = ['Focus', 'ShortBreak', 'LongBreak', 'Countdown', 'Idle'] as const;
  for (const phase of phases) {
    assert.ok(phaseLabel(phase).length > 0);
    assert.ok(skipLabel(phase, null).length > 0);
    assert.ok(skipLabel(phase, 'ShortBreak').length > 0);
    assert.ok(cancelLabel(phase, null).length > 0);
    assert.ok(cancelLabel(phase, 'LongBreak').length > 0);
  }
  for (const kind of ['Focus', 'ShortBreak', 'LongBreak', 'Countdown'] as const) {
    assert.ok(sessionKindLabel(kind).length > 0);
  }
  for (const outcome of ['Completed', 'Skipped', 'Reset', 'Interrupted'] as const) {
    assert.ok(outcomeLabel(outcome).length > 0);
  }
});

test('durations and timestamps format for display', () => {
  assert.equal(formatCompactDuration(6 * 60 * 60_000 + 20 * 60_000), '6h 20m');
  assert.equal(formatCompactDuration(45 * 60_000), '45m');
  assert.equal(formatCompactDuration(0), '0m');
  assert.ok(formatTime(new Date(2026, 10, 20, 9, 5).getTime(), 'en').includes('09'));
  assert.ok(formatMinutesLabel(90_000).length > 0);
});

test('invalid date inputs fall back to the raw key', () => {
  assert.equal(formatFullDate('not-a-date', 'en'), 'not-a-date');
  assert.equal(formatDateHeading('bad', 'en', '2026-11-25'), 'bad');
});

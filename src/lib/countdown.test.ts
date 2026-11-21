import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COUNTDOWN_PRESETS,
  MAX_COUNTDOWN_MINUTES,
  canStartCountdown,
  countdownFields,
  countdownParts,
  storedCountdownMinutes,
} from './countdown.ts';

test('presets cover the agreed quick durations', () => {
  assert.deepEqual(COUNTDOWN_PRESETS, [1, 5, 10, 15, 30, 45, 60, 90, 120]);
});

test('the stored countdown falls back to five minutes and clamps the range', () => {
  assert.equal(storedCountdownMinutes(null), 5);
  assert.equal(storedCountdownMinutes(''), 5);
  assert.equal(storedCountdownMinutes('0'), 5);
  assert.equal(storedCountdownMinutes('nonsense'), 5);
  assert.equal(storedCountdownMinutes('25'), 25);
  assert.equal(storedCountdownMinutes('9999'), MAX_COUNTDOWN_MINUTES);
});

test('countdownParts joins hours and minutes and clamps the total', () => {
  assert.deepEqual(countdownParts(1, 30), { hours: 1, minutes: 30, totalMinutes: 90 });
  assert.deepEqual(countdownParts(24, 30), { hours: 24, minutes: 0, totalMinutes: 1440 });
  assert.deepEqual(countdownParts(-1, 5), { hours: 0, minutes: 5, totalMinutes: 5 });
});

test('countdownFields splits presets into the stepper values', () => {
  assert.deepEqual(countdownFields(120), { hours: 2, minutes: 0 });
  assert.deepEqual(countdownFields(90), { hours: 1, minutes: 30 });
  assert.deepEqual(countdownFields(1), { hours: 0, minutes: 1 });
});

test('countdowns must be between one minute and 24 hours', () => {
  assert.equal(canStartCountdown(0), false);
  assert.equal(canStartCountdown(1), true);
  assert.equal(canStartCountdown(120), true);
  assert.equal(canStartCountdown(MAX_COUNTDOWN_MINUTES), true);
  assert.equal(canStartCountdown(MAX_COUNTDOWN_MINUTES + 1), false);
});

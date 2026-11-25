import assert from 'node:assert/strict';
import { test } from 'vitest';

import { clampStep, stepValue } from './stepper.util.ts';

test('clampStep keeps values inside the field bounds', () => {
  assert.equal(clampStep(0, 1, 60), 1);
  assert.equal(clampStep(99, 1, 60), 60);
  assert.equal(clampStep(30, 1, 60), 30);
});

test('clampStep rounds to the configured step', () => {
  assert.equal(clampStep(7, 0, 60, 5), 5);
  assert.equal(clampStep(8, 0, 60, 5), 10);
});

test('clampStep tolerates non-finite input', () => {
  assert.equal(clampStep(Number.NaN, 2, 12), 2);
  assert.equal(clampStep(Number.POSITIVE_INFINITY, 2, 12), 2);
});

test('stepValue moves one step and stays clamped', () => {
  assert.equal(stepValue(1, -1, 1, 60), 1);
  assert.equal(stepValue(60, 1, 1, 60), 60);
  assert.equal(stepValue(5, 1, 0, 24), 6);
  assert.equal(stepValue(5, -1, 0, 24), 4);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { isDragGesture, isOverlayIdle } from './overlay.ts';

test('only the idle phase renders the droplet', () => {
  assert.equal(isOverlayIdle('Idle'), true);
  assert.equal(isOverlayIdle('Focus'), false);
  assert.equal(isOverlayIdle('ShortBreak'), false);
  assert.equal(isOverlayIdle('LongBreak'), false);
  assert.equal(isOverlayIdle('Countdown'), false);
});

test('small pointer jitter stays a click', () => {
  assert.equal(isDragGesture(10, 10, 12, 12), false);
  assert.equal(isDragGesture(10, 10, 10, 10), false);
});

test('travel beyond the threshold starts a window drag', () => {
  assert.equal(isDragGesture(10, 10, 20, 10), true);
  assert.equal(isDragGesture(10, 10, 10, 20), true);
  assert.equal(isDragGesture(10, 10, 13, 14), true);
});

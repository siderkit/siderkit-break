import assert from 'node:assert/strict';
import { test } from 'vitest';

import { detectWebFeatures, isWebviewSupported } from './webview-support.util.ts';

test('the app needs both dialog and structuredClone', () => {
  assert.equal(isWebviewSupported({ dialog: true, structuredClone: true }), true);
  assert.equal(isWebviewSupported({ dialog: false, structuredClone: true }), false);
  assert.equal(isWebviewSupported({ dialog: true, structuredClone: false }), false);
  assert.equal(isWebviewSupported({ dialog: false, structuredClone: false }), false);
});

test('detection reads the real webview capabilities', () => {
  const features = detectWebFeatures();
  assert.equal(
    features.dialog,
    typeof HTMLDialogElement !== 'undefined' &&
      typeof HTMLDialogElement.prototype.showModal === 'function',
  );
  assert.equal(features.structuredClone, typeof globalThis.structuredClone === 'function');
});

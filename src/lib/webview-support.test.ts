import assert from 'node:assert/strict';
import test from 'node:test';

import { isWebviewSupported } from './webview-support.ts';

test('the app needs both dialog and structuredClone', () => {
  assert.equal(isWebviewSupported({ dialog: true, structuredClone: true }), true);
  assert.equal(isWebviewSupported({ dialog: false, structuredClone: true }), false);
  assert.equal(isWebviewSupported({ dialog: true, structuredClone: false }), false);
  assert.equal(isWebviewSupported({ dialog: false, structuredClone: false }), false);
});

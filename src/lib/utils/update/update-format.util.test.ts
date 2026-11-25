import assert from 'node:assert/strict';
import { test } from 'vitest';

import { downloadPercent, formatBytes, formatDownloadSize } from './update-format.util.ts';

test('bytes are rounded to a readable unit', () => {
  assert.equal(formatBytes(0, 'en'), '0 KB');
  assert.equal(formatBytes(1024, 'en'), '1 KB');
  assert.equal(formatBytes(5.29 * 1024 * 1024, 'en'), '5.3 MB');
});

test('a download without a total shows only what arrived', () => {
  assert.equal(formatDownloadSize(3.1 * 1024 * 1024, null), '3.1 MB');
  assert.equal(formatDownloadSize(3.1 * 1024 * 1024, 7.4 * 1024 * 1024), '3.1 MB / 7.4 MB');
});

test('the progress percentage stays inside the bar', () => {
  assert.equal(downloadPercent(0, 100), 0);
  assert.equal(downloadPercent(50, 100), 50);
  assert.equal(downloadPercent(200, 100), 100);
  assert.equal(downloadPercent(50, null), 0);
});

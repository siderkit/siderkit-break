import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  downloadPercent,
  formatBytes,
  formatDownloadSize,
  formatRelative,
} from './update-format.util.ts';

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

test('a recent check reads as a relative time', () => {
  const now = 1_700_000_000_000;
  assert.equal(formatRelative(now - 5 * 60_000, now, 'en'), '5 minutes ago');
  assert.equal(formatRelative(now - 3 * 60 * 60_000, now, 'en'), '3 hours ago');
});

test('a fresh check reads as just now and keeps moving', () => {
  const now = 1_700_000_000_000;
  assert.equal(formatRelative(now, now, 'en'), 'Just now');
  assert.equal(formatRelative(now, now, 'zh-CN'), '刚刚');
  assert.equal(formatRelative(now, now, 'zh-TW'), '剛剛');
  assert.equal(formatRelative(now - 30_000, now, 'en'), '30 seconds ago');
});

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { diagnosticsText, formatBytes } from './diagnostics.util.ts';
import type { Diagnostics } from '../ipc/types.ts';

const sample: Diagnostics = {
  version: '1.0.0',
  os: 'Windows',
  arch: 'x86_64',
  webview: 'WebView2 123',
  locale: 'zh-CN',
  theme: 'Dark',
  palette: 'Forest',
  logDir: 'C:\\logs',
  logSize: 2048,
  recentLogs: ['warn one'],
};

test('formatBytes labels bytes and rounds below 10 units to one decimal', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(-1), '0 B');
  assert.equal(formatBytes(Number.NaN), '0 B');
  assert.equal(formatBytes(1023), '1023 B');
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(15 * 1024), '15 KB');
  assert.equal(formatBytes(1024 ** 2), '1.0 MB');
});

test('diagnosticsText starts with the version and carries environment lines', () => {
  const text = diagnosticsText(sample);
  const lines = text.split('\n');
  assert.equal(lines[0], 'Version: 1.0.0');
  assert.ok(lines.some((line) => line.includes('Windows')));
  assert.ok(lines.some((line) => line.includes('WebView2 123')));
  assert.ok(lines.some((line) => line.includes('Dark')));
});

test('diagnosticsText lists recent warnings verbatim', () => {
  const text = diagnosticsText(sample);
  assert.ok(text.includes('Recent warnings:'));
  assert.ok(text.includes('warn one'));
});

test('diagnosticsText omits recent warnings when the list is empty', () => {
  const text = diagnosticsText({ ...sample, recentLogs: [] });
  assert.ok(!text.includes('Recent warnings:'));
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { UpdateStatus } from '../../ipc/types.ts';
import { presentUpdate } from './update-status.util.ts';

function status(overrides: Partial<UpdateStatus> = {}): UpdateStatus {
  return {
    supported: true,
    phase: 'Idle',
    version: null,
    notes: null,
    pubDate: null,
    downloaded: 0,
    total: null,
    lastCheckedMs: null,
    lastError: null,
    prompt: false,
    autoCheck: true,
    skippedVersion: null,
    snoozeUntilMs: null,
    ...overrides,
  };
}

test('a missing snapshot offers a check and stays neutral', () => {
  assert.deepEqual(presentUpdate(null), {
    tone: 'Muted',
    action: 'Check',
    busy: false,
    percent: 0,
  });
});

test('platforms without auto-update never offer an action', () => {
  assert.equal(presentUpdate(status({ supported: false })).action, 'None');
});

test('an available update is a warning with a download action', () => {
  const presentation = presentUpdate(status({ phase: 'Available', version: '1.0.0' }));
  assert.equal(presentation.tone, 'Warning');
  assert.equal(presentation.action, 'Download');
});

test('downloading shows a cancel action and real progress', () => {
  const presentation = presentUpdate(status({ phase: 'Downloading', downloaded: 50, total: 200 }));
  assert.equal(presentation.action, 'Cancel');
  assert.equal(presentation.percent, 25);
});

test('a downloaded update is ready to restart', () => {
  const presentation = presentUpdate(status({ phase: 'Ready', version: '1.0.0' }));
  assert.equal(presentation.tone, 'Brand');
  assert.equal(presentation.action, 'Restart');
});

test('checking and installing disable the action', () => {
  assert.equal(presentUpdate(status({ phase: 'Checking' })).busy, true);
  assert.equal(presentUpdate(status({ phase: 'Installing' })).busy, true);
});

test('an up-to-date app offers another check', () => {
  const presentation = presentUpdate(status({ phase: 'UpToDate' }));
  assert.equal(presentation.tone, 'Brand');
  assert.equal(presentation.action, 'Check');
});

test('a failure is red and offers a retry', () => {
  const presentation = presentUpdate(status({ phase: 'Failed', lastError: 'download' }));
  assert.equal(presentation.tone, 'Break');
  assert.equal(presentation.action, 'Retry');
});

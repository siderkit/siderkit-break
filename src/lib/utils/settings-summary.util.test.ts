import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appearanceValue,
  dataValue,
  disabledLabel,
  enabledLabel,
  languageValue,
  overlayValue,
  paletteName,
  presetName,
  reminderValue,
  rhythmValue,
  sizeName,
  themeName,
} from './settings-summary.util.ts';
import { localeMeta } from './locale.util.ts';
import type { Settings } from '../ipc/types.ts';

const timer: Settings['timer'] = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
};

const general: Settings['general'] = {
  locale: null,
  theme: 'Dark',
  palette: 'Forest',
  launchAtLogin: false,
  startMinimized: false,
  reduceMotion: false,
};

const overlay: Settings['overlay'] = { enabled: true, size: 'M', opacity: 85 };

const notifications: Settings['notifications'] = {
  enabled: true,
  preset: 'Chime',
  volume: 80,
  customPath: null,
  sound: true,
  tick: false,
};

test('labels resolve through the active locale', () => {
  assert.equal(enabledLabel(), 'On');
  assert.equal(disabledLabel(), 'Off');
});

test('theme names map every value', () => {
  assert.equal(themeName('System'), 'System');
  assert.equal(themeName('Dark'), 'Dark');
  assert.equal(themeName('Light'), 'Light');
});

test('palette names cover all twelve palettes', () => {
  const palettes = [
    'Forest',
    'Ocean',
    'Ember',
    'Sand',
    'Slate',
    'Rose',
    'Moss',
    'Ink',
    'Dusk',
    'Clay',
    'Plum',
    'Aurora',
  ] as const;
  for (const palette of palettes) {
    assert.ok(paletteName(palette).length > 0, palette);
  }
  assert.equal(paletteName('Forest'), 'Forest');
});

test('preset and size names map every enum value', () => {
  assert.equal(presetName('Chime'), 'Chime');
  assert.equal(presetName('Soft'), 'Soft');
  assert.equal(presetName('Bell'), 'Bell');
  assert.equal(presetName('Off'), 'Off');
  assert.equal(sizeName('S'), 'Small');
  assert.equal(sizeName('M'), 'Medium');
  assert.equal(sizeName('L'), 'Large');
});

test('rhythm value prints focus/short/long', () => {
  assert.equal(rhythmValue(timer), '25/5/15');
});

test('appearance value joins palette and theme', () => {
  assert.equal(appearanceValue(general), 'Forest · Dark');
});

test('overlay value joins state and size', () => {
  assert.equal(overlayValue(overlay), 'On · Medium');
  assert.equal(overlayValue({ ...overlay, enabled: false }), 'Off · Medium');
});

test('reminder value shows the preset only when enabled', () => {
  assert.equal(reminderValue(notifications), 'On · Chime');
  assert.equal(reminderValue({ ...notifications, enabled: false }), 'Off');
});

test('data value joins update mode and metrics state', () => {
  const settings: Settings = {
    general,
    timer,
    overlay,
    notifications,
    update: { autoCheck: true, metrics: true, skippedVersion: null, snoozeUntilMs: null },
  };
  assert.equal(dataValue(settings), 'Auto check · Counts On');
  const manual: Settings = {
    ...settings,
    update: { ...settings.update, autoCheck: false, metrics: false },
  };
  assert.equal(dataValue(manual), 'Manual check · Counts Off');
});

test('language value falls back to system, normalizes codes, keeps unknown text', () => {
  assert.equal(languageValue(null), 'System');
  assert.equal(languageValue('zh_cn'), localeMeta('zh-CN').native);
  assert.equal(languageValue('xx'), 'xx');
});

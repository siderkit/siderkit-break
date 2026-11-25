import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
  applyAppearance,
  applyMotion,
  applyPalette,
  applyTheme,
  watchSystemTheme,
} from './theme.util.ts';

// The stub keeps one mutable "dark" flag so theme resolution is testable.
let prefersDark = false;
let mediaListener: ((event: unknown) => void) | undefined;
const matchMedia = vi.fn(() => ({
  get matches() {
    return prefersDark;
  },
  addEventListener: (_type: string, listener: (event: unknown) => void) => {
    mediaListener = listener;
  },
  removeEventListener: () => {
    mediaListener = undefined;
  },
}));

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  prefersDark = false;
  mediaListener = undefined;
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
});

afterEach(() => {
  // Drop any system listener this test left attached.
  watchSystemTheme()();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
});

test('appearance lands on the document element in one call', () => {
  applyAppearance({ theme: 'Dark', palette: 'Forest', reduceMotion: true });
  expect(document.documentElement.dataset.theme).toBe('Dark');
  expect(document.documentElement.dataset.palette).toBe('Forest');
  expect(document.documentElement.dataset.motion).toBe('Reduced');
  applyAppearance({ theme: 'Light', palette: 'Forest', reduceMotion: false });
  expect(document.documentElement.dataset.theme).toBe('Light');
  expect(document.documentElement.dataset.motion).toBe('Full');
});

test('System resolves dark through the OS query, explicit themes win', () => {
  applyTheme('System');
  expect(document.documentElement.dataset.theme).toBe('Light');
  prefersDark = true;
  applyTheme('System');
  expect(document.documentElement.dataset.theme).toBe('Dark');
  prefersDark = false;
  applyTheme('Dark');
  expect(document.documentElement.dataset.theme).toBe('Dark');
});

test('the system listener repaints only while System is active', () => {
  applyTheme('System');
  prefersDark = true;
  mediaListener?.(undefined);
  expect(document.documentElement.dataset.theme).toBe('Dark');

  applyTheme('Dark');
  prefersDark = true;
  mediaListener?.(undefined);
  expect(document.documentElement.dataset.theme).toBe('Dark');
});

test('palette and motion never touch the theme', () => {
  delete document.documentElement.dataset.theme;
  applyPalette('Forest');
  applyMotion(true);
  expect(document.documentElement.dataset.palette).toBe('Forest');
  expect(document.documentElement.dataset.motion).toBe('Reduced');
  expect(document.documentElement.dataset.theme).toBeUndefined();
});

test('watchSystemTheme returns a remover', () => {
  const unlisten = watchSystemTheme();
  expect(mediaListener).toBeDefined();
  unlisten();
  expect(mediaListener).toBeUndefined();
});

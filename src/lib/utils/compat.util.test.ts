import { beforeEach, expect, test, vi } from 'vitest';

import type { WebFeatures } from './webview-support.util.ts';

const webview = vi.hoisted(() => ({
  isWebviewSupported: vi.fn((features: WebFeatures) => features.dialog && features.structuredClone),
  detectWebFeatures: vi.fn((): WebFeatures => ({ dialog: true, structuredClone: true })),
}));
vi.mock('./webview-support.util.ts', () => webview);

import { ensureWebviewSupported } from './compat.util.ts';

beforeEach(() => {
  webview.detectWebFeatures.mockReturnValue({ dialog: true, structuredClone: true });
});

test('a supported webview keeps the app shell untouched', () => {
  document.body.innerHTML = '<div id="app"><span>shell</span></div>';
  expect(ensureWebviewSupported()).toBe(true);
  expect(document.getElementById('app')?.textContent).toContain('shell');
});

test('an old webview swaps the shell for an actionable message', () => {
  document.body.innerHTML = '<div id="app"><span>shell</span></div>';
  webview.detectWebFeatures.mockReturnValue({ dialog: false, structuredClone: true });
  expect(ensureWebviewSupported()).toBe(false);
  const app = document.getElementById('app');
  expect(app?.querySelector('h1')?.textContent?.length ?? 0).toBeGreaterThan(0);
  expect(app?.querySelector('p')?.textContent?.length ?? 0).toBeGreaterThan(0);
});

test('a missing app root stays harmless', () => {
  document.body.innerHTML = '';
  webview.detectWebFeatures.mockReturnValue({ dialog: false, structuredClone: false });
  expect(ensureWebviewSupported()).toBe(false);
});

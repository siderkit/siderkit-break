import { m } from '../../paraglide/messages.js';
import { detectWebFeatures, isWebviewSupported } from './webview-support.util.ts';

/**
 * Replaces the app shell with an actionable message instead of mounting a UI
 * that would fail on the first dialog. Returns true when the window is usable.
 */
export function ensureWebviewSupported(): boolean {
  if (isWebviewSupported(detectWebFeatures())) {
    return true;
  }
  const target = document.getElementById('app');
  if (target) {
    const heading = document.createElement('h1');
    heading.textContent = m['app.name']();
    const body = document.createElement('p');
    body.textContent = m['compat.unsupportedWebview']();
    target.replaceChildren(heading, body);
  }
  return false;
}

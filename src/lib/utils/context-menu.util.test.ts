import { expect, test, vi } from 'vitest';

const ipc = vi.hoisted(() => ({ showContextMenu: vi.fn(async () => {}) }));
vi.mock('../ipc/client.ts', () => ipc);

import { installContextMenu } from './context-menu.util.ts';

// One install for the whole file: the listener lives on the shared document
// and cannot be removed, so extra installs would stack duplicate handlers.
installContextMenu();

function fire(target: Element, shiftKey = false): { preventDefault: ReturnType<typeof vi.fn> } {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, shiftKey });
  const preventDefault = vi.spyOn(event, 'preventDefault');
  target.dispatchEvent(event);
  return { preventDefault };
}

// The development branch (`import.meta.env.DEV`) is always true under vitest,
// so these two tests pin the dev-mode contract.
test('development keeps the webview menu on a plain right-click', () => {
  const host = document.body.appendChild(document.createElement('div'));
  const { preventDefault } = fire(host);
  expect(preventDefault).not.toHaveBeenCalled();
  expect(ipc.showContextMenu).not.toHaveBeenCalled();
});

test('shift plus right-click opens the native menu in development', () => {
  const host = document.body.appendChild(document.createElement('div'));
  const { preventDefault } = fire(host, true);
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(ipc.showContextMenu).toHaveBeenCalledWith(false);
});

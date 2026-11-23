import { showContextMenu } from './ipc/client';

const EDITABLE_SELECTOR = 'input, textarea, [contenteditable]:not([contenteditable="false"])';

/**
 * GTK needs an extra runtime library for the native edit verbs, and the
 * AppImage does not carry it. A text field keeps the WebView's own edit menu
 * on Linux so copy and paste keep working there.
 */
const editMenuBelongsToWebview = /Linux/i.test(navigator.userAgent);

/**
 * Replaces the WebView context menu with the app's native menu.
 *
 * The WebView menu exposes browser commands (reload, print, save as) that do
 * not belong in a desktop app. The native menu mirrors the tray rows instead.
 * During development the WebView menu is the only route to Inspect and Reload,
 * so plain right-click keeps it there; Shift+right-click still opens the app
 * menu for a visual check.
 */
export function installContextMenu(): void {
  document.addEventListener('contextmenu', (event) => {
    const target = event.target;
    const editable = target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;
    if (import.meta.env.DEV && !event.shiftKey) {
      return;
    }
    if (editable && editMenuBelongsToWebview) {
      return;
    }
    event.preventDefault();
    void showContextMenu(editable);
  });
}

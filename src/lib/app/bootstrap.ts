import { getSettings, isTauri, onLocaleChanged, onSettingsChanged } from '../ipc/client';
import { installContextMenu } from '../utils/context-menu.util';
import {
  applyDocumentLocale,
  normalizeLocale,
  prepareLocale,
  systemLocale,
  type Locale,
} from '../utils/locale.util';
import { applyAppearance } from '../utils/theme.util';
import { installRipple } from '../utils/ripple.util';

export type WindowName = 'main' | 'overlay' | 'break' | 'locate';

/**
 * Applies persisted theme, palette, and locale before the first render so a
 * window never flashes the base locale. A null preference follows the system;
 * a locale change in any window reloads every window through the Rust event.
 */
export async function prepareWindow(name: WindowName): Promise<void> {
  document.documentElement.dataset.window = name;
  installRipple();
  let locale: Locale = systemLocale();
  if (isTauri) {
    try {
      const settings = await getSettings();
      applyAppearance(settings.general);
      locale = settings.general.locale
        ? (normalizeLocale(settings.general.locale) ?? locale)
        : locale;
    } catch {
      applyAppearance({ theme: 'System', palette: 'Forest', reduceMotion: false });
    }
  }
  await prepareLocale(locale);
  applyDocumentLocale(locale);
  if (isTauri) {
    // The overlay owns a richer native menu with its own placement rules.
    if (name !== 'overlay') {
      installContextMenu();
    }
    try {
      await onLocaleChanged(() => {
        window.location.reload();
      });
    } catch {
      // The event bridge can drop during shutdown; the local switch is enough.
    }
    try {
      // Windows that live hidden (locate, the pending break window) would
      // otherwise keep their startup palette forever and flash it stale.
      await onSettingsChanged((next) => {
        applyAppearance(next.general);
      });
    } catch {
      // Same bridge caveat: a best-effort repaint is all bootstrap owes.
    }
  }
}

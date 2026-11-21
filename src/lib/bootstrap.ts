import { getSettings, isTauri, onLocaleChanged } from './ipc/client';
import {
  applyDocumentLocale,
  normalizeLocale,
  prepareLocale,
  systemLocale,
  type Locale,
} from './locale';
import { applyPalette, applyTheme } from './theme';

export type WindowName = 'main' | 'overlay' | 'break' | 'locate';

/**
 * Applies persisted theme, palette, and locale before the first render so a
 * window never flashes the base locale. A null preference follows the system;
 * a locale change in any window reloads every window through the Rust event.
 */
export async function prepareWindow(name: WindowName): Promise<void> {
  document.documentElement.dataset.window = name;
  let locale: Locale = systemLocale();
  if (isTauri) {
    try {
      const settings = await getSettings();
      applyTheme(settings.general.theme);
      applyPalette(settings.general.palette);
      locale = settings.general.locale
        ? (normalizeLocale(settings.general.locale) ?? locale)
        : locale;
    } catch {
      applyTheme('System');
      applyPalette('Forest');
    }
  }
  await prepareLocale(locale);
  applyDocumentLocale(locale);
  if (isTauri) {
    try {
      await onLocaleChanged(() => {
        window.location.reload();
      });
    } catch {
      // The event bridge can drop during shutdown; the local switch is enough.
    }
  }
}

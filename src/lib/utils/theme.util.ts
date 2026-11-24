import type { Palette, Settings, Theme } from '../ipc/types.ts';

let systemQuery: MediaQueryList | undefined;
let systemListener: (() => void) | undefined;
let activeTheme: Theme = 'System';

/** The appearance slice every window repaints together on a setting change. */
export type Appearance = Pick<Settings['general'], 'theme' | 'palette' | 'reduceMotion'>;

/** Repaints theme, palette, and motion in one call so callers stay one-line. */
export function applyAppearance(appearance: Appearance): void {
  applyTheme(appearance.theme);
  applyPalette(appearance.palette);
  applyMotion(appearance.reduceMotion);
}

/** Repaints the document theme and attaches the system listener when needed. */
export function applyTheme(theme: Theme): void {
  activeTheme = theme;
  if (theme === 'System') {
    ensureSystemListener();
  }
  paintTheme();
}

/** Repaints semantic colors without touching layout or component CSS. */
export function applyPalette(palette: Palette): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.palette = palette;
}

/** Disables non-essential transitions when the user asks for less motion. */
export function applyMotion(reduce: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.motion = reduce ? 'Reduced' : 'Full';
}

/** Keeps System theme changes live; the returned function removes the listener. */
export function watchSystemTheme(): () => void {
  ensureSystemListener();
  return () => {
    if (systemQuery && systemListener) {
      systemQuery.removeEventListener('change', systemListener);
      systemListener = undefined;
    }
  };
}

function ensureSystemListener(): void {
  if (typeof window === 'undefined' || systemListener) {
    return;
  }
  systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemListener = () => {
    if (activeTheme === 'System') {
      paintTheme();
    }
  };
  systemQuery.addEventListener('change', systemListener);
}

function paintTheme(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const dark =
    activeTheme === 'Dark' ||
    (activeTheme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'Dark' : 'Light';
}

import type { Palette, Settings, SoundPreset, Theme } from './ipc/types';
import { localeMeta, normalizeLocale } from './locale';
import { m } from '../paraglide/messages.js';

/** Small shared vocabulary for the settings root values. */
export function enabledLabel(): string {
  return m['common.state.on']();
}

export function disabledLabel(): string {
  return m['common.state.off']();
}

export function themeName(theme: Theme): string {
  switch (theme) {
    case 'System':
      return m['settings.general.themeSystem']();
    case 'Light':
      return m['settings.general.themeLight']();
    case 'Dark':
      return m['settings.general.themeDark']();
  }
}

export function paletteName(palette: Palette): string {
  const keys: Record<Palette, string> = {
    Forest: m['settings.general.paletteForest'](),
    Ocean: m['settings.general.paletteOcean'](),
    Ember: m['settings.general.paletteEmber'](),
    Sand: m['settings.general.paletteSand'](),
    Slate: m['settings.general.paletteSlate'](),
    Rose: m['settings.general.paletteRose'](),
    Moss: m['settings.general.paletteMoss'](),
    Ink: m['settings.general.paletteInk'](),
    Dusk: m['settings.general.paletteDusk'](),
    Clay: m['settings.general.paletteClay'](),
    Plum: m['settings.general.palettePlum'](),
    Aurora: m['settings.general.paletteAurora'](),
  };
  return keys[palette];
}

export function presetName(preset: SoundPreset): string {
  switch (preset) {
    case 'Chime':
      return m['settings.notifications.presetChime']();
    case 'Soft':
      return m['settings.notifications.presetSoft']();
    case 'Bell':
      return m['settings.notifications.presetBell']();
    case 'Custom':
      return m['settings.notifications.custom']();
    case 'Off':
      return m['common.state.off']();
  }
}

export function sizeName(size: Settings['overlay']['size']): string {
  switch (size) {
    case 'S':
      return m['settings.overlay.sizeSmall']();
    case 'M':
      return m['settings.overlay.sizeMedium']();
    case 'L':
      return m['settings.overlay.sizeLarge']();
  }
}

export function languageValue(locale: string | null): string {
  if (!locale) {
    return m['settings.general.languageSystem']();
  }
  const normalized = normalizeLocale(locale);
  return normalized ? localeMeta(normalized).native : locale;
}

export function rhythmValue(timer: Settings['timer']): string {
  return `${timer.focusMinutes}/${timer.shortBreakMinutes}/${timer.longBreakMinutes}`;
}

export function appearanceValue(general: Settings['general']): string {
  return `${paletteName(general.palette)} · ${themeName(general.theme)}`;
}

export function overlayValue(overlay: Settings['overlay']): string {
  return `${overlay.enabled ? enabledLabel() : disabledLabel()} · ${sizeName(overlay.size)}`;
}

export function reminderValue(notifications: Settings['notifications']): string {
  if (!notifications.enabled) {
    return disabledLabel();
  }
  return `${enabledLabel()} · ${presetName(notifications.preset)}`;
}

export function dataValue(settings: Settings): string {
  const auto = settings.update.autoCheck ? m['settings.data.auto']() : m['settings.data.manual']();
  return `${auto} · ${m['settings.data.metrics']()} ${settings.update.metrics ? enabledLabel() : disabledLabel()}`;
}

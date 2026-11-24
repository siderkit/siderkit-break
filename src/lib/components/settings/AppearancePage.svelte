<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { Settings, Theme } from '../../ipc/types';
  import { paletteName, themeName } from '../../utils/settings-summary.util';
  import Segmented from '../../ui/Segmented.svelte';
  import PaletteGrid from './PaletteGrid.svelte';
  import SettingsField from './SettingsField.svelte';
  import SettingsToggle from './SettingsToggle.svelte';

  let {
    value,
    onchange,
  }: {
    value: Settings['general'];
    onchange: (patch: Partial<Settings['general']>) => void;
  } = $props();

  const themeOptions = [
    { value: 'Light', label: m['settings.general.themeLight']() },
    { value: 'Dark', label: m['settings.general.themeDark']() },
    { value: 'System', label: m['settings.general.themeSystem']() },
  ];

  function changeTheme(theme: string): void {
    if (theme === 'System' || theme === 'Light' || theme === 'Dark') {
      onchange({ theme: theme as Theme });
    }
  }
</script>

<div class="l-appearance-page">
  <SettingsField label={m['settings.appearance.mode']()} value={themeName(value.theme)}>
    <Segmented
      label={m['settings.appearance.mode']()}
      showLabel={false}
      options={themeOptions}
      value={value.theme}
      onchange={changeTheme}
    />
  </SettingsField>

  <SettingsField label={m['settings.general.palette']()} value={paletteName(value.palette)} divided>
    <PaletteGrid value={value.palette} onchange={(palette) => onchange({ palette })} />
  </SettingsField>

  <SettingsToggle
    title={m['settings.appearance.reduceMotion']()}
    note={m['settings.appearance.reduceMotionHint']()}
    checked={value.reduceMotion}
    divided
    onchange={(reduceMotion) => onchange({ reduceMotion })}
  />
</div>

<style>
  .l-appearance-page {
    display: flex;
    flex-direction: column;
  }
</style>

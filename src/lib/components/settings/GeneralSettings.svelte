<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { Settings } from '../../ipc/types';
  import Segmented from '../../ui/Segmented.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import SettingsGroup from '../SettingsGroup.svelte';
  import LanguagePicker from './LanguagePicker.svelte';
  import PalettePicker from './PalettePicker.svelte';

  let {
    value,
    onchange,
  }: {
    value: Settings['general'];
    onchange: (patch: Partial<Settings['general']>) => void;
  } = $props();

  const themeOptions = [
    { value: 'System', label: m['settings.general.themeSystem']() },
    { value: 'Light', label: m['settings.general.themeLight']() },
    { value: 'Dark', label: m['settings.general.themeDark']() },
  ];

  function changeTheme(theme: string): void {
    if (theme === 'System' || theme === 'Light' || theme === 'Dark') {
      onchange({ theme });
    }
  }
</script>

<SettingsGroup title={m['settings.general.title']()}>
  <Toggle
    label={m['settings.general.launchAtLogin']()}
    checked={value.launchAtLogin}
    onchange={(launchAtLogin) => onchange({ launchAtLogin })}
  />
  <Toggle
    label={m['settings.general.startMinimized']()}
    checked={value.startMinimized}
    onchange={(startMinimized) => onchange({ startMinimized })}
  />
  <Segmented
    label={m['settings.general.theme']()}
    options={themeOptions}
    value={value.theme}
    onchange={changeTheme}
  />
  <PalettePicker value={value.palette} onchange={(palette) => onchange({ palette })} />
  <LanguagePicker value={value.locale} onchange={(locale) => onchange({ locale })} />
</SettingsGroup>

<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { Settings } from '../../ipc/types';
  import { languageValue } from '../../utils/settings-summary.util';
  import SettingsRow from './SettingsRow.svelte';
  import SettingsToggle from './SettingsToggle.svelte';

  let {
    value,
    onchange,
    onlanguage,
  }: {
    value: Settings['general'];
    onchange: (patch: Partial<Settings['general']>) => void;
    onlanguage: () => void;
  } = $props();
</script>

<div class="l-general-page">
  <SettingsRow
    label={m['settings.general.language']()}
    value={languageValue(value.locale)}
    chevron
    onclick={onlanguage}
  />
  <SettingsToggle
    title={m['settings.general.launchAtLogin']()}
    note={m['settings.general.launchAtLoginHint']()}
    checked={value.launchAtLogin}
    divided
    onchange={(launchAtLogin) => onchange({ launchAtLogin })}
  />
  <SettingsToggle
    title={m['settings.general.startMinimized']()}
    note={m['settings.general.startMinimizedHint']()}
    checked={value.startMinimized}
    divided
    onchange={(startMinimized) => onchange({ startMinimized })}
  />
</div>

<style>
  .l-general-page {
    display: flex;
    flex-direction: column;
  }
</style>

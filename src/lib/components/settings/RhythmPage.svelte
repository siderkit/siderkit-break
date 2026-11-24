<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { Settings } from '../../ipc/types';
  import SettingsChips from './SettingsChips.svelte';
  import SettingsField from './SettingsField.svelte';
  import SettingsToggle from './SettingsToggle.svelte';

  let {
    value,
    onchange,
  }: {
    value: Settings['timer'];
    onchange: (patch: Partial<Settings['timer']>) => void;
  } = $props();

  const focusPresets = [15, 25, 30, 45, 60];
  const shortPresets = [1, 2, 3, 5, 10, 15];
  const longPresets = [3, 5, 10, 15, 20, 30];
  const intervalPresets = [2, 3, 4, 5, 6];
  const minutes = (count: number): string => `${count} ${m['common.unit.minutes']()}`;
  const rounds = (count: number): string => `${count} ${m['common.unit.rounds']()}`;
</script>

<div class="l-rhythm-page">
  <SettingsField label={m['settings.timer.focusMinutes']()} value={minutes(value.focusMinutes)}>
    <SettingsChips
      label={m['settings.timer.focusMinutes']()}
      options={focusPresets}
      value={value.focusMinutes}
      onselect={(focusMinutes) => onchange({ focusMinutes })}
    />
  </SettingsField>

  <SettingsField
    label={m['settings.timer.shortBreakMinutes']()}
    value={minutes(value.shortBreakMinutes)}
    divided
  >
    <SettingsChips
      label={m['settings.timer.shortBreakMinutes']()}
      options={shortPresets}
      value={value.shortBreakMinutes}
      onselect={(shortBreakMinutes) => onchange({ shortBreakMinutes })}
    />
  </SettingsField>

  <SettingsField
    label={m['settings.timer.longBreakMinutes']()}
    value={minutes(value.longBreakMinutes)}
    divided
  >
    <SettingsChips
      label={m['settings.timer.longBreakMinutes']()}
      options={longPresets}
      value={value.longBreakMinutes}
      onselect={(longBreakMinutes) => onchange({ longBreakMinutes })}
    />
  </SettingsField>

  <SettingsField
    label={m['settings.timer.longBreakEvery']()}
    value={rounds(value.longBreakEvery)}
    divided
  >
    <SettingsChips
      label={m['settings.timer.longBreakEvery']()}
      options={intervalPresets}
      value={value.longBreakEvery}
      onselect={(longBreakEvery) => onchange({ longBreakEvery })}
    />
  </SettingsField>

  <SettingsToggle
    title={m['settings.timer.autoStartBreaks']()}
    checked={value.autoStartBreaks}
    divided
    onchange={(autoStartBreaks) => onchange({ autoStartBreaks })}
  />
  <SettingsToggle
    title={m['settings.timer.autoStartFocus']()}
    checked={value.autoStartFocus}
    divided
    onchange={(autoStartFocus) => onchange({ autoStartFocus })}
  />
</div>

<style>
  .l-rhythm-page {
    display: flex;
    flex-direction: column;
  }
</style>

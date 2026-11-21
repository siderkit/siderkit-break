<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { Settings } from '../../ipc/types';
  import PresetChips from '../../ui/PresetChips.svelte';
  import Stepper from '../../ui/Stepper.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import SettingsGroup from '../SettingsGroup.svelte';

  let {
    value,
    onchange,
  }: {
    value: Settings['timer'];
    onchange: (patch: Partial<Settings['timer']>) => void;
  } = $props();

  const focusPresets = [15, 25, 30, 45, 60];
  const shortBreakPresets = [1, 2, 3, 5, 10, 15];
  const longBreakPresets = [3, 5, 10, 15, 20, 30];
  const intervalPresets = [2, 3, 4, 5, 6];
  const format = (minutes: number): string => String(minutes);
</script>

<SettingsGroup title={m['settings.timer.title']()}>
  <Stepper
    label={m['settings.timer.focusMinutes']()}
    value={value.focusMinutes}
    min={1}
    max={60}
    suffix={m['common.unit.minutes']()}
    onchange={(focusMinutes) => onchange({ focusMinutes })}
  />
  <PresetChips
    label={m['settings.timer.presetLabel']()}
    options={focusPresets}
    value={value.focusMinutes}
    {format}
    onselect={(focusMinutes) => onchange({ focusMinutes })}
  />
  <Stepper
    label={m['settings.timer.shortBreakMinutes']()}
    value={value.shortBreakMinutes}
    min={1}
    max={60}
    suffix={m['common.unit.minutes']()}
    onchange={(shortBreakMinutes) => onchange({ shortBreakMinutes })}
  />
  <PresetChips
    label={m['settings.timer.presetLabel']()}
    options={shortBreakPresets}
    value={value.shortBreakMinutes}
    {format}
    onselect={(shortBreakMinutes) => onchange({ shortBreakMinutes })}
  />
  <Stepper
    label={m['settings.timer.longBreakMinutes']()}
    value={value.longBreakMinutes}
    min={1}
    max={60}
    suffix={m['common.unit.minutes']()}
    onchange={(longBreakMinutes) => onchange({ longBreakMinutes })}
  />
  <PresetChips
    label={m['settings.timer.presetLabel']()}
    options={longBreakPresets}
    value={value.longBreakMinutes}
    {format}
    onselect={(longBreakMinutes) => onchange({ longBreakMinutes })}
  />
  <Stepper
    label={m['settings.timer.longBreakEvery']()}
    value={value.longBreakEvery}
    min={2}
    max={12}
    suffix={m['common.unit.rounds']()}
    onchange={(longBreakEvery) => onchange({ longBreakEvery })}
  />
  <PresetChips
    label={m['settings.timer.presetLabel']()}
    options={intervalPresets}
    value={value.longBreakEvery}
    {format}
    onselect={(longBreakEvery) => onchange({ longBreakEvery })}
  />
  <p class="l-timer-settings__hint">{m['settings.timer.limitHint']()}</p>
  <Toggle
    label={m['settings.timer.autoStartBreaks']()}
    checked={value.autoStartBreaks}
    onchange={(autoStartBreaks) => onchange({ autoStartBreaks })}
  />
  <Toggle
    label={m['settings.timer.autoStartFocus']()}
    checked={value.autoStartFocus}
    onchange={(autoStartFocus) => onchange({ autoStartFocus })}
  />
</SettingsGroup>

<style>
  .l-timer-settings__hint {
    margin: 0;
    padding-block-end: var(--sk-space-sm);
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }
</style>

<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { Settings } from '../../ipc/types';
  import OverlaySizePicker from './OverlaySizePicker.svelte';
  import SettingsField from './SettingsField.svelte';
  import SettingsRow from './SettingsRow.svelte';
  import SettingsSlider from './SettingsSlider.svelte';
  import SettingsToggle from './SettingsToggle.svelte';

  let {
    value,
    onchange,
    onlocate,
    onreset,
  }: {
    value: Settings['overlay'];
    onchange: (patch: Partial<Settings['overlay']>) => void;
    onlocate: () => void;
    onreset: () => void;
  } = $props();

  const pixels: Record<Settings['overlay']['size'], string> = {
    S: '96×32',
    M: '136×40',
    L: '180×52',
  };
</script>

<div class="l-overlay-page">
  <SettingsToggle
    title={m['settings.overlay.enabled']()}
    note={m['settings.overlay.enabledHint']()}
    checked={value.enabled}
    onchange={(enabled) => onchange({ enabled })}
  />

  {#if value.enabled}
    <SettingsField
      label={m['settings.overlay.size']()}
      value={`${value.size} · ${pixels[value.size]}`}
    >
      <OverlaySizePicker value={value.size} onchange={(size) => onchange({ size })} />
    </SettingsField>

    <SettingsSlider
      label={m['settings.overlay.opacity']()}
      value={value.opacity}
      min={40}
      max={100}
      step={5}
      valueLabel={`${value.opacity}%`}
      onchange={(opacity) => onchange({ opacity })}
    />

    <SettingsRow
      label={m['tray.locateOverlay']()}
      value={m['settings.overlay.locateHint']()}
      chevron
      divided
      onclick={onlocate}
    />
    <SettingsRow
      label={m['settings.overlay.resetPosition']()}
      value={m['settings.overlay.resetHint']()}
      chevron
      onclick={onreset}
    />
  {/if}
</div>

<style>
  .l-overlay-page {
    display: flex;
    flex-direction: column;
    padding-block-start: var(--sk-space-sm);
  }
</style>

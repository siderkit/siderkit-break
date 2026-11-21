<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import { locateOverlay } from '../../ipc/client';
  import type { Settings } from '../../ipc/types';
  import Button from '../../ui/Button.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import SettingsGroup from '../SettingsGroup.svelte';

  let {
    value,
    onchange,
  }: {
    value: Settings['overlay'];
    onchange: (patch: Partial<Settings['overlay']>) => void;
  } = $props();
</script>

<SettingsGroup title={m['settings.overlay.title']()}>
  <Toggle
    label={m['settings.overlay.enabled']()}
    checked={value.enabled}
    onchange={(enabled) => onchange({ enabled })}
  />
  {#if value.enabled}
    <div class="l-overlay-settings__locate">
      <Button size="Sm" variant="Ghost" onclick={() => void locateOverlay()}>
        {m['tray.locateOverlay']()}
      </Button>
    </div>
  {/if}
</SettingsGroup>

<style>
  .l-overlay-settings__locate {
    display: flex;
    justify-content: flex-start;
    margin-block-start: var(--sk-space-sm);
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../../paraglide/messages.js';
  import { isTauri, resetMetricsId } from '../../ipc/client';
  import type { Settings } from '../../ipc/types';
  import { updateStore } from '../../update-store.svelte';
  import Button from '../../ui/Button.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import SettingsGroup from '../SettingsGroup.svelte';
  import UpdateCheck from '../UpdateCheck.svelte';

  let {
    value,
    onchange,
  }: {
    value: Settings['update'];
    onchange: (patch: Partial<Settings['update']>) => void;
  } = $props();

  let resetting = $state(false);

  const skipped = $derived(updateStore.status?.skippedVersion ?? value.skippedVersion);

  onMount(() => {
    void updateStore.init();
  });

  async function resetIdentity(): Promise<void> {
    if (!isTauri) {
      return;
    }
    resetting = true;
    try {
      await resetMetricsId();
    } catch (error) {
      updateStore.fail(error);
    } finally {
      resetting = false;
    }
  }
</script>

<SettingsGroup title={m['update.settings.title']()}>
  <UpdateCheck live />

  <Toggle
    label={m['update.settings.autoCheck']()}
    checked={value.autoCheck}
    onchange={(autoCheck) => onchange({ autoCheck })}
  />

  {#if skipped}
    <div class="l-update-settings__row">
      <p class="l-update-settings__line">
        {m['update.settings.skipped']({ version: skipped })}
      </p>
      <div class="l-update-settings__action">
        <Button variant="Ghost" size="Sm" onclick={() => void updateStore.restoreSkipped()}>
          {m['update.action.showAgain']()}
        </Button>
      </div>
    </div>
  {/if}

  <Toggle
    label={m['update.settings.metrics']()}
    checked={value.metrics}
    onchange={(metrics) => onchange({ metrics })}
  />
  <div class="l-update-settings__row">
    <p class="l-update-settings__hint">{m['update.settings.metricsHint']()}</p>
    <div class="l-update-settings__action">
      <Button variant="Ghost" size="Sm" disabled={resetting} onclick={() => void resetIdentity()}>
        {m['update.settings.resetId']()}
      </Button>
    </div>
  </div>
</SettingsGroup>

<style>
  .l-update-settings__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-sm) var(--sk-space-md);
    padding-block: var(--sk-space-2xs);
  }

  .l-update-settings__action {
    flex: 0 0 auto;
    margin-inline-start: auto;
    white-space: nowrap;
  }

  .l-update-settings__line {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
  }

  .l-update-settings__hint {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    line-height: var(--sk-leading-normal);
  }
</style>

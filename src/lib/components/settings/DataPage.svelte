<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../../paraglide/messages.js';
  import { formatBytes } from '../../utils/diagnostics.util';
  import { clearHistory, getDiagnostics, isTauri } from '../../ipc/client';
  import type { Settings } from '../../ipc/types';
  import { timerStore } from '../../state/timer.store.svelte.ts';
  import ConfirmDialog from '../../ui/ConfirmDialog.svelte';
  import HistoryExportDialog from '../HistoryExportDialog.svelte';
  import SettingsRow from './SettingsRow.svelte';
  import SettingsToggle from './SettingsToggle.svelte';

  let {
    value,
    onchange,
    ondiagnostics,
  }: {
    value: Settings['update'];
    onchange: (patch: Partial<Settings['update']>) => Promise<void> | void;
    ondiagnostics: () => void;
  } = $props();

  let logSize = $state(0);
  let exportOpen = $state(false);
  let confirmOpen = $state(false);
  let clearing = $state(false);
  let clearError = $state<string | null>(null);
  let cleared = $state(false);

  onMount(() => {
    if (!isTauri) {
      return;
    }
    void getDiagnostics()
      .then((data) => {
        logSize = data.logSize;
      })
      .catch(() => {
        logSize = 0;
      });
  });

  async function clear(): Promise<void> {
    clearing = true;
    clearError = null;
    try {
      await clearHistory();
      await timerStore.refreshSummary();
      confirmOpen = false;
      cleared = true;
    } catch (reason) {
      clearError = reason instanceof Error ? reason.message : String(reason);
    } finally {
      clearing = false;
    }
  }
</script>

<div class="l-data-page">
  <SettingsToggle
    title={m['update.settings.metrics']()}
    note={m['update.settings.metricsHint']()}
    checked={value.metrics}
    onchange={(metrics) => onchange({ metrics })}
  />
  <SettingsToggle
    title={m['update.settings.autoCheck']()}
    checked={value.autoCheck}
    divided
    onchange={(autoCheck) => onchange({ autoCheck })}
  />

  <SettingsRow
    label={m['settings.data.export']()}
    value={m['settings.data.exportValue']()}
    chevron
    divided
    onclick={() => (exportOpen = true)}
  />
  <SettingsRow
    label={m['settings.data.diagnostics']()}
    value={m['settings.data.logs']({ size: formatBytes(logSize) })}
    chevron
    divided
    onclick={ondiagnostics}
  />
  <SettingsRow
    label={m['settings.data.clear']()}
    danger
    divided
    onclick={() => {
      clearError = null;
      confirmOpen = true;
    }}
  />

  <p class="l-data-page__caption">{m['settings.data.clearHint']()}</p>
  {#if cleared}
    <p class="l-data-page__status" role="status">{m['settings.data.cleared']()}</p>
  {/if}
</div>

{#if exportOpen}
  <HistoryExportDialog onback={() => (exportOpen = false)} />
{/if}

{#if confirmOpen}
  <ConfirmDialog
    title={m['settings.data.clearTitle']()}
    body={m['settings.data.clearBody']()}
    confirmLabel={m['settings.data.clearConfirm']()}
    danger
    busy={clearing}
    error={clearError}
    onconfirm={() => void clear()}
    oncancel={() => (confirmOpen = false)}
  />
{/if}

<style>
  .l-data-page {
    display: flex;
    flex-direction: column;
  }

  .l-data-page__caption {
    margin: var(--sk-space-sm) 0 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    line-height: var(--sk-leading-normal);
  }

  .l-data-page__status {
    margin: var(--sk-space-xs) var(--sk-space-sm) 0;
    color: hsl(var(--sk-color-brand));
    font-size: var(--sk-text-xs);
  }
</style>

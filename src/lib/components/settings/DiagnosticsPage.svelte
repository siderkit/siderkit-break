<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import { m } from '../../../paraglide/messages.js';
  import { diagnosticsText, formatBytes } from '../../utils/diagnostics.util';
  import { clearLogs, getDiagnostics, isTauri, openLogDir, resetMetricsId } from '../../ipc/client';
  import type { Diagnostics } from '../../ipc/types';
  import ConfirmDialog from '../../ui/ConfirmDialog.svelte';
  import SettingsRow from './SettingsRow.svelte';

  let data = $state<Diagnostics | null>(null);
  let copied = $state(false);
  let copyError = $state(false);
  let clearOpen = $state(false);
  let clearing = $state(false);
  let clearError = $state<string | null>(null);
  let idReset = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    void refresh();
  });

  onDestroy(() => {
    if (copyTimer) {
      clearTimeout(copyTimer);
    }
  });

  async function refresh(): Promise<void> {
    if (!isTauri) {
      return;
    }
    try {
      data = await getDiagnostics();
    } catch {
      data = null;
    }
  }

  async function copy(): Promise<void> {
    if (!data) {
      return;
    }
    copyError = false;
    try {
      await navigator.clipboard.writeText(diagnosticsText(data));
      copied = true;
      if (copyTimer) {
        clearTimeout(copyTimer);
      }
      copyTimer = setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
      copyError = true;
    }
  }

  async function clearLogFiles(): Promise<void> {
    clearing = true;
    clearError = null;
    try {
      await clearLogs();
      clearOpen = false;
      await refresh();
    } catch (reason) {
      clearError = reason instanceof Error ? reason.message : String(reason);
    } finally {
      clearing = false;
    }
  }

  async function resetIdentity(): Promise<void> {
    if (!isTauri) {
      return;
    }
    idReset = false;
    try {
      await resetMetricsId();
      idReset = true;
    } catch {
      idReset = false;
    }
  }

  function openLogs(): void {
    if (isTauri) {
      void openLogDir();
    }
  }

  function openClear(): void {
    if (isTauri) {
      clearOpen = true;
    }
  }
</script>

<div class="l-diagnostics-page">
  <SettingsRow
    label={m['settings.diagnostics.copy']()}
    value={copied ? m['settings.diagnostics.copied']() : ''}
    chevron
    onclick={() => void copy()}
  />
  <SettingsRow
    label={m['settings.diagnostics.openLogs']()}
    value={data ? formatBytes(data.logSize) : ''}
    chevron
    divided
    onclick={openLogs}
  />
  <SettingsRow label={m['settings.diagnostics.clearLogs']()} chevron divided onclick={openClear} />
  <SettingsRow
    label={m['update.settings.resetId']()}
    value={idReset ? m['settings.diagnostics.idReset']() : ''}
    chevron
    divided
    onclick={() => void resetIdentity()}
  />

  {#if copyError}
    <p class="l-diagnostics-page__error" role="alert">{m['settings.diagnostics.copyError']()}</p>
  {/if}
  <p class="l-diagnostics-page__caption">{m['settings.diagnostics.caption']()}</p>
</div>

{#if clearOpen}
  <ConfirmDialog
    title={m['settings.diagnostics.clearTitle']()}
    body={m['settings.diagnostics.clearBody']()}
    confirmLabel={m['settings.diagnostics.clearConfirm']()}
    busy={clearing}
    error={clearError}
    onconfirm={() => void clearLogFiles()}
    oncancel={() => (clearOpen = false)}
  />
{/if}

<style>
  .l-diagnostics-page {
    display: flex;
    flex-direction: column;
  }

  .l-diagnostics-page__error {
    margin: var(--sk-space-xs) var(--sk-space-sm) 0;
    color: hsl(var(--sk-color-alert));
    font-size: var(--sk-text-xs);
  }

  .l-diagnostics-page__caption {
    margin: var(--sk-space-lg) 0 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    line-height: var(--sk-leading-normal);
  }
</style>

<script lang="ts">
  import { onDestroy } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { fileNameOf } from '../utils/export/export.util';
  import { HistoryExportState } from '../state/history-export.store.svelte.ts';
  import { isTauri } from '../ipc/client';
  import ActionBar from '../ui/ActionBar.svelte';
  import Button from '../ui/Button.svelte';
  import HistoryExportOptions from './HistoryExportOptions.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const state = new HistoryExportState();

  $effect(() => {
    void state.refreshPreview();
  });

  onDestroy(() => {
    state.dispose();
  });
</script>

<div class="l-history-export">
  <HistoryExportOptions {state} />

  {#if state.exporting}
    <div class="l-history-export__progress" role="status" aria-live="polite">
      <span>{m['history.exportingProgress']({ percent: state.progress })}</span>
      <div class="l-history-export__track">
        <div class="l-history-export__bar" style:inline-size="{state.progress}%"></div>
      </div>
      <div class="l-history-export__progress-actions">
        <Button variant="Ghost" size="Sm" onclick={() => state.cancel()}>
          {m['history.exportCancel']()}
        </Button>
      </div>
    </div>
  {/if}

  {#if state.cancelled}
    <p class="l-history-export__saved" role="status">{m['history.exportCancelled']()}</p>
  {/if}

  {#if state.exportError}
    <p class="l-history-export__error" role="alert">{state.exportError}</p>
  {/if}

  {#if state.savedPath}
    <p class="l-history-export__saved" role="status" aria-live="polite">
      {m['history.exportSaved']({ name: fileNameOf(state.savedPath) })}
      {#if isTauri}
        <Button variant="Ghost" size="Sm" onclick={() => void state.reveal()}>
          {m['history.exportReveal']()}
        </Button>
      {/if}
    </p>
  {/if}

  <ActionBar {onclose}>
    <Button
      variant="Primary"
      size="Sm"
      disabled={state.exporting || state.previewing || !state.range}
      onclick={() => void state.startExport(new Date())}
    >
      {#if state.exporting}
        {m['history.exporting']()}
      {:else if state.confirming}
        {m['history.exportConfirm']()}
      {:else}
        {m['history.export']()}
      {/if}
    </Button>
  </ActionBar>
</div>

<style>
  .l-history-export {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
  }

  .l-history-export__progress {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-3xs);
    font-size: var(--sk-text-xs);
  }

  .l-history-export__track {
    overflow: hidden;
    block-size: var(--sk-progress-height);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-bg-app));
  }

  .l-history-export__bar {
    block-size: 100%;
    border-radius: inherit;
    background: hsl(var(--sk-color-brand));
    transition: inline-size var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-history-export__progress-actions {
    display: flex;
    justify-content: flex-start;
  }

  .l-history-export__saved {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-history-export__error {
    margin: 0;
    padding: var(--sk-space-sm);
    border-radius: var(--sk-radius-sm);
    color: hsl(var(--sk-color-break));
    background: hsl(var(--sk-color-break-soft) / 0.6);
    font-size: var(--sk-text-xs);
  }
</style>

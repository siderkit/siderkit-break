<script lang="ts">
  import { onDestroy } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { fileNameOf } from '../export';
  import { HistoryExportState } from '../history-export.svelte';
  import { isTauri } from '../ipc/client';
  import Button from '../ui/Button.svelte';
  import HistoryExportOptions from './HistoryExportOptions.svelte';

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
      <button class="l-history-export__cancel" type="button" onclick={() => state.cancel()}>
        {m['history.exportCancel']()}
      </button>
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
        <button class="l-history-export__reveal" type="button" onclick={() => void state.reveal()}>
          {m['history.exportReveal']()}
        </button>
      {/if}
    </p>
  {/if}

  <div class="l-history-export__actions">
    <Button
      variant="Primary"
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
  </div>
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

  .l-history-export__cancel {
    align-self: flex-end;
    padding: 0;
    border: 0;
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-xs);
    text-decoration: underline;
  }

  .l-history-export__saved {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-history-export__reveal {
    padding: 0;
    border: 0;
    color: hsl(var(--sk-color-brand));
    background: transparent;
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    text-decoration: underline;
  }

  .l-history-export__reveal:hover {
    color: hsl(var(--sk-color-brand-strong));
  }

  .l-history-export__error {
    margin: 0;
    padding: var(--sk-space-sm);
    border-radius: var(--sk-radius-sm);
    color: hsl(var(--sk-color-break));
    background: hsl(var(--sk-color-break-soft) / 0.6);
    font-size: var(--sk-text-xs);
  }

  .l-history-export__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--sk-space-sm);
  }
</style>

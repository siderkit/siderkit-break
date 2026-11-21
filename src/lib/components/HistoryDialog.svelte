<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import HistoryExportDialog from './HistoryExportDialog.svelte';
  import HistoryList from './HistoryList.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let dialog = $state<HTMLDialogElement>();
  let exportOpen = $state(false);

  onMount(() => {
    dialog?.showModal();
  });
</script>

<dialog class="l-history-dialog" bind:this={dialog} aria-labelledby="history-title" {onclose}>
  <div class="l-history-dialog__card">
    <header class="l-history-dialog__header">
      <h2 class="l-history-dialog__title" id="history-title">{m['history.title']()}</h2>
      <div class="l-history-dialog__actions">
        <button class="l-history-dialog__link" type="button" onclick={() => (exportOpen = true)}>
          {m['history.exportLink']()}
        </button>
        <button class="l-history-dialog__close" type="button" onclick={() => dialog?.close()}>
          {m['common.action.close']()}
        </button>
      </div>
    </header>

    <div class="l-history-dialog__body">
      <HistoryList covered={exportOpen} />
    </div>
  </div>
</dialog>

{#if exportOpen}
  <HistoryExportDialog onback={() => (exportOpen = false)} />
{/if}

<style>
  .l-history-dialog {
    inline-size: var(--sk-dialog-inline-size-wide);
    max-block-size: var(--sk-dialog-max-block-size);
    padding: 0;
    overflow: hidden;
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
  }

  .l-history-dialog::backdrop {
    background: hsl(var(--sk-color-overlay-surface));
    -webkit-backdrop-filter: blur(var(--sk-overlay-blur));
    backdrop-filter: blur(var(--sk-overlay-blur));
  }

  .l-history-dialog__card {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-md);
    block-size: var(--sk-history-dialog-block-size);
    max-block-size: var(--sk-dialog-max-block-size);
    padding: var(--sk-space-lg);
    overflow: hidden;
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-history-dialog__header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-md);
  }

  .l-history-dialog__title {
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-history-dialog__actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--sk-space-sm);
  }

  .l-history-dialog__link {
    padding: var(--sk-space-3xs) 0;
    border: 0;
    color: hsl(var(--sk-color-brand));
    background: transparent;
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    text-decoration: underline;
    text-underline-offset: var(--sk-space-3xs);
  }

  .l-history-dialog__link:hover {
    color: hsl(var(--sk-color-brand-strong));
  }

  .l-history-dialog__close {
    padding: var(--sk-space-2xs) var(--sk-space-sm);
    border: 0;
    border-radius: var(--sk-radius-xs);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-xs);
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-history-dialog__close:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft) / 0.55);
  }

  .l-history-dialog__body {
    flex: 1 1 auto;
    min-block-size: 0;
    overflow: hidden;
  }
</style>

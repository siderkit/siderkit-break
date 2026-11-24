<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import ActionBar from '../ui/ActionBar.svelte';
  import Button from '../ui/Button.svelte';
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
    </header>

    <div class="l-history-dialog__body">
      <HistoryList covered={exportOpen} />
    </div>

    <ActionBar onclose={() => dialog?.close()}>
      <Button variant="Primary" size="Sm" onclick={() => (exportOpen = true)}>
        {m['history.exportLink']()}
      </Button>
    </ActionBar>
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
    gap: var(--sk-space-md);
  }

  .l-history-dialog__title {
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-history-dialog__body {
    flex: 1 1 auto;
    min-block-size: 0;
    overflow: hidden;
  }
</style>

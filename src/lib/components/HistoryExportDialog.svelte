<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import HistoryExport from './HistoryExport.svelte';

  let { onback }: { onback: () => void } = $props();

  let dialog = $state<HTMLDialogElement>();

  onMount(() => {
    dialog?.showModal();
  });

  function handleCancel(event: Event): void {
    event.preventDefault();
    dialog?.close();
  }
</script>

<dialog
  class="l-export-dialog"
  bind:this={dialog}
  aria-labelledby="export-title"
  onclose={onback}
  oncancel={handleCancel}
>
  <div class="l-export-dialog__card">
    <header class="l-export-dialog__header">
      <h2 class="l-export-dialog__title" id="export-title">{m['common.action.export']()}</h2>
    </header>

    <div class="l-export-dialog__body">
      <HistoryExport onclose={() => dialog?.close()} />
    </div>
  </div>
</dialog>

<style>
  .l-export-dialog {
    inline-size: var(--sk-dialog-inline-size-wide);
    max-block-size: var(--sk-dialog-max-block-size);
    padding: 0;
    overflow: hidden;
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
  }

  .l-export-dialog::backdrop {
    background: hsl(var(--sk-color-overlay-surface));
    -webkit-backdrop-filter: blur(var(--sk-overlay-blur));
    backdrop-filter: blur(var(--sk-overlay-blur));
  }

  .l-export-dialog__card {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-md);
    max-block-size: var(--sk-dialog-max-block-size);
    padding: var(--sk-space-lg);
    overflow: hidden;
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-export-dialog__header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-md);
  }

  .l-export-dialog__title {
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-export-dialog__body {
    flex: 1 1 auto;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
</style>

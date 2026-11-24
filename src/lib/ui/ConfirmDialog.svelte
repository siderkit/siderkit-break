<script lang="ts">
  import { onMount } from 'svelte';

  import ActionBar from './ActionBar.svelte';
  import Button from './Button.svelte';

  let {
    title,
    body,
    confirmLabel,
    danger = false,
    busy = false,
    error = null,
    onconfirm,
    oncancel,
  }: {
    title: string;
    body: string;
    confirmLabel: string;
    danger?: boolean;
    busy?: boolean;
    error?: string | null;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();

  onMount(() => {
    dialog?.showModal();
  });

  function cancel(event: Event): void {
    event.preventDefault();
    if (!busy) {
      oncancel();
    }
  }
</script>

<dialog class="l-confirm-dialog" bind:this={dialog} oncancel={cancel}>
  <div class="l-confirm-dialog__card" role="alertdialog" aria-labelledby="confirm-title">
    <h2 class="l-confirm-dialog__title" id="confirm-title">{title}</h2>
    <p class="l-confirm-dialog__body">{body}</p>
    {#if error}
      <p class="l-confirm-dialog__error" role="alert">{error}</p>
    {/if}
    <ActionBar onclose={oncancel} closeDisabled={busy}>
      <Button variant={danger ? 'Danger' : 'Primary'} size="Sm" disabled={busy} onclick={onconfirm}>
        {confirmLabel}
      </Button>
    </ActionBar>
  </div>
</dialog>

<style>
  .l-confirm-dialog {
    inline-size: var(--sk-dialog-inline-size);
    padding: 0;
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
  }

  .l-confirm-dialog::backdrop {
    background: hsl(var(--sk-color-overlay-surface));
    -webkit-backdrop-filter: blur(var(--sk-overlay-blur));
    backdrop-filter: blur(var(--sk-overlay-blur));
  }

  .l-confirm-dialog__card {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-lg);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-confirm-dialog__title {
    margin: 0;
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-confirm-dialog__body {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
    line-height: var(--sk-leading-normal);
  }

  .l-confirm-dialog__error {
    margin: 0;
    color: hsl(var(--sk-color-alert));
    font-size: var(--sk-text-xs);
  }
</style>

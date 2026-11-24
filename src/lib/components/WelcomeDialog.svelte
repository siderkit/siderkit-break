<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import ActionBar from '../ui/ActionBar.svelte';
  import Button from '../ui/Button.svelte';

  let {
    pendingBreak,
    onstart,
    onskip,
    ondismiss,
  }: {
    pendingBreak: boolean;
    onstart: () => void;
    onskip: () => void;
    ondismiss: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  });
</script>

<dialog
  class="l-welcome-dialog"
  bind:this={dialog}
  aria-labelledby="welcome-title"
  onclose={ondismiss}
>
  <div class="l-welcome-dialog__card">
    <h2 class="l-welcome-dialog__title" id="welcome-title">{m['welcome.title']()}</h2>
    <p class="l-welcome-dialog__body">{m['welcome.body']()}</p>
    <ActionBar
      onclose={onskip}
      closeLabel={pendingBreak ? m['welcome.skipBreak']() : m['common.action.close']()}
    >
      <Button variant="Primary" size="Sm" onclick={onstart}>
        {pendingBreak ? m['welcome.startBreak']() : m['timer.action.startFocus']()}
      </Button>
    </ActionBar>
  </div>
</dialog>

<style>
  .l-welcome-dialog {
    inline-size: 86%;
    padding: 0;
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
  }

  .l-welcome-dialog::backdrop {
    background: hsl(var(--sk-color-overlay-surface));
    -webkit-backdrop-filter: blur(var(--sk-overlay-blur));
    backdrop-filter: blur(var(--sk-overlay-blur));
  }

  .l-welcome-dialog__card {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-md);
    inline-size: 100%;
    padding: var(--sk-space-xl);
    border: var(--sk-edge) solid hsl(var(--sk-color-break));
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-welcome-dialog__title {
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-welcome-dialog__body {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
  }
</style>

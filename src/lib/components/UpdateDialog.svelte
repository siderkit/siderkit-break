<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { downloadPercent, formatDownloadSize } from '../utils/update/update-format.util';
  import { updateStore } from '../state/update.store.svelte.ts';
  import ActionBar from '../ui/ActionBar.svelte';
  import Button from '../ui/Button.svelte';

  const status = $derived(updateStore.status);
  const visible = $derived(updateStore.visible && status !== null);
  const phase = $derived(status?.phase ?? 'Idle');
  const percent = $derived(status ? downloadPercent(status.downloaded, status.total) : 0);
  const size = $derived(status ? formatDownloadSize(status.downloaded, status.total) : '');

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    if (visible) {
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
      return;
    }
    dialog?.close();
  });
</script>

{#if visible && status}
  <dialog
    class="l-update-dialog"
    bind:this={dialog}
    aria-labelledby="update-dialog-title"
    onclose={() => {
      // A user close (Esc) records the dismissal; the programmatic close that
      // follows an already-invisible state must not, or a later snooze expiry
      // would stay suppressed.
      if (updateStore.visible) {
        updateStore.dismiss();
      }
    }}
  >
    <div class="l-update-dialog__card">
      <h2 class="l-update-dialog__title" id="update-dialog-title">
        {#if phase === 'Ready'}
          {m['update.tray.ready']({ version: status.version ?? '' })}
        {:else}
          {m['update.available.title']()}
          {#if status.version}
            <span class="l-update-dialog__version">v{status.version}</span>
          {/if}
        {/if}
      </h2>

      {#if phase === 'Available' && status.notes}
        <p class="l-update-dialog__notes">{status.notes}</p>
      {/if}

      {#if phase === 'Downloading'}
        <div
          class="l-update-dialog__track"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={percent}
          aria-label={m['update.state.downloading']({
            percent: String(percent),
            size,
          })}
        >
          <div class="l-update-dialog__fill" style:width={`${percent}%`}></div>
        </div>
      {/if}

      <p class="l-update-dialog__line">
        {#if phase === 'Downloading'}
          {m['update.state.downloading']({ percent: String(percent), size })}
        {:else if phase === 'Ready'}
          {m['update.state.ready']({ version: status.version ?? '' })}
        {:else if phase === 'Installing'}
          {m['update.state.installing']()}
        {:else if phase === 'Failed'}
          {m['update.state.failed']()}
        {:else}
          {m['update.state.available']({ version: status.version ?? '' })}
        {/if}
      </p>

      {#if updateStore.error}
        <p class="l-update-dialog__error" role="alert">{updateStore.error}</p>
      {/if}

      {#if phase === 'Available'}
        <ActionBar onclose={() => void updateStore.skip()} closeLabel={m['update.action.skip']()}>
          <Button variant="Primary" size="Sm" onclick={() => void updateStore.download()}>
            {m['update.action.download']()}
          </Button>
          <Button variant="Secondary" size="Sm" onclick={() => void updateStore.later()}>
            {m['update.action.later']()}
          </Button>
        </ActionBar>
      {:else if phase === 'Downloading'}
        <ActionBar
          onclose={() => void updateStore.cancel()}
          closeLabel={m['update.action.cancel']()}
        />
      {:else if phase === 'Ready'}
        <ActionBar onclose={() => void updateStore.later()} closeLabel={m['update.action.later']()}>
          <Button variant="Primary" size="Sm" onclick={() => updateStore.install()}>
            {m['update.action.restart']()}
          </Button>
        </ActionBar>
      {:else if phase === 'Failed'}
        <ActionBar onclose={() => void updateStore.later()} closeLabel={m['update.action.later']()}>
          <Button variant="Primary" size="Sm" onclick={() => void updateStore.download()}>
            {m['update.action.retry']()}
          </Button>
        </ActionBar>
      {:else}
        <ActionBar onclose={() => updateStore.dismiss()} closeDisabled={true} />
      {/if}
    </div>
  </dialog>
{/if}

<style>
  .l-update-dialog {
    inline-size: 86%;
    padding: 0;
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
  }

  .l-update-dialog::backdrop {
    background: hsl(var(--sk-color-overlay-surface));
    -webkit-backdrop-filter: blur(var(--sk-overlay-blur));
    backdrop-filter: blur(var(--sk-overlay-blur));
  }

  .l-update-dialog__card {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-md);
    inline-size: 100%;
    padding: var(--sk-space-xl);
    border: var(--sk-edge) solid hsl(var(--sk-color-brand) / 0.35);
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-update-dialog__title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--sk-space-xs);
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-update-dialog__version {
    color: hsl(var(--sk-color-brand-strong));
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-medium);
  }

  .l-update-dialog__notes,
  .l-update-dialog__line {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
    line-height: var(--sk-leading-normal);
  }

  .l-update-dialog__notes {
    display: -webkit-box;
    overflow: hidden;
    white-space: pre-line;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }

  .l-update-dialog__track {
    overflow: hidden;
    block-size: var(--sk-space-2xs);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-bg-raised));
  }

  .l-update-dialog__fill {
    block-size: 100%;
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-brand));
    transition: width var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-update-dialog__error {
    margin: 0;
    color: hsl(var(--sk-color-break));
    font-size: var(--sk-text-xs);
  }
</style>

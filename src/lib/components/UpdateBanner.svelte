<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { downloadPercent, formatDownloadSize } from '../update-format';
  import { updateStore } from '../update-store.svelte';
  import Button from '../ui/Button.svelte';

  const status = $derived(updateStore.status);
  const phase = $derived(status?.phase ?? 'Idle');
  const percent = $derived(status ? downloadPercent(status.downloaded, status.total) : 0);
  const size = $derived(status ? formatDownloadSize(status.downloaded, status.total) : '');
</script>

{#if updateStore.visible && status}
  <section class="l-update-banner" role="status" aria-live="polite">
    <div class="l-update-banner__head">
      <p class="l-update-banner__title">
        {#if phase === 'Ready'}
          {m['update.tray.ready']({ version: status.version ?? '' })}
        {:else}
          {m['update.available.title']()}
          {#if status.version}
            <span class="l-update-banner__version">v{status.version}</span>
          {/if}
        {/if}
      </p>
      {#if phase !== 'Installing'}
        <button
          class="l-update-banner__dismiss"
          type="button"
          aria-label={m['update.action.dismiss']()}
          onclick={() => updateStore.dismiss()}
        >
          ×
        </button>
      {/if}
    </div>

    {#if phase === 'Available' && status.notes}
      <p class="l-update-banner__notes">{status.notes}</p>
    {/if}

    {#if phase === 'Downloading'}
      <div
        class="l-update-banner__track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percent}
        aria-label={m['update.state.downloading']({
          percent: String(percent),
          size,
        })}
      >
        <div class="l-update-banner__fill" style:width={`${percent}%`}></div>
      </div>
      <p class="l-update-banner__line">
        {m['update.state.downloading']({ percent: String(percent), size })}
      </p>
    {:else if phase === 'Ready'}
      <p class="l-update-banner__line">
        {m['update.state.ready']({ version: status.version ?? '' })}
      </p>
    {:else if phase === 'Installing'}
      <p class="l-update-banner__line">{m['update.state.installing']()}</p>
    {:else if phase === 'Failed'}
      <p class="l-update-banner__line">{m['update.state.failed']()}</p>
    {/if}

    {#if updateStore.error}
      <p class="l-update-banner__error" role="alert">{updateStore.error}</p>
    {/if}

    <div class="l-update-banner__actions">
      {#if phase === 'Available'}
        <Button variant="Primary" size="Sm" onclick={() => void updateStore.download()}>
          {m['update.action.download']()}
        </Button>
        <Button variant="Secondary" size="Sm" onclick={() => void updateStore.later()}>
          {m['update.action.later']()}
        </Button>
        <Button variant="Ghost" size="Sm" onclick={() => void updateStore.skip()}>
          {m['update.action.skip']()}
        </Button>
      {:else if phase === 'Downloading'}
        <Button variant="Secondary" size="Sm" onclick={() => void updateStore.cancel()}>
          {m['update.action.cancel']()}
        </Button>
      {:else if phase === 'Ready'}
        <Button variant="Primary" size="Sm" onclick={() => updateStore.install()}>
          {m['update.action.restart']()}
        </Button>
        <Button variant="Secondary" size="Sm" onclick={() => void updateStore.later()}>
          {m['update.action.later']()}
        </Button>
      {:else if phase === 'Failed'}
        <Button variant="Primary" size="Sm" onclick={() => void updateStore.download()}>
          {m['update.action.retry']()}
        </Button>
        <Button variant="Secondary" size="Sm" onclick={() => void updateStore.later()}>
          {m['update.action.later']()}
        </Button>
      {/if}
    </div>
  </section>
{/if}

<style>
  .l-update-banner {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-sm);
    margin: var(--sk-space-md) var(--sk-space-lg) 0;
    padding: var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-brand) / 0.35);
    border-radius: var(--sk-radius-md);
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-update-banner__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sk-space-sm);
  }

  .l-update-banner__title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--sk-space-2xs);
    margin: 0;
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-semibold);
  }

  .l-update-banner__version {
    color: hsl(var(--sk-color-brand-strong));
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-medium);
  }

  .l-update-banner__dismiss {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    inline-size: var(--sk-icon-button-size);
    block-size: var(--sk-icon-button-size);
    padding: 0;
    border: 0;
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-lg);
    line-height: var(--sk-leading-tight);
  }

  .l-update-banner__dismiss:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-bg-raised) / 0.6);
  }

  .l-update-banner__notes,
  .l-update-banner__line {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
    line-height: var(--sk-leading-normal);
  }

  .l-update-banner__notes {
    display: -webkit-box;
    overflow: hidden;
    white-space: pre-line;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .l-update-banner__track {
    overflow: hidden;
    block-size: var(--sk-space-2xs);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-bg-raised));
  }

  .l-update-banner__fill {
    block-size: 100%;
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-brand));
    transition: width var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-update-banner__error {
    margin: 0;
    color: hsl(var(--sk-color-break));
    font-size: var(--sk-text-xs);
  }

  .l-update-banner__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sk-space-xs);
  }
</style>

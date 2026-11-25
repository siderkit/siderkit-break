<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { isTauri } from '../ipc/client';
  import { updateStore } from '../state/update.store.svelte.ts';
  import { formatDownloadSize } from '../utils/update/update-format.util';
  import { presentUpdate } from '../utils/update/update-status.util';
  import { formatRelative } from '../utils/time/time.util';
  import type { UpdatePhase } from '../ipc/types';
  import Button from '../ui/Button.svelte';

  let { live = false, showVersion = true }: { live?: boolean; showVersion?: boolean } = $props();

  const status = $derived(updateStore.status);
  const presentation = $derived(presentUpdate(status));
  const percent = $derived(presentation.percent);
  const determinate = $derived((status?.total ?? 0) > 0);
  const sizeText = $derived(status ? formatDownloadSize(status.downloaded, status.total) : '');
  const disabled = $derived(!status || !isTauri || presentation.busy);
  const liveMode = $derived(live && status?.phase !== 'Downloading' ? 'polite' : 'off');

  const detail = $derived.by(() => {
    if (!status?.lastCheckedMs) {
      return '';
    }
    // Always visible once a check exists: hiding it while a check runs made
    // the row change height and the page jump.
    return m['update.state.lastChecked']({
      time: formatRelative(status.lastCheckedMs, updateStore.now),
    });
  });

  const simpleText: Partial<Record<UpdatePhase, () => string>> = {
    Checking: () => m['update.settings.checking'](),
    Installing: () => m['update.state.installing'](),
    UpToDate: () => m['update.state.upToDate'](),
    Failed: () => m['update.state.failed'](),
  };

  function statusText(): string {
    if (!status) {
      return m['update.state.never']();
    }
    if (!status.supported) {
      return m['update.settings.manual']();
    }
    if (status.phase === 'Available') {
      return m['update.state.available']({ version: status.version ?? '' });
    }
    if (status.phase === 'Ready') {
      return m['update.state.ready']({ version: status.version ?? '' });
    }
    if (status.phase === 'Downloading') {
      return m['update.state.downloading']({ percent: String(percent), size: sizeText });
    }
    return simpleText[status.phase]?.() ?? m['update.state.never']();
  }

  function actionLabel(): string {
    if (presentation.busy) {
      return status?.phase === 'Installing'
        ? m['update.state.installing']()
        : m['update.settings.checking']();
    }
    switch (presentation.action) {
      case 'Check':
        return m['update.action.checkNow']();
      case 'Download':
        return m['update.action.download']();
      case 'Cancel':
        return m['update.action.cancel']();
      case 'Restart':
        return m['update.action.restart']();
      case 'Retry':
        return m['update.action.retry']();
      default:
        return '';
    }
  }

  function actionVariant(): 'Primary' | 'Secondary' | 'Ghost' {
    if (presentation.action === 'Download' || presentation.action === 'Restart') {
      return 'Primary';
    }
    return presentation.action === 'Cancel' ? 'Ghost' : 'Secondary';
  }
</script>

<div class="l-update-check">
  {#if showVersion && updateStore.currentVersion}
    <p class="l-update-check__version">
      {m['update.settings.current']({ version: updateStore.currentVersion })}
    </p>
  {/if}

  <div class="l-update-check__status-row">
    <p
      class="l-update-check__status"
      role={live ? 'status' : undefined}
      aria-live={live ? liveMode : undefined}
    >
      <span
        class="l-update-check__dot l-update-check__dot--{presentation.tone.toLowerCase()}"
        aria-hidden="true"
      ></span>
      <span>{statusText()}</span>
    </p>
    {#if presentation.action !== 'None'}
      <div class="l-update-check__action">
        <Button
          variant={actionVariant()}
          size="Sm"
          {disabled}
          onclick={() => updateStore.act(presentation.action)}
        >
          {actionLabel()}
        </Button>
      </div>
    {/if}
  </div>

  {#if detail}
    <p class="l-update-check__detail">{detail}</p>
  {/if}

  {#if status?.phase === 'Downloading'}
    <div
      class="l-update-check__track"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={determinate ? percent : undefined}
      aria-label={m['update.state.downloading']({
        percent: String(percent),
        size: sizeText,
      })}
    >
      <div class="l-update-check__fill" style="inline-size: {percent}%"></div>
    </div>
  {/if}

  {#if updateStore.error}
    <p class="l-update-check__error" role="alert">{updateStore.error}</p>
  {/if}
</div>

<style>
  .l-update-check {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-xs);
  }

  .l-update-check__version {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    font-variant-numeric: tabular-nums;
  }

  .l-update-check__status-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-sm);
  }

  .l-update-check__status {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
    margin: 0;
    font-size: var(--sk-text-sm);
    line-height: var(--sk-leading-normal);
  }

  .l-update-check__dot {
    flex: 0 0 auto;
    inline-size: var(--sk-badge-size);
    block-size: var(--sk-badge-size);
    border-radius: var(--sk-radius-full);
  }

  .l-update-check__dot--muted {
    background: hsl(var(--sk-color-text-muted));
  }

  .l-update-check__dot--brand {
    background: hsl(var(--sk-color-brand));
  }

  .l-update-check__dot--warning {
    background: hsl(var(--sk-color-warning));
  }

  .l-update-check__dot--countdown {
    background: hsl(var(--sk-color-countdown));
  }

  .l-update-check__dot--break {
    background: hsl(var(--sk-color-break));
  }

  .l-update-check__action {
    margin-inline-start: auto;
  }

  .l-update-check__detail {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-update-check__track {
    overflow: hidden;
    block-size: var(--sk-space-3xs);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-countdown) / 0.18);
  }

  .l-update-check__fill {
    inline-size: 0;
    block-size: 100%;
    border-radius: inherit;
    background: hsl(var(--sk-color-countdown));
    transition: inline-size var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-update-check__error {
    margin: 0;
    color: hsl(var(--sk-color-break));
    font-size: var(--sk-text-xs);
  }
</style>

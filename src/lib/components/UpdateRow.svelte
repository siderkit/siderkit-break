<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { isTauri } from '../ipc/client';
  import type { Settings } from '../ipc/types';
  import { formatDownloadSize, formatRelative } from '../utils/update/update-format.util';
  import { presentUpdate } from '../utils/update/update-status.util';
  import { updateStore } from '../state/update.store.svelte.ts';
  import Button from '../ui/Button.svelte';
  import SettingsRow from './settings/SettingsRow.svelte';

  let { value }: { value: Settings['update'] } = $props();

  const status = $derived(updateStore.status);
  const presentation = $derived(presentUpdate(status));
  const skipped = $derived(status?.skippedVersion ?? value.skippedVersion);
  const percent = $derived(presentation.percent);
  const determinate = $derived((status?.total ?? 0) > 0);
  const sizeText = $derived(status ? formatDownloadSize(status.downloaded, status.total) : '');
  const versionText = $derived(status?.version ?? '');
  const canAct = $derived(!!status && isTauri && presentation.action !== 'None');
  const liveMode = $derived(status?.phase === 'Downloading' ? 'off' : 'polite');

  function idleText(): string {
    if (!status) {
      return m['update.state.never']();
    }
    return status.lastCheckedMs
      ? m['update.state.lastChecked']({
          time: formatRelative(status.lastCheckedMs, updateStore.now),
        })
      : m['update.state.never']();
  }

  function phaseText(): string {
    if (!status) {
      return idleText();
    }
    switch (status.phase) {
      case 'Checking':
        return m['update.settings.checking']();
      case 'Available':
        return m['update.tray.available']({ version: versionText });
      case 'Downloading':
        return m['update.state.downloading']({ percent: String(percent), size: sizeText });
      case 'Ready':
        return m['update.tray.ready']({ version: versionText });
      case 'Installing':
        return m['update.state.installing']();
      case 'UpToDate':
        return m['update.state.upToDate']();
      case 'Failed':
        return m['update.state.failed']();
      default:
        return idleText();
    }
  }

  function valueText(): string {
    if (!status) {
      return idleText();
    }
    return status.supported ? phaseText() : m['update.settings.manual']();
  }
</script>

<div aria-live={liveMode}>
  <SettingsRow
    label={m['update.tray.check']()}
    value={valueText()}
    chevron
    divided
    {...canAct ? { onclick: () => updateStore.act(presentation.action) } : {}}
  />
</div>

{#if status?.phase === 'Downloading'}
  <div
    class="l-update-row__track"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={determinate ? percent : undefined}
    aria-label={m['update.state.downloading']({ percent: String(percent), size: sizeText })}
  >
    <div class="l-update-row__fill" style="inline-size: {percent}%"></div>
  </div>
{/if}

{#if updateStore.error}
  <p class="l-update-row__error" role="alert">{updateStore.error}</p>
{/if}

{#if skipped}
  <div class="l-update-row__skipped">
    <p class="l-update-row__note">{m['update.settings.skipped']({ version: skipped })}</p>
    <Button variant="Ghost" size="Sm" onclick={() => void updateStore.restoreSkipped()}>
      {m['update.action.showAgain']()}
    </Button>
  </div>
{/if}

<style>
  .l-update-row__track {
    overflow: hidden;
    block-size: var(--sk-space-2xs);
    margin: var(--sk-space-xs) var(--sk-space-sm) 0;
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-countdown) / 0.18);
  }

  .l-update-row__fill {
    inline-size: 0;
    block-size: 100%;
    border-radius: inherit;
    background: hsl(var(--sk-color-countdown));
    transition: inline-size var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-update-row__error {
    margin: var(--sk-space-xs) var(--sk-space-sm) 0;
    color: hsl(var(--sk-color-break));
    font-size: var(--sk-text-xs);
  }

  .l-update-row__skipped {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-xs);
    margin-block-start: var(--sk-space-xs);
  }

  .l-update-row__note {
    flex: 1 1 auto;
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }
</style>

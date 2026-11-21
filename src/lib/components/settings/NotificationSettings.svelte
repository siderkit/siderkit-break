<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import { isTauri, previewNotificationSound } from '../../ipc/client';
  import type { Settings } from '../../ipc/types';
  import Button from '../../ui/Button.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import SettingsGroup from '../SettingsGroup.svelte';

  let {
    value,
    onchange,
  }: {
    value: Settings['notifications'];
    onchange: (patch: Partial<Settings['notifications']>) => void;
  } = $props();

  let previewing = $state(false);
  let previewError = $state<string | null>(null);
  // The preview always plays the sound so it can be judged before the
  // "play a sound" toggle is turned on.
  const canPreview = $derived(value.enabled);

  function change(patch: Partial<Settings['notifications']>): void {
    previewError = null;
    onchange(patch);
  }

  async function preview(): Promise<void> {
    if (previewing || !isTauri) {
      return;
    }
    previewing = true;
    previewError = null;
    try {
      await previewNotificationSound();
    } catch {
      previewError = m['settings.notifications.previewError']();
    } finally {
      previewing = false;
    }
  }
</script>

<SettingsGroup title={m['settings.notifications.title']()}>
  <Toggle
    label={m['settings.notifications.enabled']()}
    checked={value.enabled}
    onchange={(enabled) => change({ enabled })}
  />
  <Toggle
    label={m['settings.notifications.sound']()}
    checked={value.sound}
    onchange={(sound) => change({ sound })}
  />
  <div class="l-notification-settings__preview">
    <Button variant="Secondary" size="Sm" disabled={!canPreview} onclick={() => void preview()}>
      {m['settings.notifications.preview']()}
    </Button>
    <span class="l-notification-settings__hint">
      {m['settings.notifications.previewHint']()}
    </span>
    {#if previewError}
      <span class="l-notification-settings__error" role="alert">{previewError}</span>
    {/if}
  </div>
</SettingsGroup>

<style>
  .l-notification-settings__preview {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--sk-space-2xs);
    padding-block-start: var(--sk-space-2xs);
  }

  .l-notification-settings__hint {
    max-inline-size: 100%;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-notification-settings__error {
    inline-size: 100%;
    color: hsl(var(--sk-color-break));
    font-size: var(--sk-text-xs);
  }
</style>

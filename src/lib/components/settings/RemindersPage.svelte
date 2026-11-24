<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import { chooseCustomSound, isTauri, previewNotificationSound } from '../../ipc/client';
  import type { Settings, SoundPreset } from '../../ipc/types';
  import { presetName } from '../../settings-summary';
  import SettingsField from './SettingsField.svelte';
  import SettingsSlider from './SettingsSlider.svelte';
  import SettingsToggle from './SettingsToggle.svelte';

  let {
    value,
    onchange,
  }: {
    value: Settings['notifications'];
    onchange: (patch: Partial<Settings['notifications']>) => Promise<void> | void;
  } = $props();

  const presets: SoundPreset[] = ['Chime', 'Soft', 'Bell', 'Custom'];
  let previewing = $state<SoundPreset | null>(null);
  let error = $state<string | null>(null);

  const canPreview = $derived(value.enabled && isTauri);
  const customLabel = $derived.by(() => {
    if (!value.customPath) {
      return m['settings.notifications.custom']();
    }
    const parts = value.customPath.split(/[\\/]/);
    return parts[parts.length - 1] || m['settings.notifications.custom']();
  });

  function errorFor(reason: unknown): string {
    const text = reason instanceof Error ? reason.message : String(reason);
    if (text.includes('sound.tooLarge')) {
      return m['settings.notifications.errorTooLarge']();
    }
    if (text.includes('sound.tooLong')) {
      return m['settings.notifications.errorTooLong']();
    }
    if (text.includes('sound.unreadable')) {
      return m['settings.notifications.errorUnreadable']();
    }
    return m['settings.notifications.previewError']();
  }

  async function preview(preset: SoundPreset): Promise<void> {
    if (!canPreview || previewing) {
      return;
    }
    previewing = preset;
    error = null;
    try {
      await previewNotificationSound(preset, value.volume);
    } catch (reason) {
      error = errorFor(reason);
    } finally {
      previewing = null;
    }
  }

  async function chooseCustom(): Promise<void> {
    if (!isTauri || previewing) {
      return;
    }
    error = null;
    try {
      const path = await chooseCustomSound();
      if (!path) {
        return;
      }
      await onchange({ customPath: path, preset: 'Custom' });
      await preview('Custom');
    } catch (reason) {
      error = errorFor(reason);
    }
  }

  function select(preset: SoundPreset): void {
    if (!value.enabled) {
      return;
    }
    error = null;
    if (preset === 'Custom') {
      void chooseCustom();
      return;
    }
    void onchange({ preset });
  }

  function onRowKeydown(event: KeyboardEvent, preset: SoundPreset): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(preset);
    }
  }
</script>

<div class="l-reminders-page">
  <SettingsToggle
    title={m['settings.notifications.enabled']()}
    note={m['settings.notifications.enabledHint']()}
    checked={value.enabled}
    onchange={(enabled) => onchange({ enabled })}
  />

  <SettingsToggle
    title={m['settings.notifications.sound']()}
    checked={value.sound}
    divided
    onchange={(sound) => onchange({ sound })}
  />

  <SettingsField label={m['settings.notifications.preset']()} value={presetName(value.preset)}>
    <div
      class="l-reminders-page__radios"
      role="radiogroup"
      aria-label={m['settings.notifications.preset']()}
    >
      {#each presets as preset (preset)}
        <div
          class="l-reminders-page__radio"
          class:is-on={value.preset === preset}
          class:is-disabled={!value.enabled}
          role="radio"
          aria-checked={value.preset === preset}
          tabindex={value.enabled ? 0 : -1}
          onclick={() => select(preset)}
          onkeydown={(event) => onRowKeydown(event, preset)}
        >
          <span class="l-reminders-page__dot" aria-hidden="true"></span>
          <span class="l-reminders-page__name">
            {preset === 'Custom' ? customLabel : presetName(preset)}
          </span>
          {#if preset === 'Custom'}
            <button
              class="l-reminders-page__preview"
              type="button"
              disabled={!value.enabled}
              onclick={(event) => {
                event.stopPropagation();
                void chooseCustom();
              }}
            >
              {m['settings.notifications.choose']()}
            </button>
          {:else}
            <button
              class="l-reminders-page__preview"
              type="button"
              disabled={!canPreview}
              aria-label={m['settings.notifications.previewOne']({ name: presetName(preset) })}
              onclick={(event) => {
                event.stopPropagation();
                void preview(preset);
              }}
            >
              {previewing === preset ? '…' : m['settings.notifications.previewShort']()}
            </button>
          {/if}
        </div>
      {/each}
    </div>
    {#if error}
      <p class="l-reminders-page__error" role="alert">{error}</p>
    {:else if !value.enabled}
      <p class="l-reminders-page__hint">{m['settings.notifications.disabledHint']()}</p>
    {/if}
  </SettingsField>

  <SettingsSlider
    label={m['settings.notifications.volume']()}
    value={value.volume}
    min={0}
    max={100}
    step={5}
    valueLabel={`${value.volume}%`}
    onchange={(volume) => onchange({ volume })}
  />

  <SettingsToggle
    title={m['settings.notifications.tick']()}
    note={m['settings.notifications.tickHint']()}
    checked={value.tick}
    divided
    onchange={(tick) => onchange({ tick })}
  />
</div>

<style>
  .l-reminders-page {
    display: flex;
    flex-direction: column;
    padding-block-start: var(--sk-space-sm);
  }

  .l-reminders-page__radios {
    display: flex;
    flex-direction: column;
  }

  .l-reminders-page__radio {
    display: flex;
    align-items: center;
    gap: var(--sk-space-sm);
    min-block-size: var(--sk-settings-action-height);
    padding-inline: var(--sk-space-2xs);
    border-radius: var(--sk-radius-xs);
    cursor: pointer;
    transition: background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-reminders-page__radio:hover {
    background: hsl(var(--sk-color-brand-soft) / 0.45);
  }

  .l-reminders-page__radio.is-disabled {
    cursor: not-allowed;
    opacity: var(--sk-opacity-disabled);
  }

  .l-reminders-page__dot {
    flex: 0 0 auto;
    inline-size: var(--sk-space-sm);
    block-size: var(--sk-space-sm);
    border: var(--sk-edge) solid hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-full);
    background: transparent;
  }

  .l-reminders-page__radio.is-on .l-reminders-page__dot {
    border: var(--sk-space-2xs) solid hsl(var(--sk-color-brand));
    background: hsl(var(--sk-color-brand));
  }

  .l-reminders-page__name {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    font-size: var(--sk-text-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-reminders-page__preview {
    flex: 0 0 auto;
    padding: var(--sk-space-2xs) var(--sk-space-xs);
    border: 0;
    border-radius: var(--sk-radius-xs);
    color: hsl(var(--sk-color-brand));
    background: transparent;
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
  }

  .l-reminders-page__preview:hover:not(:disabled) {
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-reminders-page__preview:disabled {
    color: hsl(var(--sk-color-text-muted));
    cursor: not-allowed;
  }

  .l-reminders-page__error {
    margin: var(--sk-space-2xs) 0 0;
    color: hsl(var(--sk-color-alert));
    font-size: var(--sk-text-xs);
  }

  .l-reminders-page__hint {
    margin: var(--sk-space-2xs) 0 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }
</style>

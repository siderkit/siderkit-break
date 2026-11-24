<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { Settings } from '../../ipc/types';
  import {
    appearanceValue,
    dataValue,
    languageValue,
    overlayValue,
    reminderValue,
    rhythmValue,
  } from '../../settings-summary';
  import SettingsChips from './SettingsChips.svelte';
  import SettingsRow from './SettingsRow.svelte';
  import type { SettingsPage } from './settings-pages';

  let {
    settings,
    version,
    onnavigate,
    ontimer,
    onrestore,
  }: {
    settings: Settings;
    version: string;
    onnavigate: (page: SettingsPage) => void;
    ontimer: (focusMinutes: number) => void;
    onrestore: () => void;
  } = $props();

  const focusPresets = [15, 25, 30, 45, 60];
</script>

<p class="l-settings-root__label">{m['settings.root.common']()}</p>
<div class="l-settings-root__focus">
  <SettingsChips
    label={m['settings.timer.focusMinutes']()}
    options={focusPresets}
    value={settings.timer.focusMinutes}
    onselect={ontimer}
  />
  <span class="l-settings-root__unit">{m['common.unit.minutes']()}</span>
</div>

<div class="l-settings-root__rows">
  <SettingsRow
    label={m['settings.general.title']()}
    value={languageValue(settings.general.locale)}
    chevron
    onclick={() => onnavigate('general')}
  />
  <SettingsRow
    label={m['settings.rhythm.title']()}
    value={rhythmValue(settings.timer)}
    chevron
    divided
    onclick={() => onnavigate('rhythm')}
  />
  <SettingsRow
    label={m['settings.appearance.title']()}
    value={appearanceValue(settings.general)}
    chevron
    divided
    onclick={() => onnavigate('appearance')}
  />
  <SettingsRow
    label={m['settings.overlay.title']()}
    value={overlayValue(settings.overlay)}
    chevron
    divided
    onclick={() => onnavigate('overlay')}
  />
  <SettingsRow
    label={m['settings.notifications.title']()}
    value={reminderValue(settings.notifications)}
    chevron
    divided
    onclick={() => onnavigate('reminders')}
  />
  <SettingsRow
    label={m['settings.data.title']()}
    value={dataValue(settings)}
    chevron
    divided
    onclick={() => onnavigate('data')}
  />
  <SettingsRow
    label={m['settings.about.title']()}
    value={`v${version}`}
    chevron
    divided
    onclick={() => onnavigate('about')}
  />
</div>

<div class="l-settings-root__danger">
  <SettingsRow label={m['settings.restoreDefaults']()} danger onclick={onrestore} />
</div>

<style>
  .l-settings-root__label {
    margin: var(--sk-space-sm) var(--sk-space-sm) 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-wide);
    text-transform: uppercase;
  }

  .l-settings-root__focus {
    display: flex;
    align-items: center;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-xs) var(--sk-space-sm) var(--sk-space-sm);
  }

  .l-settings-root__unit {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-settings-root__rows {
    margin: 0 var(--sk-space-sm);
    padding: var(--sk-space-2xs) 0;
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-sm);
    background: hsl(var(--sk-color-bg-surface) / 0.6);
  }

  .l-settings-root__danger {
    margin-block-start: var(--sk-space-sm);
    padding: 0 var(--sk-space-sm);
  }
</style>

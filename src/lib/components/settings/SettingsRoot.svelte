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
  } from '../../utils/settings-summary.util';
  import SettingsChips from './SettingsChips.svelte';
  import SettingsRow from './SettingsRow.svelte';
  import type { SettingsPage } from './settings-pages.model';

  let {
    settings,
    version,
    onnavigate,
    ontimer,
  }: {
    settings: Settings;
    version: string;
    onnavigate: (page: SettingsPage) => void;
    ontimer: (focusMinutes: number) => void;
  } = $props();

  const focusPresets = [15, 25, 30, 45, 60];
</script>

<div class="l-settings-root__focus">
  <span class="l-settings-root__label">{m['settings.root.common']()}</span>
  <SettingsChips
    label={m['settings.timer.focusMinutes']()}
    options={focusPresets}
    value={settings.timer.focusMinutes}
    size="Md"
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

<style>
  .l-settings-root__label {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-2xs);
    font-weight: var(--sk-weight-strong);
    letter-spacing: var(--sk-tracking-label);
    text-transform: uppercase;
  }

  .l-settings-root__focus {
    display: flex;
    align-items: center;
    gap: var(--sk-space-sm);
  }

  .l-settings-root__unit {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-settings-root__rows {
    margin-block-start: var(--sk-space-md);
  }
</style>

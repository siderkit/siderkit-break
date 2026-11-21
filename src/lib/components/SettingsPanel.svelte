<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { COUNTDOWN_STORAGE_KEY } from '../countdown';
  import { applyPalette, applyTheme } from '../theme';
  import { createDefaultSettings, timerStore } from '../timer-store.svelte';
  import type { Settings } from '../ipc/types';
  import AboutInfo from './AboutInfo.svelte';
  import GeneralSettings from './settings/GeneralSettings.svelte';
  import NotificationSettings from './settings/NotificationSettings.svelte';
  import OverlaySettings from './settings/OverlaySettings.svelte';
  import TimerSettings from './settings/TimerSettings.svelte';
  import SettingsGroup from './SettingsGroup.svelte';
  import Button from '../ui/Button.svelte';

  let draft = $state<Settings>(clone(timerStore.settings));

  function clone(value: Settings): Settings {
    return structuredClone($state.snapshot(value));
  }

  async function persist(next: Settings): Promise<void> {
    const value = clone(next);
    draft = value;
    await timerStore.saveSettings(value);
  }

  function patchTimer(patch: Partial<Settings['timer']>): void {
    void persist({ ...draft, timer: { ...draft.timer, ...patch } });
  }

  function patchOverlay(patch: Partial<Settings['overlay']>): void {
    void persist({ ...draft, overlay: { ...draft.overlay, ...patch } });
  }

  function patchNotifications(patch: Partial<Settings['notifications']>): void {
    void persist({ ...draft, notifications: { ...draft.notifications, ...patch } });
  }

  function restoreDefaults(): void {
    const defaults = createDefaultSettings();
    applyTheme(defaults.general.theme);
    applyPalette(defaults.general.palette);
    localStorage.removeItem(COUNTDOWN_STORAGE_KEY);
    void persist(defaults);
  }

  async function patchGeneral(patch: Partial<Settings['general']>): Promise<void> {
    if (patch.theme) {
      applyTheme(patch.theme);
    }
    if (patch.palette) {
      applyPalette(patch.palette);
    }
    await persist({ ...draft, general: { ...draft.general, ...patch } });
  }
</script>

<section class="l-settings-panel">
  <div class="l-settings-panel__header">
    <h2 class="l-settings-panel__title">{m['settings.title']()}</h2>
    <Button variant="Ghost" size="Sm" onclick={restoreDefaults}>
      {m['settings.restoreDefaults']()}
    </Button>
  </div>

  <div class="l-settings-panel__scroll">
    <TimerSettings value={draft.timer} onchange={patchTimer} />
    <OverlaySettings value={draft.overlay} onchange={patchOverlay} />
    <NotificationSettings value={draft.notifications} onchange={patchNotifications} />
    <GeneralSettings value={draft.general} onchange={(patch) => void patchGeneral(patch)} />
    <SettingsGroup title={m['settings.about.title']()}>
      <AboutInfo />
    </SettingsGroup>
  </div>
</section>

<style>
  .l-settings-panel {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  .l-settings-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-lg);
    padding: var(--sk-space-lg) var(--sk-space-lg) var(--sk-space-sm);
  }

  .l-settings-panel__title {
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-settings-panel__scroll {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--sk-space-md);
    min-block-size: 0;
    padding: 0 var(--sk-space-lg) var(--sk-space-xl);
    overflow-y: auto;
  }
</style>

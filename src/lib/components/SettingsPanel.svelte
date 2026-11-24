<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { COUNTDOWN_STORAGE_KEY } from '../countdown';
  import {
    isTauri,
    locateOverlay,
    openPrivacyPage,
    openProjectPage,
    resetOverlayPosition,
  } from '../ipc/client';
  import type { Settings } from '../ipc/types';
  import { applyMotion, applyPalette, applyTheme } from '../theme';
  import { createDefaultSettings, timerStore } from '../timer-store.svelte';
  import { updateStore } from '../update-store.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import AboutPage from './settings/AboutPage.svelte';
  import AppearancePage from './settings/AppearancePage.svelte';
  import DataPage from './settings/DataPage.svelte';
  import DiagnosticsPage from './settings/DiagnosticsPage.svelte';
  import GeneralPage from './settings/GeneralPage.svelte';
  import LanguageSheet from './settings/LanguageSheet.svelte';
  import OverlayPage from './settings/OverlayPage.svelte';
  import RemindersPage from './settings/RemindersPage.svelte';
  import RhythmPage from './settings/RhythmPage.svelte';
  import SettingsHeader from './settings/SettingsHeader.svelte';
  import SettingsRoot from './settings/SettingsRoot.svelte';
  import type { SettingsPage } from './settings/settings-pages';

  let { onclose }: { onclose: () => void } = $props();

  let page = $state<SettingsPage>('root');
  let languageOpen = $state(false);
  let restoreOpen = $state(false);
  let restoring = $state(false);
  let restoreError = $state<string | null>(null);
  let draft = $state<Settings>(clone(timerStore.settings));

  const version = $derived(updateStore.currentVersion || '1.0.0');
  const title = $derived.by(() => {
    switch (page) {
      case 'root':
        return m['settings.title']();
      case 'general':
        return m['settings.general.title']();
      case 'rhythm':
        return m['settings.rhythm.title']();
      case 'appearance':
        return m['settings.appearance.title']();
      case 'overlay':
        return m['settings.overlay.title']();
      case 'reminders':
        return m['settings.notifications.pageTitle']();
      case 'data':
        return m['settings.data.title']();
      case 'diagnostics':
        return m['settings.diagnostics.title']();
      case 'about':
        return m['settings.about.title']();
    }
  });

  const backTarget = $derived<SettingsPage>(page === 'diagnostics' ? 'data' : 'root');

  function clone(value: Settings): Settings {
    return structuredClone($state.snapshot(value));
  }

  async function persist(next: Settings): Promise<void> {
    const value = clone(next);
    draft = value;
    await timerStore.saveSettings(value);
    draft = clone(timerStore.settings);
  }

  function patchTimer(patch: Partial<Settings['timer']>): void {
    void persist({ ...draft, timer: { ...draft.timer, ...patch } });
  }

  function patchOverlay(patch: Partial<Settings['overlay']>): void {
    void persist({ ...draft, overlay: { ...draft.overlay, ...patch } });
  }

  async function patchNotifications(patch: Partial<Settings['notifications']>): Promise<void> {
    await persist({ ...draft, notifications: { ...draft.notifications, ...patch } });
  }

  async function patchUpdate(patch: Partial<Settings['update']>): Promise<void> {
    await persist({ ...draft, update: { ...draft.update, ...patch } });
  }

  async function patchGeneral(patch: Partial<Settings['general']>): Promise<void> {
    if (patch.theme) {
      applyTheme(patch.theme);
    }
    if (patch.palette) {
      applyPalette(patch.palette);
    }
    if (patch.reduceMotion !== undefined) {
      applyMotion(patch.reduceMotion);
    }
    await persist({ ...draft, general: { ...draft.general, ...patch } });
    if (patch.windowMode === 'Compact') {
      onclose();
    }
  }

  async function pickLanguage(locale: string | null): Promise<void> {
    languageOpen = false;
    await patchGeneral({ locale });
  }

  function locate(): void {
    if (isTauri) {
      void locateOverlay();
    }
  }

  function resetPosition(): void {
    if (isTauri) {
      void resetOverlayPosition();
    }
  }

  async function restoreDefaults(): Promise<void> {
    restoring = true;
    restoreError = null;
    try {
      const defaults = createDefaultSettings();
      applyTheme(defaults.general.theme);
      applyPalette(defaults.general.palette);
      applyMotion(defaults.general.reduceMotion);
      localStorage.removeItem(COUNTDOWN_STORAGE_KEY);
      await persist(defaults);
      restoreOpen = false;
      page = 'root';
    } catch (reason) {
      restoreError = reason instanceof Error ? reason.message : String(reason);
    } finally {
      restoring = false;
    }
  }
</script>

<section class="l-settings-shell">
  <SettingsHeader {page} {title} {onclose} onback={() => (page = backTarget)} />

  <div class="l-settings-shell__body">
    {#if page === 'root'}
      <SettingsRoot
        settings={draft}
        {version}
        onnavigate={(target) => (page = target)}
        ontimer={(focusMinutes) => patchTimer({ focusMinutes })}
        onrestore={() => {
          restoreError = null;
          restoreOpen = true;
        }}
      />
    {:else if page === 'general'}
      <GeneralPage
        value={draft.general}
        onchange={(patch) => void patchGeneral(patch)}
        onlanguage={() => (languageOpen = true)}
      />
    {:else if page === 'rhythm'}
      <RhythmPage value={draft.timer} onchange={patchTimer} />
    {:else if page === 'appearance'}
      <AppearancePage value={draft.general} onchange={(patch) => void patchGeneral(patch)} />
    {:else if page === 'overlay'}
      <OverlayPage
        value={draft.overlay}
        onchange={patchOverlay}
        onlocate={locate}
        onreset={resetPosition}
      />
    {:else if page === 'reminders'}
      <RemindersPage value={draft.notifications} onchange={patchNotifications} />
    {:else if page === 'data'}
      <DataPage
        value={draft.update}
        onchange={patchUpdate}
        ondiagnostics={() => (page = 'diagnostics')}
      />
    {:else if page === 'diagnostics'}
      <DiagnosticsPage />
    {:else if page === 'about'}
      <AboutPage
        {version}
        value={draft.update}
        onlicense={() => void openProjectPage()}
        onprivacy={() => void openPrivacyPage()}
      />
    {/if}
  </div>

  {#if languageOpen}
    <LanguageSheet
      value={draft.general.locale}
      onpick={(locale) => void pickLanguage(locale)}
      onclose={() => (languageOpen = false)}
    />
  {/if}
</section>

{#if restoreOpen}
  <ConfirmDialog
    title={m['settings.restoreTitle']()}
    body={m['settings.restoreBody']()}
    confirmLabel={m['settings.restoreConfirm']()}
    busy={restoring}
    error={restoreError}
    onconfirm={() => void restoreDefaults()}
    oncancel={() => (restoreOpen = false)}
  />
{/if}

<style>
  .l-settings-shell {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: hidden;
  }

  .l-settings-shell__body {
    flex: 1 1 auto;
    min-block-size: 0;
    padding: 0 var(--sk-space-lg) var(--sk-space-xl);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  @media (max-height: 460px) {
    .l-settings-shell__body {
      padding-inline: var(--sk-space-md);
    }
  }
</style>

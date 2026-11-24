<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../paraglide/messages.js';
  import CompactTimer from './CompactTimer.svelte';
  import AppHeader from './components/AppHeader.svelte';
  import HelpPanel from './components/HelpPanel.svelte';
  import InsightsPanel from './components/InsightsPanel.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import TimerPanel from './components/TimerPanel.svelte';
  import UpdateBanner from './components/UpdateBanner.svelte';
  import WelcomeDialog from './components/WelcomeDialog.svelte';
  import { isTauri, onNavigate } from './ipc/client';
  import { timerStore } from './timer-store.svelte';
  import { updateStore } from './update-store.svelte';
  import { watchSystemTheme } from './theme';

  type View = 'timer' | 'settings' | 'insights' | 'help';

  let view = $state<View>('timer');

  const compact = $derived(
    view === 'timer' && timerStore.settings.general.windowMode === 'Compact',
  );
  const showHeader = $derived(view === 'timer' && !compact);
  const helpLabel = $derived.by(() => {
    const status = updateStore.status;
    if (updateStore.badgeVisible && status?.version) {
      return `${m['help.title']()} — ${m['update.tray.available']({ version: status.version })}`;
    }
    return m['help.title']();
  });

  onMount(() => {
    void timerStore.init();
    void updateStore.init();
    const stopThemeWatch = watchSystemTheme();
    let stopNavigate: (() => void) | undefined;
    if (isTauri) {
      void onNavigate((target) => {
        if (target === 'settings' || target === 'help') {
          view = target;
        }
      }).then((unlisten) => {
        stopNavigate = unlisten;
      });
    }
    return () => {
      stopThemeWatch();
      stopNavigate?.();
      timerStore.destroy();
      updateStore.destroy();
    };
  });

  function toggleSettings(): void {
    view = view === 'settings' ? 'timer' : 'settings';
  }

  function toggleHelp(): void {
    view = view === 'help' ? 'timer' : 'help';
  }

  function openInsights(): void {
    view = 'insights';
  }

  async function setCompact(on: boolean): Promise<void> {
    const next = structuredClone($state.snapshot(timerStore.settings));
    next.general.windowMode = on ? 'Compact' : 'Standard';
    view = 'timer';
    await timerStore.saveSettings(next);
  }

  function startFromWelcome(): void {
    void timerStore.start();
  }

  function skipFromWelcome(): void {
    void timerStore.reset();
  }
</script>

<main class="l-main-app">
  {#if showHeader}
    <AppHeader
      {helpLabel}
      helpActive={view === 'help'}
      badge={updateStore.badgeVisible}
      onhelp={toggleHelp}
      onsettings={toggleSettings}
      oncompact={() => void setCompact(true)}
    />
    <UpdateBanner />
  {/if}

  {#if timerStore.loading}
    <div class="l-main-app__loading" aria-busy="true"></div>
  {:else if compact}
    <CompactTimer onexpand={() => void setCompact(false)} />
  {:else if view === 'settings'}
    <SettingsPanel onclose={() => (view = 'timer')} />
  {:else if view === 'insights'}
    <InsightsPanel onclose={() => (view = 'timer')} />
  {:else if view === 'help'}
    <HelpPanel onclose={() => (view = 'timer')} />
  {:else}
    <TimerPanel oninsights={openInsights} />
  {/if}

  {#if timerStore.missed}
    <WelcomeDialog
      pendingBreak={timerStore.snapshot.pendingBreak !== null}
      onstart={startFromWelcome}
      onskip={skipFromWelcome}
      ondismiss={() => timerStore.dismissWelcome()}
    />
  {/if}

  {#if timerStore.error}
    <div class="l-main-app__error" role="alert">
      <strong>{m['error.generic']()}</strong>
      <span>{timerStore.error}</span>
    </div>
  {/if}
</main>

<style>
  .l-main-app {
    position: relative;
    display: flex;
    flex-direction: column;
    block-size: 100%;
    overflow: hidden;
    background: var(--sk-gradient-app);
  }

  .l-main-app__loading {
    flex: 1;
    margin: var(--sk-space-lg);
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-brand-soft));
    opacity: var(--sk-opacity-loading);
  }

  .l-main-app__error {
    position: absolute;
    inset-inline: var(--sk-space-lg);
    inset-block-end: var(--sk-space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-3xs);
    padding: var(--sk-space-md) var(--sk-space-lg);
    border: var(--sk-edge) solid hsl(var(--sk-color-break));
    border-radius: var(--sk-radius-sm);
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-break-soft));
    font-size: var(--sk-text-xs);
  }

  .l-main-app__error span {
    color: hsl(var(--sk-color-text-muted));
  }
</style>

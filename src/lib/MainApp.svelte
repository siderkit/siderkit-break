<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../paraglide/messages.js';
  import HelpPanel from './components/HelpPanel.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import TimerPanel from './components/TimerPanel.svelte';
  import UpdateBanner from './components/UpdateBanner.svelte';
  import WelcomeDialog from './components/WelcomeDialog.svelte';
  import DropletMark from './ui/DropletMark.svelte';
  import { isTauri, onNavigate } from './ipc/client';
  import { timerStore } from './timer-store.svelte';
  import { updateStore } from './update-store.svelte';
  import { watchSystemTheme } from './theme';

  type View = 'timer' | 'settings' | 'help';

  let view = $state<View>('timer');

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

  function startFromWelcome(): void {
    void timerStore.start();
  }

  function skipFromWelcome(): void {
    void timerStore.reset();
  }
</script>

<main class="l-main-app">
  <header class="l-main-app__header">
    <div class="l-main-app__brand">
      <DropletMark />
      <div>
        <h1 class="l-main-app__title">{m['app.name']()}</h1>
        <p class="l-main-app__tagline">{m['app.tagline']()}</p>
      </div>
    </div>
    <div class="l-main-app__actions">
      <button
        class="l-main-app__icon-button"
        class:is-active={view === 'help'}
        type="button"
        aria-label={helpLabel}
        title={helpLabel}
        aria-pressed={view === 'help'}
        onclick={toggleHelp}
      >
        <svg class="l-main-app__help-icon" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="7.4" />
          <path d="M8.1 7.8a1.9 1.9 0 1 1 2.8 1.7c-.6.3-.9.7-.9 1.4v.3" />
          <circle class="l-main-app__help-dot" cx="10" cy="13.9" r="0.95" />
        </svg>
        {#if updateStore.badgeVisible}
          <span class="l-main-app__help-badge" aria-hidden="true"></span>
        {/if}
      </button>
      <button class="l-main-app__settings-toggle" type="button" onclick={toggleSettings}>
        {view === 'settings' ? m['common.action.done']() : m['common.action.settings']()}
      </button>
    </div>
  </header>

  {#if view !== 'settings'}
    <UpdateBanner />
  {/if}

  {#if timerStore.loading}
    <div class="l-main-app__loading" aria-busy="true"></div>
  {:else if view === 'settings'}
    <SettingsPanel />
  {:else if view === 'help'}
    <HelpPanel onclose={() => (view = 'timer')} />
  {:else}
    <TimerPanel />
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

  .l-main-app__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sk-space-md);
    padding: var(--sk-space-lg) var(--sk-space-lg) var(--sk-space-md);
  }

  .l-main-app__brand {
    display: flex;
    align-items: center;
    gap: var(--sk-space-sm);
  }

  .l-main-app__title {
    margin: 0;
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-main-app__tagline {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-main-app__actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--sk-space-2xs);
  }

  .l-main-app__icon-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--sk-icon-button-size);
    block-size: var(--sk-icon-button-size);
    padding: 0;
    border: 0;
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-main-app__icon-button:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft) / 0.55);
  }

  .l-main-app__icon-button.is-active {
    color: hsl(var(--sk-color-brand-strong));
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-main-app__help-icon {
    inline-size: var(--sk-icon-size);
    block-size: var(--sk-icon-size);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .l-main-app__help-dot {
    fill: currentColor;
    stroke: none;
  }

  .l-main-app__help-badge {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    inline-size: var(--sk-badge-size);
    block-size: var(--sk-badge-size);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-alert));
    box-shadow: 0 0 0 var(--sk-space-3xs) hsl(var(--sk-color-bg-app));
  }

  .l-main-app__settings-toggle {
    flex: 0 0 auto;
    padding: var(--sk-space-2xs) var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-wide);
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      border-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-main-app__settings-toggle:hover {
    color: hsl(var(--sk-color-text));
    border-color: hsl(var(--sk-color-brand));
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

  /* The utility window is often kept short on a remote desktop. Trim the
     header before touching the timer itself so the main view never scrolls. */
  @media (max-height: 520px) {
    .l-main-app__header {
      padding: var(--sk-space-md) var(--sk-space-lg) var(--sk-space-sm);
    }
  }

  @media (max-height: 460px) {
    .l-main-app__header {
      padding: var(--sk-space-sm) var(--sk-space-lg);
    }

    .l-main-app__brand {
      gap: var(--sk-space-xs);
    }

    .l-main-app__tagline {
      display: none;
    }
  }
</style>

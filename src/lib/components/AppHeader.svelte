<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import DropletMark from '../ui/DropletMark.svelte';

  let {
    helpLabel,
    helpActive,
    badge,
    onhelp,
    onsettings,
    oncompact,
  }: {
    helpLabel: string;
    helpActive: boolean;
    badge: boolean;
    onhelp: () => void;
    onsettings: () => void;
    oncompact: () => void;
  } = $props();
</script>

<header class="l-app-header">
  <div class="l-app-header__brand">
    <DropletMark />
    <div class="l-app-header__copy">
      <h1 class="l-app-header__title">{m['app.name']()}</h1>
      <p class="l-app-header__tagline">{m['app.tagline']()}</p>
    </div>
  </div>
  <div class="l-app-header__actions">
    <button
      class="l-app-header__icon-button"
      type="button"
      aria-label={m['compact.collapse']()}
      title={m['compact.collapse']()}
      onclick={oncompact}
    >
      <svg class="l-app-header__collapse-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path d="m5.5 12.5 4.5-4.5 4.5 4.5" />
      </svg>
    </button>
    <button
      class="l-app-header__icon-button"
      class:is-active={helpActive}
      type="button"
      aria-label={helpLabel}
      title={helpLabel}
      aria-pressed={helpActive}
      onclick={onhelp}
    >
      <svg class="l-app-header__help-icon" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="7.4" />
        <path d="M8.1 7.8a1.9 1.9 0 1 1 2.8 1.7c-.6.3-.9.7-.9 1.4v.3" />
        <circle class="l-app-header__help-dot" cx="10" cy="13.9" r="0.95" />
      </svg>
      {#if badge}
        <span class="l-app-header__badge" aria-hidden="true"></span>
      {/if}
    </button>
    <button class="l-app-header__settings" type="button" onclick={onsettings}>
      {m['common.action.settings']()}
    </button>
  </div>
</header>

<style>
  .l-app-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sk-space-md);
    padding: var(--sk-space-lg) var(--sk-space-lg) var(--sk-space-md);
  }

  .l-app-header__brand {
    display: flex;
    align-items: center;
    gap: var(--sk-space-sm);
  }

  .l-app-header__copy {
    display: flex;
    flex-direction: column;
  }

  .l-app-header__title {
    margin: 0;
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-app-header__tagline {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-app-header__actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--sk-space-2xs);
  }

  .l-app-header__icon-button {
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

  .l-app-header__icon-button:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft) / 0.55);
  }

  .l-app-header__icon-button.is-active {
    color: hsl(var(--sk-color-brand-strong));
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-app-header__help-icon,
  .l-app-header__collapse-icon {
    inline-size: var(--sk-icon-size);
    block-size: var(--sk-icon-size);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .l-app-header__help-dot {
    fill: currentColor;
    stroke: none;
  }

  .l-app-header__badge {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    inline-size: var(--sk-badge-size);
    block-size: var(--sk-badge-size);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-alert));
    box-shadow: 0 0 0 var(--sk-space-3xs) hsl(var(--sk-color-bg-app));
  }

  .l-app-header__settings {
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

  .l-app-header__settings:hover {
    color: hsl(var(--sk-color-text));
    border-color: hsl(var(--sk-color-brand));
  }

  @media (max-height: 520px) {
    .l-app-header {
      padding: var(--sk-space-md) var(--sk-space-lg) var(--sk-space-sm);
    }
  }

  @media (max-height: 460px) {
    .l-app-header {
      padding: var(--sk-space-sm) var(--sk-space-lg);
    }

    .l-app-header__brand {
      gap: var(--sk-space-xs);
    }

    .l-app-header__tagline {
      display: none;
    }
  }
</style>

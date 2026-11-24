<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import DropletMark from '../ui/DropletMark.svelte';

  let {
    helpLabel,
    helpActive,
    badge,
    oninsights,
    onhelp,
    onsettings,
  }: {
    helpLabel: string;
    helpActive: boolean;
    badge: boolean;
    oninsights: () => void;
    onhelp: () => void;
    onsettings: () => void;
  } = $props();
</script>

<header class="l-app-header">
  <div class="l-app-header__brand">
    <DropletMark size="var(--sk-brand-mark-size-sm)" />
    <div class="l-app-header__copy">
      <h1 class="l-app-header__title">{m['app.name']()}</h1>
      <p class="l-app-header__tagline">{m['app.tagline']()}</p>
    </div>
  </div>
  <div class="l-app-header__actions">
    <button
      class="l-app-header__icon-button"
      type="button"
      aria-label={m['insights.title']()}
      title={m['insights.title']()}
      onclick={oninsights}
    >
      <svg class="l-app-header__insights-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 16.2V9.4" />
        <path d="M10 16.2V3.8" />
        <path d="M16 16.2v-4.4" />
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
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-sm);
    min-block-size: var(--sk-settings-page-header);
    padding-inline: var(--sk-space-lg);
    border-block-end: var(--sk-edge) solid hsl(var(--sk-color-border));
  }

  .l-app-header__brand {
    display: flex;
    align-items: center;
    gap: var(--sk-settings-brand-gap);
    min-inline-size: 0;
  }

  .l-app-header__copy {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  .l-app-header__title {
    margin: 0;
    overflow: hidden;
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-bold);
    letter-spacing: var(--sk-tracking-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-app-header__tagline {
    margin: var(--sk-edge) 0 0;
    overflow: hidden;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-3xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-app-header__actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--sk-space-3xs);
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
    border-radius: var(--sk-radius-control);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
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
  .l-app-header__insights-icon {
    inline-size: var(--sk-icon-size-lg);
    block-size: var(--sk-icon-size-lg);
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
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    padding: var(--sk-space-xs) var(--sk-space-md);
    border: 0;
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-brand-strong));
    background: hsl(var(--sk-color-brand-soft) / 0.7);
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-semibold);
    line-height: normal;
  }

  .l-app-header__settings:hover {
    color: hsl(var(--sk-color-brand-strong));
    background: hsl(var(--sk-color-brand-soft));
  }

  @media (max-height: 460px) {
    .l-app-header {
      min-block-size: var(--sk-app-header-height-low);
    }

    .l-app-header__tagline {
      display: none;
    }
  }
</style>

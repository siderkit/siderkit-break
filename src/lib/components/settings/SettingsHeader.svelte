<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { Snippet } from 'svelte';
  import Button from '../../ui/Button.svelte';
  import type { SettingsPage } from './settings-pages.model';

  let {
    page,
    title,
    onclose,
    onback,
    children,
  }: {
    page: SettingsPage;
    title: string;
    onclose: () => void;
    onback: () => void;
    children?: Snippet;
  } = $props();
</script>

<header class="l-settings-header">
  <div class="l-settings-header__lead">
    <button
      class="l-settings-header__back"
      type="button"
      aria-label={m['history.back']()}
      onclick={page === 'root' ? onclose : onback}
    >
      <svg class="l-settings-header__back-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M12.3 4.6 6.9 10l5.4 5.4" />
      </svg>
    </button>
    <h2 class="l-settings-header__title">{title}</h2>
  </div>
  {#if children}{@render children()}{/if}
  <Button variant="Secondary" size="Sm" onclick={page === 'root' ? onclose : onback}>
    {m['common.action.done']()}
  </Button>
</header>

<style>
  .l-settings-header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--sk-space-sm);
    min-block-size: var(--sk-settings-page-header);
    padding-inline: var(--sk-space-lg);
    border-block-end: var(--sk-edge) solid hsl(var(--sk-color-border));
  }

  .l-settings-header__lead {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
  }

  .l-settings-header__title {
    flex: 1 1 auto;
    margin: 0;
    overflow: hidden;
    font-size: var(--sk-text-title);
    font-weight: var(--sk-weight-strong);
    letter-spacing: var(--sk-tracking-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-settings-header__back {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    inline-size: var(--sk-icon-button-size);
    block-size: var(--sk-icon-button-size);
    margin-inline-start: calc(-1 * var(--sk-space-sm));
    padding: 0;
    border: 0;
    border-radius: var(--sk-radius-control);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-settings-header__back:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft) / 0.55);
  }

  .l-settings-header__back-icon {
    inline-size: var(--sk-icon-size-lg);
    block-size: var(--sk-icon-size-lg);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @media (max-height: 460px) {
    .l-settings-header {
      min-block-size: var(--sk-settings-page-header-low);
      padding-inline: var(--sk-space-md);
    }
  }
</style>

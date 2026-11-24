<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { SettingsPage } from './settings-pages';

  let {
    page,
    title,
    onclose,
    onback,
  }: {
    page: SettingsPage;
    title: string;
    onclose: () => void;
    onback: () => void;
  } = $props();
</script>

<header class="l-settings-header">
  {#if page === 'root'}
    <h2 class="l-settings-header__title">{title}</h2>
    <button class="l-settings-header__done" type="button" onclick={onclose}>
      {m['common.action.done']()}
    </button>
  {:else}
    <button
      class="l-settings-header__back"
      type="button"
      aria-label={m['history.back']()}
      onclick={onback}
    >
      <svg class="l-settings-header__back-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M12.3 4.6 6.9 10l5.4 5.4" />
      </svg>
    </button>
    <h2 class="l-settings-header__title">{title}</h2>
  {/if}
</header>

<style>
  .l-settings-header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--sk-space-xs);
    min-block-size: var(--sk-settings-page-header);
    padding-inline: var(--sk-space-lg);
  }

  .l-settings-header__title {
    flex: 1 1 auto;
    margin: 0;
    overflow: hidden;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-settings-header__done {
    flex: 0 0 auto;
    padding: var(--sk-space-2xs) 0;
    border: 0;
    color: hsl(var(--sk-color-brand));
    background: transparent;
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
  }

  .l-settings-header__back {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    inline-size: var(--sk-icon-button-size);
    block-size: var(--sk-icon-button-size);
    margin-inline-start: calc(-1 * var(--sk-space-2xs));
    padding: 0;
    border: 0;
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
  }

  .l-settings-header__back:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-settings-header__back-icon {
    inline-size: var(--sk-icon-size);
    block-size: var(--sk-icon-size);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @media (max-height: 460px) {
    .l-settings-header {
      min-block-size: var(--sk-settings-row-height);
      padding-inline: var(--sk-space-md);
    }
  }
</style>

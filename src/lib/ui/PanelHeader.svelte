<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import type { Snippet } from 'svelte';
  import BackButton from './BackButton.svelte';
  import Button from './Button.svelte';

  let {
    title,
    titleId,
    onback,
    actions,
  }: {
    title: string;
    titleId?: string;
    onback: () => void;
    actions?: Snippet;
  } = $props();
</script>

<!--
  Shared drill-down header: chevron + title on the left, optional inline
  actions, Done on the right. Chevron and Done both hand control to `onback`,
  which each surface maps to "go back one level" — closing the panel, leaving
  a settings subpage, or dismissing a sheet.
-->
<header class="l-panel-header">
  <div class="l-panel-header__lead">
    <BackButton onclick={onback} />
    <h2 class="l-panel-header__title" id={titleId}>{title}</h2>
  </div>
  {#if actions}{@render actions()}{/if}
  <Button variant="Secondary" size="Sm" onclick={onback}>
    {m['common.action.done']()}
  </Button>
</header>

<style>
  .l-panel-header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--sk-space-sm);
    min-block-size: var(--sk-settings-page-header);
    padding-inline: var(--sk-space-lg);
    border-block-end: var(--sk-edge) solid hsl(var(--sk-color-border));
  }

  .l-panel-header__lead {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
  }

  .l-panel-header__title {
    flex: 1 1 auto;
    margin: 0;
    overflow: hidden;
    font-size: var(--sk-text-title);
    font-weight: var(--sk-weight-strong);
    letter-spacing: var(--sk-tracking-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-height: 460px) {
    .l-panel-header {
      min-block-size: var(--sk-settings-page-header-low);
      padding-inline: var(--sk-space-md);
    }
  }
</style>

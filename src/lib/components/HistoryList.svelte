<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { buildHistoryLayout, spacerHeights, visibleItemRange } from '../history-page';
  import { HistoryListState } from '../history-list.svelte';
  import { currentLocale } from '../locale';
  import Button from '../ui/Button.svelte';
  import HistoryRow from './HistoryRow.svelte';

  let { covered = false }: { covered?: boolean } = $props();

  const DAY_HEIGHT = 46;
  const SESSION_HEIGHT = 32;
  const OVERSCAN = 120;
  const LOAD_MORE_DISTANCE = 240;

  let viewport = $state<HTMLDivElement>();
  let viewportHeight = $state(0);
  let scrollOffset = $state(0);
  const list = new HistoryListState(() => viewport);
  const locale = currentLocale();

  const layout = $derived(buildHistoryLayout(list.days, DAY_HEIGHT, SESSION_HEIGHT));
  const slice = $derived(
    visibleItemRange(layout.offsets, layout.totalHeight, {
      scrollTop: scrollOffset,
      viewportHeight,
      overscan: OVERSCAN,
    }),
  );
  const visible = $derived(layout.items.slice(slice.start, slice.end));
  const spacers = $derived(spacerHeights(layout, slice.start, slice.end));

  onMount(() => {
    list.start();
  });

  // A sparse history can leave the viewport unscrollable; keep pulling older
  // pages until the measured content fills it or the history ends.
  $effect(() => {
    if (viewportHeight <= 0 || !list.hasMore || list.loading || list.loadingOlder) {
      return;
    }
    if (layout.totalHeight <= viewportHeight + LOAD_MORE_DISTANCE) {
      void list.loadOlder();
    }
  });

  function handleScroll(event: Event): void {
    const target = event.currentTarget as HTMLDivElement;
    scrollOffset = target.scrollTop;
    const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining < LOAD_MORE_DISTANCE) {
      void list.loadOlder();
    }
  }
</script>

<div class="l-history-list">
  <div
    class="l-history-list__viewport"
    class:is-covered={covered}
    bind:this={viewport}
    bind:clientHeight={viewportHeight}
    onscroll={handleScroll}
  >
    {#if list.loading}
      <p class="l-history-list__note">{m['history.loading']()}</p>
    {:else if list.loadError}
      <div class="l-history-list__note" role="alert">
        <span>{list.loadError}</span>
        <Button size="Sm" variant="Ghost" onclick={() => void list.loadLatest()}>
          {m['history.retry']()}
        </Button>
      </div>
    {:else if list.days.length === 0}
      <p class="l-history-list__note">{m['history.empty']()}</p>
    {:else}
      <div class="l-history-list__spacer" style:block-size="{spacers.before}px"></div>
      {#each visible as item (item.key)}
        <HistoryRow {item} {locale} />
      {/each}
      <div class="l-history-list__spacer" style:block-size="{spacers.after}px"></div>
    {/if}
    {#if list.loadingOlder}
      <p class="l-history-list__older">{m['history.loadingOlder']()}</p>
    {/if}
  </div>
</div>

<style>
  .l-history-list {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    min-block-size: 0;
    min-inline-size: 0;
  }

  .l-history-list__viewport {
    position: relative;
    flex: 1 1 auto;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-sm);
    background: hsl(var(--sk-color-bg-app));
  }

  /* The export dialog sits on top; hiding the covered scrollbar keeps exactly
     one scrollbar visible and preserves the list's scroll position. */
  .l-history-list__viewport.is-covered {
    overflow: hidden;
  }

  .l-history-list__spacer {
    flex: 0 0 auto;
  }

  .l-history-list__note {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sk-space-sm);
    block-size: 100%;
    margin: 0;
    padding: var(--sk-space-lg);
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
    text-align: center;
  }

  .l-history-list__older {
    position: absolute;
    inset-block-end: 0;
    inset-inline: 0;
    margin: 0;
    padding: var(--sk-space-2xs);
    color: hsl(var(--sk-color-text-muted));
    background: hsl(var(--sk-color-bg-app) / 0.9);
    font-size: var(--sk-text-xs);
    text-align: center;
  }
</style>

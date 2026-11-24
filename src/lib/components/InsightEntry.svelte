<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { formatCompactDuration } from '../format';
  import { insightsStore } from '../insights-store.svelte';

  let { onopen }: { onopen: () => void } = $props();

  const payload = $derived(insightsStore.payload);
  const totals = $derived(
    payload !== null && payload.range === 'week' && insightsStore.range === 'week'
      ? payload.totals
      : null,
  );
  const value = $derived(totals ? formatCompactDuration(totals.focusMs) : '—');

  onMount(() => {
    if (insightsStore.payload?.range !== 'week' || insightsStore.range !== 'week') {
      void insightsStore.load('week');
    }
  });
</script>

<button class="l-insight-entry" type="button" onclick={onopen}>
  <span class="l-insight-entry__copy">
    {m['insights.weekEntry']()} <strong class="l-insight-entry__value">{value}</strong>
  </span>
  <span class="l-insight-entry__chevron" aria-hidden="true">›</span>
</button>

<style>
  .l-insight-entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-sm);
    inline-size: 100%;
    min-block-size: var(--sk-settings-action-height);
    padding: var(--sk-space-xs) var(--sk-space-sm);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-md);
    color: hsl(var(--sk-color-text-muted));
    background: hsl(var(--sk-color-bg-surface) / 0.7);
    font-size: var(--sk-text-xs);
    text-align: start;
    transition:
      border-color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-insight-entry:hover {
    border-color: hsl(var(--sk-color-brand) / 0.55);
    background: hsl(var(--sk-color-bg-surface));
  }

  .l-insight-entry__copy {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-insight-entry__value {
    color: hsl(var(--sk-color-text));
    font-weight: var(--sk-weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  .l-insight-entry__chevron {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-lg);
    line-height: var(--sk-leading-none);
  }
</style>

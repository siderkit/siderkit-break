<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { formatCompactDuration } from '../utils/format.util';
  import type { InsightsRange } from '../ipc/types';
  import { insightsStore } from '../state/insights.store.svelte.ts';
  import { currentLocale } from '../utils/locale.util';
  import { timerStore } from '../state/timer.store.svelte.ts';
  import InsightsEmpty from './InsightsEmpty.svelte';
  import InsightsError from './InsightsError.svelte';
  import InsightsHeatmap from './InsightsHeatmap.svelte';
  import InsightsLegend from './InsightsLegend.svelte';
  import InsightsTagBlock from './InsightsTagBlock.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const locale = currentLocale();
  const ranges: Array<{ value: InsightsRange; label: string }> = [
    { value: 'today', label: m['insights.range.today']() },
    { value: 'week', label: m['insights.range.week']() },
    { value: 'month', label: m['insights.range.month']() },
    { value: 'year', label: m['insights.range.year']() },
  ];

  const payload = $derived(insightsStore.payload);
  const loading = $derived(insightsStore.loading);
  const error = $derived(insightsStore.error);
  const totals = $derived(
    payload !== null && payload.range === insightsStore.range ? payload.totals : null,
  );
  const empty = $derived(
    !loading &&
      !error &&
      payload !== null &&
      payload.range === insightsStore.range &&
      payload.totals.rounds === 0,
  );
  const focusText = $derived(totals ? formatCompactDuration(totals.focusMs) : '—');
  const heatmap = $derived(
    payload !== null && payload.range === insightsStore.range ? payload.heatmap : [],
  );
  const tags = $derived(
    payload !== null && payload.range === insightsStore.range ? payload.tags : [],
  );

  onMount(() => {
    void insightsStore.load(insightsStore.range);
  });

  function startFocus(): void {
    void timerStore.start();
    onclose();
  }
</script>

<section class="l-insights" aria-labelledby="insights-title">
  <header class="l-insights__head">
    <button
      class="l-insights__back"
      type="button"
      aria-label={m['history.back']()}
      onclick={onclose}
    >
      <svg class="l-insights__back-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M12.3 4.6 6.9 10l5.4 5.4" />
      </svg>
    </button>
    <h2 class="l-insights__title" id="insights-title">{m['insights.title']()}</h2>
  </header>

  <div class="l-insights__body">
    <div class="l-insights__tabs" role="tablist" aria-label={m['insights.title']()}>
      {#each ranges as range (range.value)}
        <button
          class="l-insights__tab"
          class:is-on={insightsStore.range === range.value}
          type="button"
          role="tab"
          aria-selected={insightsStore.range === range.value}
          onclick={() => insightsStore.select(range.value)}
        >
          {range.label}
        </button>
      {/each}
    </div>

    <div class="l-insights__stats">
      <div class="l-insights__stat">
        <strong class="l-insights__stat-value">{focusText}</strong>
        <span class="l-insights__stat-label">{m['insights.focusTime']()}</span>
      </div>
      <div class="l-insights__stat">
        <strong class="l-insights__stat-value">{totals?.rounds ?? '—'}</strong>
        <span class="l-insights__stat-label">{m['insights.rounds']()}</span>
      </div>
      <div class="l-insights__stat">
        <strong class="l-insights__stat-value">{totals?.streakDays ?? '—'}</strong>
        <span class="l-insights__stat-label">{m['insights.streak']()}</span>
      </div>
    </div>

    {#if error}
      <InsightsError onretry={() => void insightsStore.refresh()} />
    {:else if empty}
      <InsightsEmpty onstart={startFocus} />
    {:else}
      <div class="l-insights__heat-head">
        <span class="l-insights__heat-title">{m['insights.heatmapTitle']()}</span>
        <span class="l-insights__heat-hint">{m['insights.heatmapHint']()}</span>
      </div>
      <InsightsHeatmap days={heatmap} {locale} />
      <InsightsLegend />

      <InsightsTagBlock {tags} />
    {/if}
  </div>
</section>

<style>
  .l-insights {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: hidden;
  }

  .l-insights__head {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--sk-space-sm);
    min-block-size: var(--sk-settings-page-header);
    padding-inline: var(--sk-space-lg);
    border-block-end: var(--sk-edge) solid hsl(var(--sk-color-border));
  }

  .l-insights__back {
    display: grid;
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

  .l-insights__back:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft) / 0.55);
  }

  .l-insights__back-icon {
    inline-size: var(--sk-icon-size-lg);
    block-size: var(--sk-icon-size-lg);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .l-insights__title {
    flex: 1 1 auto;
    margin: 0;
    overflow: hidden;
    font-size: var(--sk-text-title);
    font-weight: var(--sk-weight-strong);
    letter-spacing: var(--sk-tracking-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-insights__body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-block-size: 0;
    padding: 0 var(--sk-space-lg) var(--sk-space-xl);
    overflow-y: auto;
  }

  .l-insights__tabs {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    border-block-end: var(--sk-edge) solid hsl(var(--sk-color-border));
  }

  .l-insights__tab {
    position: relative;
    min-block-size: var(--sk-tab-height);
    padding-inline: var(--sk-space-xs);
    border: 0;
    border-radius: 0;
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-value);
  }

  .l-insights__tab:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft) / 0.35);
  }

  .l-insights__tab.is-on {
    color: hsl(var(--sk-color-text));
    font-weight: var(--sk-weight-strong);
  }

  .l-insights__tab.is-on::after {
    position: absolute;
    inset-inline: calc(var(--sk-space-sm) + var(--sk-space-3xs));
    inset-block-end: calc(-1 * var(--sk-edge));
    block-size: var(--sk-tab-indicator);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-brand));
    content: '';
  }

  .l-insights__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--sk-space-sm);
    padding: calc(var(--sk-space-lg) + var(--sk-space-3xs)) 0 var(--sk-space-md);
  }

  .l-insights__stat {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-2xs);
    min-inline-size: 0;
  }

  .l-insights__stat-value {
    overflow: hidden;
    font-size: var(--sk-stat-value);
    font-weight: var(--sk-weight-heavy);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--sk-tracking-tight);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-insights__stat-label {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-2xs);
  }

  .l-insights__heat-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sk-space-2xs);
    margin: calc(var(--sk-space-sm) + var(--sk-space-3xs)) 0 var(--sk-space-sm);
  }

  .l-insights__heat-title {
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
  }

  .l-insights__heat-hint {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-2xs);
  }
</style>

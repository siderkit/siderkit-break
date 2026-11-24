<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { formatCompactDuration } from '../utils/format.util';
  import type { InsightsTag } from '../ipc/types';
  import { tagBarPercent } from '../utils/insights/insights.util';

  let { tags }: { tags: InsightsTag[] } = $props();

  const largest = $derived(Math.max(0, ...tags.map((tag) => tag.focusMs)));
</script>

<section class="l-insights-tags" aria-labelledby="insights-tags-title">
  <h3 class="l-insights-tags__title" id="insights-tags-title">{m['insights.byTag']()}</h3>
  {#if tags.length === 0}
    <p class="l-insights-tags__empty">{m['insights.tagsEmpty']()}</p>
  {:else}
    {#each tags as tag (tag.tag)}
      <div class="l-insights-tags__row">
        <span class="l-insights-tags__name" title={tag.tag}>{tag.tag}</span>
        <span class="l-insights-tags__track">
          <i
            class="l-insights-tags__bar"
            style:inline-size={`${tagBarPercent(tag.focusMs, largest)}%`}
          ></i>
        </span>
        <span class="l-insights-tags__value">{formatCompactDuration(tag.focusMs)}</span>
      </div>
    {/each}
  {/if}
</section>

<style>
  .l-insights-tags {
    margin-block-start: var(--sk-space-lg);
    padding-block-start: var(--sk-space-md);
    border-block-start: var(--sk-edge) solid hsl(var(--sk-color-border));
  }

  .l-insights-tags__title {
    margin: 0 0 var(--sk-space-sm);
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
  }

  .l-insights-tags__empty {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-insights-tags__row {
    display: grid;
    grid-template-columns:
      var(--sk-insights-tag-name-column) minmax(0, 1fr)
      var(--sk-insights-tag-value-column);
    align-items: center;
    gap: var(--sk-space-sm);
    block-size: var(--sk-insights-tag-row-height);
    font-size: var(--sk-text-xs);
  }

  .l-insights-tags__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-insights-tags__track {
    display: block;
    block-size: var(--sk-insight-bar-height);
    overflow: hidden;
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-track));
  }

  .l-insights-tags__bar {
    display: block;
    block-size: 100%;
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-brand));
  }

  .l-insights-tags__value {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-2xs);
    font-variant-numeric: tabular-nums;
    text-align: end;
    white-space: nowrap;
  }
</style>

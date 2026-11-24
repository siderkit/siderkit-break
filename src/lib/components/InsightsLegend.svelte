<script lang="ts">
  import { m } from '../../paraglide/messages.js';

  const levels = [0, 1, 2, 3, 4];
</script>

<div class="l-insights-legend" aria-hidden="true">
  <span>{m['insights.less']()}</span>
  {#each levels as level (level)}
    <i class="l-insights-legend__cell" data-level={level}></i>
  {/each}
  <span>{m['insights.more']()}</span>
</div>

<style>
  .l-insights-legend {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--sk-space-2xs);
    margin-block-start: var(--sk-space-sm);
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-3xs);
  }

  .l-insights-legend__cell {
    inline-size: var(--sk-legend-cell);
    block-size: var(--sk-legend-cell);
    border-radius: var(--sk-heat-radius);
    background: hsl(var(--sk-heat-0));
  }

  .l-insights-legend__cell[data-level='1'] {
    background: hsl(var(--sk-heat-1));
  }

  .l-insights-legend__cell[data-level='2'] {
    background: hsl(var(--sk-heat-2));
  }

  .l-insights-legend__cell[data-level='3'] {
    background: hsl(var(--sk-heat-3));
  }

  .l-insights-legend__cell[data-level='4'] {
    background: hsl(var(--sk-heat-4));
  }
</style>

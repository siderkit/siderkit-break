<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { formatFullDate, formatMinutes } from '../format';
  import type { InsightsDay } from '../ipc/types';
  import { heatLevel, heatmapWeeks } from '../insights';
  import type { Locale } from '../locale';

  let { days, locale }: { days: InsightsDay[]; locale: Locale } = $props();

  const weeks = $derived(heatmapWeeks(days));

  function label(day: InsightsDay): string {
    const minutes = formatMinutes(day.focusMs);
    return `${formatFullDate(day.date, locale)} · ${minutes} ${m['common.unit.minutes']()}`;
  }
</script>

<div class="l-insights-heatmap" role="img" aria-label={m['insights.heatmapLabel']()}>
  {#each weeks as week (week.key)}
    <span class="l-insights-heatmap__column">
      {#each week.days as day, index (day?.date ?? `${week.key}-${index}`)}
        <span
          class="l-insights-heatmap__cell"
          data-level={day ? heatLevel(day.focusMs) : 0}
          title={day ? label(day) : undefined}
        ></span>
      {/each}
    </span>
  {/each}
</div>

<style>
  .l-insights-heatmap {
    display: flex;
    gap: var(--sk-heat-gap);
    inline-size: max-content;
    max-inline-size: 100%;
  }

  .l-insights-heatmap__column {
    display: flex;
    flex-direction: column;
    gap: var(--sk-heat-gap);
  }

  .l-insights-heatmap__cell {
    inline-size: var(--sk-heat-cell);
    block-size: var(--sk-heat-cell);
    border-radius: var(--sk-heat-radius);
    background: hsl(var(--sk-heat-0));
  }

  .l-insights-heatmap__cell[data-level='1'] {
    background: hsl(var(--sk-heat-1));
  }

  .l-insights-heatmap__cell[data-level='2'] {
    background: hsl(var(--sk-heat-2));
  }

  .l-insights-heatmap__cell[data-level='3'] {
    background: hsl(var(--sk-heat-3));
  }

  .l-insights-heatmap__cell[data-level='4'] {
    background: hsl(var(--sk-heat-4));
  }
</style>

<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { formatFullDate, formatMinutes } from '../utils/format.util';
  import type { InsightsDay } from '../ipc/types';
  import { heatLevel, heatmapWeeks } from '../utils/insights/insights.util';
  import type { Locale } from '../utils/locale.util';

  let { days, locale }: { days: InsightsDay[]; locale: Locale } = $props();

  // ViewBox geometry is unitless: the whole chart scales with the window
  // while the cell-to-gap ratio stays constant.
  const CELL = 6;
  const GAP = 2;
  const COLUMNS = 53;
  const ROWS = 7;

  const weeks = $derived(heatmapWeeks(days));
  const viewWidth = COLUMNS * CELL + (COLUMNS - 1) * GAP;
  const viewHeight = ROWS * CELL + (ROWS - 1) * GAP;

  function label(day: InsightsDay): string {
    const minutes = formatMinutes(day.focusMs);
    return `${formatFullDate(day.date, locale)} · ${minutes} ${m['common.unit.minutes']()}`;
  }
</script>

<svg
  class="l-insights-heatmap"
  role="img"
  aria-label={m['insights.heatmapLabel']()}
  viewBox="0 0 {viewWidth} {viewHeight}"
>
  {#each weeks as week, column (week.key)}
    {#each week.days as day, index (day?.date ?? `${week.key}-${index}`)}
      <rect
        class="l-insights-heatmap__cell"
        data-level={day ? heatLevel(day.focusMs) : 0}
        x={column * (CELL + GAP)}
        y={index * (CELL + GAP)}
        width={CELL}
        height={CELL}
        rx="1.4"
      >
        {#if day}<title>{label(day)}</title>{/if}
      </rect>
    {/each}
  {/each}
</svg>

<style>
  .l-insights-heatmap {
    display: block;
    inline-size: 100%;
    block-size: auto;
  }

  .l-insights-heatmap__cell {
    fill: hsl(var(--sk-heat-0));
  }

  .l-insights-heatmap__cell[data-level='1'] {
    fill: hsl(var(--sk-heat-1));
  }

  .l-insights-heatmap__cell[data-level='2'] {
    fill: hsl(var(--sk-heat-2));
  }

  .l-insights-heatmap__cell[data-level='3'] {
    fill: hsl(var(--sk-heat-3));
  }

  .l-insights-heatmap__cell[data-level='4'] {
    fill: hsl(var(--sk-heat-4));
  }
</style>

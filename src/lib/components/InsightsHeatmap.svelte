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
  // Tooltip layout is measured in screen pixels inside the wrapper.
  const TIP_GAP = 6;
  const TIP_EDGE = 6;

  const weeks = $derived(heatmapWeeks(days));
  const viewWidth = COLUMNS * CELL + (COLUMNS - 1) * GAP;
  const viewHeight = ROWS * CELL + (ROWS - 1) * GAP;
  const dayByDate = $derived(new Map(days.map((day) => [day.date, day])));

  let wrapEl = $state<HTMLDivElement | null>(null);
  let chartEl = $state<SVGSVGElement | null>(null);
  let tipEl = $state<HTMLDivElement | null>(null);
  let tipWidth = $state(0);
  // The tip anchors to the hovered cell in wrapper coordinates; `above`
  // mirrors it below the cell when the space above is the tighter side.
  let tip = $state<{
    day: InsightsDay;
    x: number;
    y: number;
    height: number;
    above: boolean;
  } | null>(null);

  const tipLeft = $derived.by(() => {
    if (!tip || !wrapEl) {
      return 0;
    }
    const min = TIP_EDGE;
    const max = Math.max(min, wrapEl.clientWidth - tipWidth - TIP_EDGE);
    return Math.min(Math.max(tip.x - tipWidth / 2, min), max);
  });

  const tipTop = $derived.by(() => {
    if (!tip) {
      return 0;
    }
    return tip.above ? tip.y - TIP_GAP : tip.y + tip.height + TIP_GAP;
  });

  // Re-measure on every hover so edge clamping tracks the longest label.
  $effect(() => {
    if (tip && tipEl) {
      tipWidth = tipEl.offsetWidth;
    }
  });

  /** Pointer delegation on the chart: one listener pair for every cell. */
  function hoverTip(node: SVGSVGElement): { destroy(): void } {
    node.addEventListener('pointerover', onOver);
    node.addEventListener('pointerout', onOut);
    return {
      destroy() {
        node.removeEventListener('pointerover', onOver);
        node.removeEventListener('pointerout', onOut);
      },
    };
  }

  function onOver(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof SVGRectElement) || !wrapEl) {
      return;
    }
    const day = dayByDate.get(target.getAttribute('data-date') ?? '');
    if (!day) {
      tip = null;
      return;
    }
    const cell = target.getBoundingClientRect();
    const box = wrapEl.getBoundingClientRect();
    const top = cell.top - box.top;
    tip = {
      day,
      x: cell.left - box.left + cell.width / 2,
      y: top,
      height: cell.height,
      above: top > box.height - top - cell.height,
    };
  }

  function onOut(event: PointerEvent): void {
    const next = event.relatedTarget;
    // Crossing cells (or the tiny gaps) keeps the tip; leaving the chart or
    // landing on anything else hides it.
    if (next === chartEl || next instanceof SVGRectElement) {
      return;
    }
    tip = null;
  }

  function meta(day: InsightsDay): string {
    const minutes = `${formatMinutes(day.focusMs)} ${m['common.unit.minutes']()}`;
    return `${minutes} · ${day.rounds} ${m['insights.rounds']()}`;
  }
</script>

<div class="l-insights-heatmap" bind:this={wrapEl}>
  <svg
    class="l-insights-heatmap__chart"
    role="img"
    aria-label={m['insights.heatmapLabel']()}
    viewBox="0 0 {viewWidth} {viewHeight}"
    use:hoverTip
  >
    {#each weeks as week, column (week.key)}
      {#each week.days as day, index (day?.date ?? `${week.key}-${index}`)}
        <rect
          class="l-insights-heatmap__cell"
          data-level={day ? heatLevel(day.focusMs) : 0}
          data-date={day?.date}
          x={column * (CELL + GAP)}
          y={index * (CELL + GAP)}
          width={CELL}
          height={CELL}
          rx="1.4"
        />
      {/each}
    {/each}
  </svg>

  {#if tip}
    <div
      class="l-insights-heatmap__tip"
      class:is-below={!tip.above}
      bind:this={tipEl}
      style:left="{tipLeft}px"
      style:top="{tipTop}px"
      aria-hidden="true"
    >
      <strong class="l-insights-heatmap__tip-date">{formatFullDate(tip.day.date, locale)}</strong>
      <span class="l-insights-heatmap__tip-meta">{meta(tip.day)}</span>
    </div>
  {/if}
</div>

<style>
  .l-insights-heatmap {
    position: relative;
    display: block;
    inline-size: 100%;
  }

  .l-insights-heatmap__chart {
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

  /* GitHub-style inverted tip: app background against text color flips the
     palette, so it stays readable in both themes without new tokens. */
  .l-insights-heatmap__tip {
    position: absolute;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-xs);
    max-inline-size: calc(100% - 2 * var(--sk-space-lg));
    padding: var(--sk-space-xs) var(--sk-space-sm);
    border-radius: var(--sk-radius-control);
    color: hsl(var(--sk-color-bg-app));
    background: hsl(var(--sk-color-text));
    box-shadow: var(--sk-shadow-card);
    font-size: var(--sk-text-2xs);
    line-height: var(--sk-leading-none);
    pointer-events: none;
    transform: translateY(-100%);
    white-space: nowrap;
  }

  .l-insights-heatmap__tip.is-below {
    transform: none;
  }

  .l-insights-heatmap__tip-date {
    overflow: hidden;
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-strong);
    text-overflow: ellipsis;
  }

  .l-insights-heatmap__tip-meta {
    overflow: hidden;
    color: hsl(var(--sk-color-bg-app) / 0.78);
    text-overflow: ellipsis;
  }
</style>

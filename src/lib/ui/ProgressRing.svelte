<script lang="ts">
  import type { Phase } from '../ipc/types';
  import { formatClock, phaseClass } from '../utils/format.util';

  let {
    phase,
    remainingMs,
    plannedMs,
    paused,
    pausedLabel,
  }: {
    phase: Phase;
    remainingMs: number;
    plannedMs: number;
    paused: boolean;
    pausedLabel: string;
  } = $props();

  /** The prototype ring: 174 px outside, 162 px face, so 6 px of arc. */
  const radius = 84;
  const circumference = 2 * Math.PI * radius;

  const progress = $derived(plannedMs > 0 ? Math.max(0, Math.min(1, remainingMs / plannedMs)) : 0);
  const dashOffset = $derived(circumference * (1 - progress));
  const longClock = $derived(formatClock(remainingMs).length > 5);
</script>

<div class="l-progress-ring {phaseClass(phase)}" class:is-paused={paused} class:is-long={longClock}>
  <svg class="l-progress-ring__canvas" viewBox="0 0 174 174" aria-hidden="true">
    <circle class="l-progress-ring__track" cx="87" cy="87" r="84" stroke-width="6"></circle>
    <circle
      class="l-progress-ring__arc"
      cx="87"
      cy="87"
      r="84"
      stroke-width="6"
      stroke-dasharray={circumference}
      stroke-dashoffset={dashOffset}
    ></circle>
  </svg>
  <div class="l-progress-ring__center">
    <span class="l-progress-ring__time">{formatClock(remainingMs)}</span>
    {#if paused}<span class="l-progress-ring__state">{pausedLabel}</span>{/if}
  </div>
</div>

<style>
  .l-progress-ring {
    position: relative;
    flex: 0 0 auto;
    inline-size: var(--sk-timer-ring-size);
    block-size: var(--sk-timer-ring-size);
    margin: var(--sk-space-sm) auto var(--sk-timer-ring-gap);
  }

  .l-progress-ring__canvas {
    inline-size: 100%;
    block-size: 100%;
    transform: rotate(-90deg);
  }

  .l-progress-ring__track,
  .l-progress-ring__arc {
    fill: none;
  }

  .l-progress-ring__track {
    stroke: hsl(var(--sk-color-track));
  }

  .l-progress-ring__arc {
    stroke: hsl(var(--sk-color-brand));
    stroke-linecap: round;
    transition:
      stroke-dashoffset var(--sk-duration-slow) linear,
      stroke var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-progress-ring.is-focus .l-progress-ring__arc {
    stroke: hsl(var(--sk-color-brand));
  }

  .l-progress-ring.is-break .l-progress-ring__arc {
    stroke: hsl(var(--sk-color-break));
  }

  .l-progress-ring.is-countdown .l-progress-ring__arc {
    stroke: hsl(var(--sk-color-countdown));
  }

  .l-progress-ring.is-idle .l-progress-ring__arc {
    stroke: hsl(var(--sk-color-border-strong));
  }

  .l-progress-ring.is-paused .l-progress-ring__arc {
    stroke: hsl(var(--sk-color-warning));
  }

  /* The face is 6/174 of the ring, so it shrinks with the low layout too. */
  .l-progress-ring__center {
    position: absolute;
    inset: 3.45%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-bg-surface));
  }

  .l-progress-ring__time {
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-display);
    font-weight: var(--sk-weight-heavy);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--sk-tracking-clock);
    line-height: var(--sk-leading-none);
  }

  .l-progress-ring.is-long .l-progress-ring__time {
    font-size: var(--sk-text-clock-long);
  }

  .l-progress-ring__state {
    margin-block-start: var(--sk-space-3xs);
    color: hsl(var(--sk-color-warning));
    font-size: var(--sk-text-2xs);
  }

  /* Short work areas clamp the window below the minimum height; shrink the
     ring and its clock so the panel never needs a scrollbar. */
  @media (max-height: 460px) {
    .l-progress-ring {
      inline-size: var(--sk-timer-ring-size-tight);
      block-size: var(--sk-timer-ring-size-tight);
      margin-block: var(--sk-space-2xs) var(--sk-space-xs);
    }

    .l-progress-ring__time {
      font-size: var(--sk-text-display-tight);
    }
  }
</style>

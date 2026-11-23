<script lang="ts">
  import type { Phase } from '../ipc/types';
  import { formatClock, phaseClass } from '../format';

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

  const radius = 88;
  const circumference = 2 * Math.PI * radius;

  const progress = $derived(plannedMs > 0 ? Math.max(0, Math.min(1, remainingMs / plannedMs)) : 0);
  const dashOffset = $derived(circumference * (1 - progress));
  const longClock = $derived(formatClock(remainingMs).length > 5);
</script>

<div class="l-progress-ring {phaseClass(phase)}" class:is-paused={paused} class:is-long={longClock}>
  <svg class="l-progress-ring__canvas" viewBox="0 0 200 200" aria-hidden="true">
    <circle class="l-progress-ring__track" cx="100" cy="100" r="88" stroke-width="8"></circle>
    <circle
      class="l-progress-ring__arc"
      cx="100"
      cy="100"
      r="88"
      stroke-width="8"
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
    inline-size: var(--sk-timer-ring-size);
    block-size: var(--sk-timer-ring-size);
    margin-inline: auto;
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

  .l-progress-ring__center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sk-space-2xs);
  }

  .l-progress-ring__time {
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-display);
    font-weight: var(--sk-weight-medium);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--sk-tracking-tight);
    line-height: var(--sk-leading-none);
  }

  .l-progress-ring.is-long .l-progress-ring__time {
    font-size: var(--sk-text-clock-long);
  }

  .l-progress-ring__state {
    color: hsl(var(--sk-color-warning));
    font-size: var(--sk-text-xs);
    letter-spacing: var(--sk-tracking-wide);
    text-transform: uppercase;
  }

  /* Short work areas clamp the window below the minimum height; shrink the
     ring and its clock so the panel never needs a scrollbar. */
  @media (max-height: 520px) {
    .l-progress-ring {
      inline-size: var(--sk-timer-ring-size-compact);
      block-size: var(--sk-timer-ring-size-compact);
    }

    .l-progress-ring__time {
      font-size: var(--sk-text-display-compact);
    }
  }

  @media (max-height: 460px) {
    .l-progress-ring {
      inline-size: var(--sk-timer-ring-size-tight);
      block-size: var(--sk-timer-ring-size-tight);
    }

    .l-progress-ring__time {
      font-size: var(--sk-text-display-tight);
    }
  }
</style>

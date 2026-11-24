<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { formatMinutes } from '../utils/format.util';
  import { timerStore } from '../state/timer.store.svelte.ts';

  const summary = $derived(timerStore.summary);
</script>

<div class="l-timer-summary">
  <span class="l-timer-summary__title">
    {m['summary.today']()} · {m['summary.rounds']({ count: summary.completedFocus })} ·
    {m['summary.focusTime']({ minutes: formatMinutes(summary.focusMs) })}
  </span>
  <span class="l-timer-summary__countdown">
    {m['summary.countdownTime']({
      count: summary.completedCountdown,
      minutes: formatMinutes(summary.countdownMs),
    })}
  </span>
</div>

<style>
  /* Prototype s01: a quiet 11 px footer separated by one border, not a card. */
  .l-timer-summary {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sk-space-xs) var(--sk-timer-today-gap);
    margin-block-start: var(--sk-space-xl);
    padding-block-start: var(--sk-timer-today-pad);
    border-block-start: var(--sk-edge) solid hsl(var(--sk-color-border));
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-2xs);
    font-variant-numeric: tabular-nums;
  }

  .l-timer-summary__title,
  .l-timer-summary__countdown {
    min-inline-size: 0;
  }

  .l-timer-summary__countdown {
    flex: 0 0 auto;
  }

  @media (max-height: 460px) {
    .l-timer-summary {
      margin-block-start: var(--sk-space-xs);
      padding-block-start: var(--sk-space-xs);
    }
  }
</style>

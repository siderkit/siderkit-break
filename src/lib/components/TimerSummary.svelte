<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { formatDateHeading, formatMinutes, localDateKey } from '../format';
  import { currentLocale } from '../locale';
  import { timerStore } from '../timer-store.svelte';

  const locale = currentLocale();
  const summary = $derived(timerStore.summary);
</script>

<div class="l-timer-summary">
  <span class="l-timer-summary__title">{formatDateHeading(localDateKey(), locale)}</span>
  <div class="l-timer-summary__values">
    <span>{m['summary.rounds']({ count: summary.completedFocus })}</span>
    <span class="l-timer-summary__dot" aria-hidden="true"></span>
    <span>{m['summary.focusTime']({ minutes: formatMinutes(summary.focusMs) })}</span>
    <span class="l-timer-summary__dot" aria-hidden="true"></span>
    <span>
      {m['summary.countdownTime']({
        count: summary.completedCountdown,
        minutes: formatMinutes(summary.countdownMs),
      })}
    </span>
  </div>
</div>

<style>
  .l-timer-summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-xs) var(--sk-space-md);
    padding: var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-md);
    background: hsl(var(--sk-color-bg-surface));
  }

  .l-timer-summary__title {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    letter-spacing: var(--sk-tracking-wide);
    white-space: nowrap;
  }

  .l-timer-summary__values {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-sm);
    font-variant-numeric: tabular-nums;
  }

  .l-timer-summary__dot {
    inline-size: var(--sk-space-2xs);
    block-size: var(--sk-space-2xs);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-border-strong));
  }

  @media (max-height: 460px) {
    .l-timer-summary {
      padding: var(--sk-space-xs) var(--sk-space-sm);
    }

    .l-timer-summary__title {
      display: none;
    }

    .l-timer-summary__values {
      font-size: var(--sk-text-xs);
    }
  }
</style>

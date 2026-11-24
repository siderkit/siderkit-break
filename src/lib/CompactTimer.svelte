<script lang="ts">
  import { m } from '../paraglide/messages.js';
  import { formatClock, phaseClass, phaseLabel } from './format';
  import { timerStore } from './timer-store.svelte';
  import Button from './ui/Button.svelte';

  let { onexpand }: { onexpand: () => void } = $props();

  const snapshot = $derived(timerStore.snapshot);
  const pendingBreak = $derived(snapshot.phase === 'Idle' ? snapshot.pendingBreak : null);
  const phase = $derived(pendingBreak ?? snapshot.phase);
  const primaryLabel = $derived.by(() => {
    if (snapshot.phase === 'Idle') {
      return pendingBreak ? m['timer.action.startBreak']() : m['timer.action.startFocus']();
    }
    return snapshot.isPaused ? m['timer.action.resume']() : m['timer.action.pause']();
  });
  const roundText = $derived(
    snapshot.phase !== 'Idle' && snapshot.phase !== 'Countdown' && snapshot.cycleIndex > 0
      ? m['timer.round']({
          round: snapshot.cycleIndex,
          total: timerStore.settings.timer.longBreakEvery,
        })
      : '',
  );
  const canEnd = $derived(snapshot.phase !== 'Idle');
</script>

<section class="l-compact-timer">
  <header class="l-compact-timer__head">
    <span class="l-compact-timer__dot {phaseClass(phase)}" aria-hidden="true"></span>
    <span class="l-compact-timer__phase">{phaseLabel(phase)}</span>
    {#if roundText}<span class="l-compact-timer__round">{roundText}</span>{/if}
    <span class="l-compact-timer__spacer"></span>
    <button
      class="l-compact-timer__expand"
      type="button"
      aria-label={m['compact.expand']()}
      title={m['compact.expand']()}
      onclick={onexpand}
    >
      <svg class="l-compact-timer__expand-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
      </svg>
    </button>
  </header>

  <div class="l-compact-timer__time" role="timer">{formatClock(snapshot.remainingMs)}</div>

  <div class="l-compact-timer__actions">
    <Button variant="Primary" size="Sm" onclick={() => void timerStore.primary()}>
      {primaryLabel}
    </Button>
    {#if canEnd}
      <Button variant="Secondary" size="Sm" onclick={() => void timerStore.skip()}>
        {m['compact.skip']()}
      </Button>
    {/if}
  </div>
</section>

<style>
  .l-compact-timer {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--sk-space-xs);
    padding: var(--sk-space-sm) var(--sk-space-md) var(--sk-space-md);
    overflow: hidden;
    background: var(--sk-gradient-app);
  }

  .l-compact-timer__head {
    display: flex;
    align-items: center;
    gap: var(--sk-space-2xs);
    min-block-size: var(--sk-settings-chip-height);
  }

  .l-compact-timer__dot {
    flex: 0 0 auto;
    inline-size: var(--sk-space-xs);
    block-size: var(--sk-space-xs);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-brand));
  }

  .l-compact-timer__dot.is-break {
    background: hsl(var(--sk-color-break));
  }

  .l-compact-timer__dot.is-countdown {
    background: hsl(var(--sk-color-countdown));
  }

  .l-compact-timer__dot.is-idle {
    background: hsl(var(--sk-color-border-strong));
  }

  .l-compact-timer__phase {
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
  }

  .l-compact-timer__round {
    overflow: hidden;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-compact-timer__spacer {
    flex: 1 1 auto;
  }

  .l-compact-timer__expand {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    inline-size: var(--sk-icon-button-size);
    block-size: var(--sk-icon-button-size);
    padding: 0;
    border: 0;
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
  }

  .l-compact-timer__expand:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-compact-timer__expand-icon {
    inline-size: var(--sk-icon-size);
    block-size: var(--sk-icon-size);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .l-compact-timer__time {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
    font-size: var(--sk-text-compact-clock);
    font-weight: var(--sk-weight-semibold);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--sk-tracking-tight);
    line-height: var(--sk-leading-none);
  }

  .l-compact-timer__actions {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    gap: var(--sk-space-xs);
  }
</style>

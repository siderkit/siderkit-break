<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import {
    cancelLabel,
    formatDateHeading,
    formatMinutes,
    localDateKey,
    phaseClass,
    phaseDurationMs,
    phaseLabel,
    skipLabel,
  } from '../format';
  import { currentLocale } from '../locale';
  import { timerStore } from '../timer-store.svelte';
  import Button from '../ui/Button.svelte';
  import ProgressRing from '../ui/ProgressRing.svelte';
  import CountdownDialog from './CountdownDialog.svelte';
  import HistoryDialog from './HistoryDialog.svelte';

  let countdownOpen = $state(false);
  let historyOpen = $state(false);
  const locale = currentLocale();

  const snapshot = $derived(timerStore.snapshot);
  const summary = $derived(timerStore.summary);
  const pendingBreak = $derived(snapshot.phase === 'Idle' ? snapshot.pendingBreak : null);
  const displayPhase = $derived(pendingBreak ?? snapshot.phase);
  const phaseText = $derived(pendingBreak ? m['overlay.breakReady']() : phaseLabel(snapshot.phase));
  const idlePreviewMs = $derived(
    pendingBreak ? phaseDurationMs(pendingBreak, timerStore.settings.timer) : 0,
  );
  const ringRemainingMs = $derived(
    snapshot.phase === 'Idle' ? idlePreviewMs : snapshot.remainingMs,
  );
  const ringPlannedMs = $derived(snapshot.phase === 'Idle' ? idlePreviewMs : snapshot.plannedMs);
  const primaryLabel = $derived.by(() => {
    if (snapshot.phase === 'Idle') {
      if (pendingBreak) {
        return m['timer.action.startBreak']();
      }
      const minutes = `${timerStore.settings.timer.focusMinutes} ${m['common.unit.minutes']()}`;
      return `${m['timer.action.startFocus']()} · ${minutes}`;
    }
    return snapshot.isPaused ? m['timer.action.resume']() : m['timer.action.pause']();
  });
  const roundText = $derived(
    snapshot.phase !== 'Countdown' && snapshot.cycleIndex > 0
      ? m['timer.round']({
          round: snapshot.cycleIndex,
          total: timerStore.settings.timer.longBreakEvery,
        })
      : '',
  );
  const canEnd = $derived(snapshot.phase !== 'Idle');
  const canDiscardPending = $derived(snapshot.phase === 'Idle' && pendingBreak !== null);
  const countdownAvailable = $derived(snapshot.phase === 'Idle' && pendingBreak === null);
  const secondaryLabel = $derived(skipLabel(snapshot.phase, pendingBreak));
  const discardLabel = $derived(cancelLabel(snapshot.phase, pendingBreak));

  function onPrimary(): void {
    void timerStore.primary();
  }

  function onEnd(): void {
    void timerStore.skip();
  }

  function onDiscard(): void {
    void timerStore.reset();
  }
</script>

<section class="l-timer-panel" class:is-modal={countdownOpen || historyOpen}>
  <div class="l-timer-panel__phase-row">
    <span class="l-timer-panel__phase {phaseClass(displayPhase)}">{phaseText}</span>
    {#if roundText}<span class="l-timer-panel__round">{roundText}</span>{/if}
  </div>

  <ProgressRing
    phase={displayPhase}
    remainingMs={ringRemainingMs}
    plannedMs={ringPlannedMs}
    paused={snapshot.isPaused}
    pausedLabel={m['timer.paused']()}
  />

  <div class="l-timer-panel__actions">
    <Button variant="Primary" onclick={onPrimary}>{primaryLabel}</Button>
  </div>

  <div class="l-timer-panel__quick-actions">
    {#if canEnd}
      <Button variant="Ghost" size="Sm" onclick={onEnd}>{secondaryLabel}</Button>
    {/if}
    {#if canDiscardPending}
      <Button variant="Ghost" size="Sm" onclick={onDiscard}>{discardLabel}</Button>
    {/if}
    {#if countdownAvailable}
      <Button variant="Secondary" size="Sm" onclick={() => (countdownOpen = true)}>
        {m['timer.action.startCountdown']()}
      </Button>
    {/if}
    <Button variant="Ghost" size="Sm" onclick={() => (historyOpen = true)}>
      {m['timer.action.history']()}
    </Button>
  </div>

  <div class="l-timer-panel__summary">
    <span class="l-timer-panel__summary-title">
      {formatDateHeading(localDateKey(), locale)}
    </span>
    <div class="l-timer-panel__summary-values">
      <span>{m['summary.rounds']({ count: summary.completedFocus })}</span>
      <span class="l-timer-panel__summary-dot" aria-hidden="true"></span>
      <span>{m['summary.focusTime']({ minutes: formatMinutes(summary.focusMs) })}</span>
      <span class="l-timer-panel__summary-dot" aria-hidden="true"></span>
      <span>
        {m['summary.countdownTime']({
          count: summary.completedCountdown,
          minutes: formatMinutes(summary.countdownMs),
        })}
      </span>
    </div>
  </div>

  {#if countdownOpen}
    <CountdownDialog onclose={() => (countdownOpen = false)} />
  {/if}
  {#if historyOpen}
    <HistoryDialog onclose={() => (historyOpen = false)} />
  {/if}
</section>

<style>
  .l-timer-panel {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--sk-space-md);
    min-block-size: 0;
    padding: var(--sk-space-lg) var(--sk-space-lg) var(--sk-space-xl);
    overflow-y: auto;
  }

  .l-timer-panel.is-modal {
    overflow: hidden;
  }

  @media (max-height: 520px) {
    .l-timer-panel {
      gap: var(--sk-space-sm);
      padding: var(--sk-space-md) var(--sk-space-lg);
      overflow-y: hidden;
      scrollbar-width: none;
    }

    .l-timer-panel::-webkit-scrollbar {
      display: none;
    }
  }

  @media (max-height: 460px) {
    .l-timer-panel {
      gap: var(--sk-space-xs);
      padding: var(--sk-space-sm) var(--sk-space-lg);
    }

    .l-timer-panel__summary {
      padding: var(--sk-space-xs) var(--sk-space-sm);
    }

    .l-timer-panel__summary-title {
      display: none;
    }

    .l-timer-panel__summary-values {
      font-size: var(--sk-text-xs);
    }
  }

  @media (max-height: 380px) {
    .l-timer-panel__summary {
      display: none;
    }
  }

  .l-timer-panel__phase-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-md);
    min-block-size: var(--sk-control-height-sm);
  }

  .l-timer-panel__phase {
    display: inline-flex;
    align-items: center;
    padding: var(--sk-space-3xs) var(--sk-space-md);
    border-radius: var(--sk-radius-full);
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-wide);
    text-transform: uppercase;
  }

  .l-timer-panel__phase.is-focus {
    color: hsl(var(--sk-color-brand));
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-timer-panel__phase.is-break {
    color: hsl(var(--sk-color-break));
    background: hsl(var(--sk-color-break-soft));
  }

  .l-timer-panel__phase.is-countdown {
    color: hsl(var(--sk-color-countdown));
    background: hsl(var(--sk-color-countdown-soft));
  }

  .l-timer-panel__phase.is-idle {
    color: hsl(var(--sk-color-text-muted));
    background: hsl(var(--sk-color-bg-app));
  }

  .l-timer-panel__round {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    letter-spacing: var(--sk-tracking-wide);
  }

  .l-timer-panel__actions {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-sm);
  }

  .l-timer-panel__quick-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--sk-space-sm);
  }

  .l-timer-panel__summary {
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

  .l-timer-panel__summary-title {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    letter-spacing: var(--sk-tracking-wide);
    white-space: nowrap;
  }

  .l-timer-panel__summary-values {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-sm);
    font-variant-numeric: tabular-nums;
  }

  .l-timer-panel__summary-dot {
    inline-size: var(--sk-space-2xs);
    block-size: var(--sk-space-2xs);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-border-strong));
  }
</style>

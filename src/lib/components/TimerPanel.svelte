<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import {
    cancelLabel,
    phaseClass,
    phaseDurationMs,
    phaseLabel,
    skipLabel,
  } from '../utils/format.util';
  import { timerStore } from '../state/timer.store.svelte.ts';
  import Button from '../ui/Button.svelte';
  import ProgressRing from '../ui/ProgressRing.svelte';
  import CountdownDialog from './CountdownDialog.svelte';
  import HistoryDialog from './HistoryDialog.svelte';
  import TimerSummary from './TimerSummary.svelte';

  let countdownOpen = $state(false);
  let historyOpen = $state(false);

  const snapshot = $derived(timerStore.snapshot);
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
  <div class="l-timer-panel__stack">
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

    <TimerSummary />
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
    min-block-size: 0;
    padding: 0 var(--sk-space-lg) var(--sk-space-lg);
    overflow-y: auto;
  }

  .l-timer-panel__stack {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-block-size: 0;
  }

  .l-timer-panel.is-modal {
    overflow: hidden;
  }

  /* Prototype s01: the phase row owns the top rhythm and the summary is pinned
     to the bottom. */
  .l-timer-panel__phase-row {
    display: flex;
    flex: 0 0 auto;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sk-space-md);
    padding: var(--sk-timer-phase-pad);
  }

  .l-timer-panel__phase {
    display: inline-flex;
    align-items: center;
    padding: var(--sk-timer-pill-pad);
    border-radius: var(--sk-radius-full);
    font-size: var(--sk-text-note);
    font-weight: var(--sk-weight-bold);
    letter-spacing: var(--sk-tracking-pill);
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
    font-size: var(--sk-text-2xs);
  }

  .l-timer-panel__actions {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: var(--sk-space-sm);
  }

  .l-timer-panel__actions > :global(button) {
    min-block-size: var(--sk-timer-primary-height);
    border-radius: var(--sk-radius-card);
    font-size: var(--sk-text-action);
    font-weight: var(--sk-weight-bold);
  }

  .l-timer-panel__quick-actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--sk-space-2xs);
    margin: var(--sk-space-lg) 0 var(--sk-space-2xs);
  }

  .l-timer-panel__quick-actions > :global(button) {
    min-block-size: var(--sk-timer-quick-height);
    padding: var(--sk-timer-quick-pad);
    border-radius: var(--sk-timer-quick-radius);
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-regular);
  }

  /* Prototype low layout: 110 px ring and a 36 px primary button. */
  @media (max-height: 460px) {
    .l-timer-panel {
      padding: 0 var(--sk-space-lg) var(--sk-space-md);
      overflow-y: hidden;
      scrollbar-width: none;
    }

    .l-timer-panel::-webkit-scrollbar {
      display: none;
    }

    .l-timer-panel__stack {
      gap: var(--sk-space-xs);
    }

    .l-timer-panel__phase-row {
      padding: var(--sk-space-sm) 0 var(--sk-space-3xs);
    }

    .l-timer-panel__actions > :global(button) {
      min-block-size: var(--sk-timer-primary-height-tight);
    }

    .l-timer-panel__quick-actions {
      margin-block: 0;
    }

    .l-timer-panel__quick-actions > :global(button) {
      min-block-size: var(--sk-timer-quick-height-tight);
      font-size: var(--sk-text-note);
    }
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../paraglide/messages.js';
  import {
    dismissCountdownNotice,
    fitBreakCard,
    hideBreakCard,
    onCountdownFinished,
  } from './ipc/client';
  import { timerStore } from './timer-store.svelte';
  import Button from './ui/Button.svelte';

  let card = $state<HTMLElement>();
  let finishedMinutes = $state<number | null>(null);

  const snapshot = $derived(timerStore.snapshot);

  onMount(() => {
    void timerStore.init();
    let stop: (() => void) | undefined;
    void onCountdownFinished((minutes) => {
      finishedMinutes = minutes;
    }).then((unlisten) => {
      stop = unlisten;
    });
    return () => {
      stop?.();
      timerStore.destroy();
    };
  });

  // Starting any phase takes the window over, so a stale countdown card never
  // reappears when the timer returns to idle later.
  $effect(() => {
    if (snapshot.phase !== 'Idle') {
      finishedMinutes = null;
    }
  });

  // The native window is a fixed HUD, so it follows the measured card height.
  // Watching the card also covers locale changes and wrapped action rows.
  $effect(() => {
    if (!card) {
      return;
    }
    const target = card;
    let frame = 0;
    const fit = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        void fitBreakCard(target.getBoundingClientRect().height + bodyPadding());
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(target);
    fit();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });

  function bodyPadding(): number {
    const style = getComputedStyle(document.body);
    return Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  }

  function dismiss(): void {
    void hideBreakCard();
  }

  function postpone(): void {
    void timerStore.postpone();
  }

  function skip(): void {
    void timerStore.skip();
  }

  function dismissCountdown(): void {
    finishedMinutes = null;
    void dismissCountdownNotice();
  }

  function repeatCountdown(): void {
    const minutes = finishedMinutes;
    finishedMinutes = null;
    if (minutes !== null) {
      void timerStore.startCountdown(minutes);
    }
  }
</script>

{#if finishedMinutes !== null}
  <section class="l-break-card is-done" bind:this={card} aria-labelledby="countdown-done-title">
    <h2 class="l-break-card__title" id="countdown-done-title">{m['countdown.done.title']()}</h2>
    <p class="l-break-card__body">
      {m['countdown.done.body']({ minutes: finishedMinutes })}
    </p>
    <div class="l-break-card__actions">
      <Button variant="Primary" size="Sm" onclick={dismissCountdown}>
        {m['countdown.done.dismiss']()}
      </Button>
      <Button variant="Ghost" size="Sm" onclick={repeatCountdown}>
        {m['countdown.done.again']()}
      </Button>
    </div>
  </section>
{:else}
  <section class="l-break-card" bind:this={card} aria-labelledby="break-title">
    <h2 class="l-break-card__title" id="break-title">{m['break.focus.title']()}</h2>
    <p class="l-break-card__body">{m['break.focus.body']()}</p>
    <div class="l-break-card__actions">
      <Button variant="Primary" size="Sm" onclick={dismiss}>
        {m['timer.action.collapseBreak']()}
      </Button>
      <Button variant="Ghost" size="Sm" onclick={postpone}>
        {m['timer.action.postponeFive']()}
      </Button>
      <Button variant="Ghost" size="Sm" onclick={skip}>{m['timer.action.skipBreak']()}</Button>
    </div>
  </section>
{/if}

<style>
  .l-break-card {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-xs);
    padding: var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-break));
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-bg-surface));
  }

  .l-break-card.is-done {
    border-color: hsl(var(--sk-color-countdown));
  }

  .l-break-card__title {
    margin: 0;
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-break-card__body {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
  }

  .l-break-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sk-space-sm);
    margin-block-start: var(--sk-space-2xs);
  }
</style>

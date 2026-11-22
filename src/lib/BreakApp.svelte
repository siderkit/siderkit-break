<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../paraglide/messages.js';
  import ReminderCard from './components/ReminderCard.svelte';
  import {
    dismissNotice,
    fitBreakCard,
    getNotice,
    hideBreakCard,
    isTauri,
    onTimerNotice,
  } from './ipc/client';
  import type { TimerNotice } from './ipc/types';
  import { timerStore } from './timer-store.svelte';
  import Button from './ui/Button.svelte';

  /** How long a card stays while the next phase already runs unattended. */
  const AUTO_DISMISS_MS = 8000;

  let card = $state<HTMLElement>();
  let notice = $state<TimerNotice | null>(null);

  const snapshot = $derived(timerStore.snapshot);
  const countdownMinutes = $derived(notice?.kind === 'CountdownDone' ? notice.minutes : 0);
  const runningBreak = $derived(snapshot.phase === 'ShortBreak' || snapshot.phase === 'LongBreak');
  const autoDismissMs = $derived(
    notice?.kind === 'BreakDone' && snapshot.phase !== 'Idle' ? AUTO_DISMISS_MS : null,
  );

  onMount(() => {
    void timerStore.init();
    let stopNotice: (() => void) | undefined;

    if (isTauri) {
      let received = false;
      void onTimerNotice((next) => {
        received = true;
        notice = next;
      }).then((unlisten) => {
        stopNotice = unlisten;
        // The window can load after the transition, so read the current card
        // unless an event already delivered the newest state.
        void getNotice().then((initial) => {
          if (!received) {
            notice = initial;
          }
        });
      });
    } else {
      notice = previewNotice();
    }

    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      closeCard();
    };
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('keydown', onKeydown);
      stopNotice?.();
      timerStore.destroy();
    };
  });

  // A break that ended into an automatic focus must not leave a card on top of
  // the running session, so it closes itself after the user has had a moment.
  $effect(() => {
    if (autoDismissMs === null) {
      return;
    }
    const timeout = setTimeout(() => void dismissNotice(), autoDismissMs);
    return () => clearTimeout(timeout);
  });

  // The native window is a fixed HUD, so it follows the measured card height.
  // Watching the wrapper also covers locale changes and wrapped action rows.
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

  /** Browser-only preview: break.html?notice=FocusDone etc. */
  function previewNotice(): TimerNotice | null {
    const kind = new URLSearchParams(window.location.search).get('notice');
    if (kind === 'FocusDone' || kind === 'BreakDone') {
      return { kind };
    }
    if (kind === 'CountdownDone') {
      return { kind, minutes: 25 };
    }
    return null;
  }

  function closeCard(): void {
    if (!isTauri) {
      notice = null;
      return;
    }
    if (notice) {
      void dismissNotice();
      return;
    }
    void hideBreakCard();
  }

  function startNextPhase(): void {
    if (!isTauri) {
      return;
    }
    void timerStore.start();
  }

  function repeatCountdown(minutes: number): void {
    if (!isTauri) {
      return;
    }
    void timerStore.startCountdown(minutes);
  }
</script>

<div bind:this={card}>
  {#if notice?.kind === 'CountdownDone'}
    <ReminderCard
      tone="Countdown"
      icon="Clock"
      title={m['countdown.done.title']()}
      body={m['countdown.done.body']({ minutes: countdownMinutes })}
    >
      {#snippet actions()}
        <Button variant="Primary" size="Sm" onclick={closeCard}>
          {m['countdown.done.dismiss']()}
        </Button>
        <Button variant="Ghost" size="Sm" onclick={() => repeatCountdown(countdownMinutes)}>
          {m['countdown.done.again']()}
        </Button>
      {/snippet}
    </ReminderCard>
  {:else if notice?.kind === 'FocusDone'}
    <ReminderCard
      tone="Break"
      icon="Coffee"
      title={m['notification.focus.title']()}
      body={m['notification.focus.body']()}
    >
      {#snippet actions()}
        <Button variant="Primary" size="Sm" onclick={startNextPhase}>
          {m['timer.action.startBreak']()}
        </Button>
        <Button variant="Ghost" size="Sm" onclick={closeCard}>
          {m['common.action.close']()}
        </Button>
      {/snippet}
    </ReminderCard>
  {:else if notice?.kind === 'BreakDone'}
    <ReminderCard
      tone="Focus"
      icon="Check"
      title={m['notification.break.title']()}
      body={m['notification.break.body']()}
      {autoDismissMs}
    >
      {#snippet actions()}
        {#if snapshot.phase === 'Idle'}
          <Button variant="Primary" size="Sm" onclick={startNextPhase}>
            {m['timer.action.startFocus']()}
          </Button>
        {/if}
        <Button variant="Ghost" size="Sm" onclick={closeCard}>
          {m['common.action.close']()}
        </Button>
      {/snippet}
    </ReminderCard>
  {:else if runningBreak}
    <ReminderCard
      tone="RunningBreak"
      icon="Leaf"
      title={m['break.focus.title']()}
      body={m['break.focus.body']()}
    >
      {#snippet actions()}
        <Button variant="Primary" size="Sm" onclick={closeCard}>
          {m['timer.action.collapseBreak']()}
        </Button>
        <Button variant="Ghost" size="Sm" onclick={() => void timerStore.postpone()}>
          {m['timer.action.postponeFive']()}
        </Button>
        <Button variant="Ghost" size="Sm" onclick={() => void timerStore.skip()}>
          {m['timer.action.skipBreak']()}
        </Button>
      {/snippet}
    </ReminderCard>
  {/if}
</div>

<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import {
    COUNTDOWN_PRESETS,
    COUNTDOWN_STORAGE_KEY,
    canStartCountdown,
    countdownFields,
    countdownParts,
    storedCountdownMinutes,
  } from '../countdown';
  import { formatClock } from '../format';
  import { timerStore } from '../timer-store.svelte';
  import Button from '../ui/Button.svelte';
  import PresetChips from '../ui/PresetChips.svelte';
  import Stepper from '../ui/Stepper.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let dialog = $state<HTMLDialogElement>();
  let fields = $state(
    countdownFields(storedCountdownMinutes(localStorage.getItem(COUNTDOWN_STORAGE_KEY))),
  );
  let starting = $state(false);

  const total = $derived(countdownParts(fields.hours, fields.minutes).totalMinutes);
  const totalClock = $derived(formatClock(total * 60_000));
  const minuteMax = $derived(fields.hours >= 24 ? 0 : 59);
  const valid = $derived(canStartCountdown(total));

  // Remember the last length so the next countdown is one click away.
  $effect(() => {
    if (valid) {
      localStorage.setItem(COUNTDOWN_STORAGE_KEY, String(total));
    }
  });

  onMount(() => {
    timerStore.clearError();
    dialog?.showModal();
  });

  function selectPreset(minutes: number): void {
    fields = countdownFields(minutes);
  }

  function setHours(hours: number): void {
    fields = countdownFields(countdownParts(hours, fields.minutes).totalMinutes);
  }

  function setMinutes(minutes: number): void {
    fields = countdownFields(countdownParts(fields.hours, minutes).totalMinutes);
  }

  async function start(): Promise<void> {
    if (!valid || starting) {
      return;
    }
    starting = true;
    const started = await timerStore.startCountdown(total);
    starting = false;
    if (started) {
      dialog?.close();
    }
  }
</script>

<dialog class="l-countdown-dialog" bind:this={dialog} aria-labelledby="countdown-title" {onclose}>
  <div class="l-countdown-dialog__card">
    <h2 class="l-countdown-dialog__title" id="countdown-title">{m['countdown.title']()}</h2>
    <p class="l-countdown-dialog__body">{m['countdown.description']()}</p>

    <PresetChips
      label={m['countdown.presetLabel']()}
      options={COUNTDOWN_PRESETS}
      value={total}
      format={(minutes) => String(minutes)}
      onselect={selectPreset}
    />

    <div class="l-countdown-dialog__custom">
      <Stepper
        label={m['countdown.hours']()}
        value={fields.hours}
        min={0}
        max={24}
        suffix={m['common.unit.hours']()}
        dense
        onchange={setHours}
      />
      <Stepper
        label={m['countdown.minutes']()}
        value={fields.minutes}
        min={0}
        max={minuteMax}
        suffix={m['common.unit.minutes']()}
        dense
        onchange={setMinutes}
      />
    </div>

    <div class="l-countdown-dialog__summary">
      <span class="l-countdown-dialog__total">{m['countdown.total']({ time: totalClock })}</span>
      <span class="l-countdown-dialog__hint">{m['countdown.maxHint']()}</span>
    </div>

    {#if !valid}
      <p class="l-countdown-dialog__error" role="alert">{m['countdown.invalid']()}</p>
    {:else if timerStore.error}
      <p class="l-countdown-dialog__error" role="alert">{timerStore.error}</p>
    {/if}

    <div class="l-countdown-dialog__actions">
      <Button variant="Primary" disabled={!valid || starting} onclick={() => void start()}>
        {m['countdown.start']()}
      </Button>
      <Button variant="Ghost" onclick={() => dialog?.close()}>
        {m['common.action.cancel']()}
      </Button>
    </div>
  </div>
</dialog>

<style>
  .l-countdown-dialog {
    inline-size: var(--sk-dialog-inline-size);
    padding: 0;
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
  }

  .l-countdown-dialog::backdrop {
    background: hsl(var(--sk-color-overlay-surface));
    -webkit-backdrop-filter: blur(var(--sk-overlay-blur));
    backdrop-filter: blur(var(--sk-overlay-blur));
  }

  .l-countdown-dialog__card {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-lg);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-countdown-dialog__title {
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-countdown-dialog__body {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
  }

  .l-countdown-dialog__custom {
    display: flex;
    flex-direction: column;
    padding: var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-md);
    background: hsl(var(--sk-color-bg-app));
  }

  .l-countdown-dialog__summary {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sk-space-md);
  }

  .l-countdown-dialog__total {
    font-size: var(--sk-text-lg);
    font-variant-numeric: tabular-nums;
    font-weight: var(--sk-weight-semibold);
  }

  .l-countdown-dialog__hint {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-countdown-dialog__error {
    margin: 0;
    color: hsl(var(--sk-color-break));
    font-size: var(--sk-text-sm);
  }

  .l-countdown-dialog__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--sk-space-sm);
  }
</style>

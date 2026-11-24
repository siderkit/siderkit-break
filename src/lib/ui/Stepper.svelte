<script lang="ts">
  import { onDestroy } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { clampStep, stepValue } from '../utils/stepper.util';

  let {
    label,
    value,
    min,
    max,
    step = 1,
    suffix,
    dense = false,
    onchange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    dense?: boolean;
    onchange: (value: number) => void;
  } = $props();

  let holdValue = $state<number | null>(null);
  const current = $derived(holdValue ?? value);
  let holdDelay: ReturnType<typeof setTimeout> | undefined;
  let holdRepeat: ReturnType<typeof setInterval> | undefined;

  function nudge(delta: number): void {
    onchange(stepValue(value, delta, min, max));
  }

  function apply(delta: number): void {
    const next = stepValue(current, delta, min, max);
    holdValue = next;
    onchange(next);
  }

  function beginHold(delta: number): void {
    holdValue = value;
    apply(delta);
    holdDelay = setTimeout(() => {
      holdRepeat = setInterval(() => apply(delta), 80);
    }, 400);
  }

  function endHold(): void {
    holdValue = null;
    if (holdDelay) {
      clearTimeout(holdDelay);
      holdDelay = undefined;
    }
    if (holdRepeat) {
      clearInterval(holdRepeat);
      holdRepeat = undefined;
    }
  }

  function commit(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const parsed = Number(input.value);
    const next = clampStep(parsed, min, max, step);
    holdValue = null;
    input.value = String(next);
    onchange(next);
  }

  onDestroy(endHold);
</script>

<div class="l-stepper" class:is-dense={dense}>
  <span class="l-stepper__label" id="stepper-{label}">{label}</span>
  <div class="l-stepper__control" role="group" aria-labelledby="stepper-{label}">
    <button
      class="l-stepper__button"
      type="button"
      aria-label={m['common.action.decrease']({ label })}
      disabled={current <= min}
      onclick={(event) => event.detail === 0 && nudge(-1)}
      onpointerdown={() => beginHold(-1)}
      onpointerup={endHold}
      onpointerleave={endHold}
      onpointercancel={endHold}
    >
      −
    </button>
    <input
      class="l-stepper__input"
      type="text"
      inputmode="numeric"
      aria-labelledby="stepper-{label}"
      value={current}
      onchange={commit}
    />
    {#if suffix}<span class="l-stepper__suffix">{suffix}</span>{/if}
    <button
      class="l-stepper__button"
      type="button"
      aria-label={m['common.action.increase']({ label })}
      disabled={current >= max}
      onclick={(event) => event.detail === 0 && nudge(1)}
      onpointerdown={() => beginHold(1)}
      onpointerup={endHold}
      onpointerleave={endHold}
      onpointercancel={endHold}
    >
      +
    </button>
  </div>
</div>

<style>
  .l-stepper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-sm);
    padding-block: var(--sk-space-md);
  }

  .l-stepper.is-dense {
    padding-block: var(--sk-space-xs);
  }

  @media (max-height: 460px) {
    .l-stepper.is-dense {
      padding-block: 0;
    }
  }

  .l-stepper__label {
    color: hsl(var(--sk-color-text));
  }

  .l-stepper__control {
    display: inline-flex;
    align-items: center;
    gap: var(--sk-space-2xs);
    padding: var(--sk-space-3xs);
    border: var(--sk-edge) solid hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-sm);
    background: hsl(var(--sk-color-bg-raised));
    transition: border-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-stepper__control:focus-within {
    border-color: hsl(var(--sk-color-brand));
  }

  .l-stepper__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--sk-control-height-sm);
    block-size: var(--sk-control-height-sm);
    border: 0;
    border-radius: var(--sk-radius-xs);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-lg);
    line-height: var(--sk-leading-none);
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-stepper__button:hover:not(:disabled) {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-stepper__button:disabled {
    cursor: not-allowed;
    opacity: var(--sk-opacity-disabled);
  }

  .l-stepper__input {
    inline-size: var(--sk-number-field-width);
    padding-block: var(--sk-space-2xs);
    padding-inline: var(--sk-space-3xs);
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .l-stepper__input:focus-visible {
    outline: none;
  }

  .l-stepper__suffix {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    letter-spacing: var(--sk-tracking-wide);
    text-transform: uppercase;
    white-space: nowrap;
  }
</style>

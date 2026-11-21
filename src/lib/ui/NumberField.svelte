<script lang="ts">
  let {
    label,
    value,
    min,
    max,
    step = 1,
    suffix,
    onchange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    onchange: (value: number) => void;
  } = $props();

  function commit(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const parsed = Number(input.value);
    const next = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, Math.round(parsed / step) * step))
      : value;
    input.value = String(next);
    onchange(next);
  }
</script>

<label class="l-number-field">
  <span class="l-number-field__label">{label}</span>
  <span class="l-number-field__control">
    <input
      class="l-number-field__input"
      type="number"
      {min}
      {max}
      {step}
      {value}
      onchange={commit}
    />
    {#if suffix}<span class="l-number-field__suffix">{suffix}</span>{/if}
  </span>
</label>

<style>
  .l-number-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-lg);
    padding-block: var(--sk-space-md);
  }

  .l-number-field__label {
    color: hsl(var(--sk-color-text));
  }

  .l-number-field__control {
    display: inline-flex;
    align-items: center;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-3xs) var(--sk-space-sm) var(--sk-space-3xs) var(--sk-space-3xs);
    border: var(--sk-edge) solid hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-sm);
    background: hsl(var(--sk-color-bg-raised));
    transition: border-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-number-field__control:focus-within {
    border-color: hsl(var(--sk-color-brand));
  }

  .l-number-field__input {
    inline-size: var(--sk-number-field-width);
    padding-block: var(--sk-space-2xs);
    padding-inline: var(--sk-space-3xs);
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
    font-variant-numeric: tabular-nums;
    text-align: end;
    appearance: textfield;
  }

  .l-number-field__input:focus-visible {
    outline: none;
  }

  .l-number-field__input::-webkit-inner-spin-button,
  .l-number-field__input::-webkit-outer-spin-button {
    margin: 0;
    appearance: none;
  }

  .l-number-field__suffix {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    letter-spacing: var(--sk-tracking-wide);
    text-transform: uppercase;
  }
</style>

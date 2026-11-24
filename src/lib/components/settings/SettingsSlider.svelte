<script lang="ts">
  import SettingsCell from './SettingsCell.svelte';

  let {
    label,
    value,
    min,
    max,
    step = 1,
    valueLabel,
    disabled = false,
    divided = false,
    onchange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    valueLabel: string;
    disabled?: boolean;
    divided?: boolean;
    onchange: (value: number) => void;
  } = $props();
</script>

<SettingsCell stacked {divided}>
  <div class="l-settings-slider__head">
    <span class="l-settings-slider__label">{label}</span>
    <span class="l-settings-slider__value">{valueLabel}</span>
  </div>
  <input
    class="l-settings-slider__input"
    type="range"
    {min}
    {max}
    {step}
    {value}
    {disabled}
    aria-label={label}
    onchange={(event) => onchange(Number(event.currentTarget.value))}
  />
</SettingsCell>

<style>
  .l-settings-slider__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sk-space-md);
  }

  .l-settings-slider__label {
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-medium);
  }

  .l-settings-slider__value {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-value);
    font-variant-numeric: tabular-nums;
  }

  .l-settings-slider__input {
    inline-size: 100%;
    margin: 0;
    accent-color: hsl(var(--sk-color-brand));
    cursor: pointer;
  }

  .l-settings-slider__input:disabled {
    cursor: not-allowed;
    opacity: var(--sk-opacity-disabled);
  }
</style>

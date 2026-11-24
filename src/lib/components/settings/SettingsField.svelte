<script lang="ts">
  import type { Snippet } from 'svelte';

  import SettingsCell from './SettingsCell.svelte';

  let {
    label,
    value,
    divided = false,
    children,
  }: {
    label: string;
    value?: string;
    divided?: boolean;
    children: Snippet;
  } = $props();
</script>

<SettingsCell stacked {divided}>
  <div class="l-settings-field__head">
    <span class="l-settings-field__label">{label}</span>
    {#if value}<span class="l-settings-field__value">{value}</span>{/if}
  </div>
  {@render children()}
</SettingsCell>

<style>
  .l-settings-field__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sk-space-md);
  }

  .l-settings-field__label {
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-medium);
  }

  .l-settings-field__value {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-value);
    font-variant-numeric: tabular-nums;
  }
</style>

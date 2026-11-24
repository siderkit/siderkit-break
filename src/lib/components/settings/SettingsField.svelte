<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    value,
    children,
  }: {
    label: string;
    value?: string;
    children: Snippet;
  } = $props();
</script>

<div class="l-settings-field">
  <div class="l-settings-field__head">
    <span class="l-settings-field__label">{label}</span>
    {#if value}<span class="l-settings-field__value">{value}</span>{/if}
  </div>
  {@render children()}
</div>

<style>
  .l-settings-field {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-xs);
    padding: var(--sk-space-sm);
  }

  .l-settings-field__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sk-space-sm);
  }

  .l-settings-field__label {
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-sm);
  }

  .l-settings-field__value {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    font-variant-numeric: tabular-nums;
  }
</style>

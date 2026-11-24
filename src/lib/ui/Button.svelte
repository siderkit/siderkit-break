<script lang="ts">
  import type { Snippet } from 'svelte';

  type ButtonVariant = 'Primary' | 'Secondary' | 'Ghost' | 'Danger';
  type ButtonSize = 'Sm' | 'Md';

  let {
    variant = 'Secondary',
    size = 'Md',
    disabled = false,
    title,
    onclick,
    children,
  }: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    title?: string;
    onclick?: (event: MouseEvent) => void;
    children: Snippet;
  } = $props();
</script>

<button
  class="l-button l-button--{variant.toLowerCase()}"
  class:l-button--sm={size === 'Sm'}
  type="button"
  {disabled}
  {title}
  {onclick}
>
  {@render children()}
</button>

<style>
  .l-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sk-space-sm);
    min-block-size: var(--sk-control-height);
    padding-block: 0;
    padding-inline: var(--sk-space-lg);
    border: var(--sk-edge) solid transparent;
    border-radius: var(--sk-radius-sm);
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-semibold);
    line-height: normal;
    letter-spacing: var(--sk-tracking-tight);
    white-space: nowrap;
    transition:
      background-color var(--sk-duration-base) var(--sk-ease-standard),
      color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-button--sm {
    min-block-size: var(--sk-control-height-sm);
    padding-inline: var(--sk-space-md);
    font-size: var(--sk-text-sm);
  }

  .l-button:disabled {
    cursor: not-allowed;
    opacity: var(--sk-opacity-disabled);
  }

  .l-button--primary {
    color: hsl(var(--sk-color-on-brand));
    background: hsl(var(--sk-color-brand));
  }

  .l-button--primary:hover:not(:disabled) {
    background: hsl(var(--sk-color-brand-strong));
  }

  .l-button--secondary {
    color: hsl(var(--sk-color-brand-strong));
    background: hsl(var(--sk-color-brand-soft) / 0.55);
  }

  .l-button--secondary:hover:not(:disabled) {
    color: hsl(var(--sk-color-brand-strong));
    background: hsl(var(--sk-color-brand-soft) / 0.8);
  }

  .l-button--ghost {
    color: hsl(var(--sk-color-text-muted));
    background: hsl(var(--sk-color-text) / 0.05);
  }

  .l-button--ghost:hover:not(:disabled) {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-button--danger {
    color: hsl(var(--sk-color-bg-surface));
    background: hsl(var(--sk-color-alert));
  }

  .l-button--danger:hover:not(:disabled) {
    background: hsl(var(--sk-color-alert) / 0.86);
  }
</style>

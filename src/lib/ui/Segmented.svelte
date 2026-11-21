<script lang="ts">
  let {
    options,
    value,
    label,
    onchange,
  }: {
    options: Array<{ value: string; label: string }>;
    value: string;
    label?: string;
    onchange: (value: string) => void;
  } = $props();
</script>

<div class="l-segmented">
  {#if label}<span class="l-segmented__label">{label}</span>{/if}
  <div class="l-segmented__group" role="group" aria-label={label}>
    {#each options as option (option.value)}
      <button
        type="button"
        class="l-segmented__option"
        class:is-active={option.value === value}
        aria-pressed={option.value === value}
        onclick={() => onchange(option.value)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .l-segmented {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-2xs);
    padding-block: var(--sk-space-md);
  }

  .l-segmented__label {
    color: hsl(var(--sk-color-text));
  }

  .l-segmented__group {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    gap: var(--sk-space-3xs);
    padding: var(--sk-space-3xs);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-sm);
    background: hsl(var(--sk-color-bg-app));
  }

  .l-segmented__option {
    min-block-size: var(--sk-control-height-sm);
    padding-inline: var(--sk-space-xs);
    border: 0;
    border-radius: var(--sk-radius-xs);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-xs);
    white-space: nowrap;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-segmented__option:hover {
    color: hsl(var(--sk-color-text));
  }

  .l-segmented__option.is-active {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-bg-raised));
    box-shadow: var(--sk-shadow-soft);
  }
</style>

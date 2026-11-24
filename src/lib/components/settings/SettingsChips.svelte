<script lang="ts">
  let {
    label,
    options,
    value,
    format = (option: number) => String(option),
    onselect,
  }: {
    label: string;
    options: number[];
    value: number;
    format?: (option: number) => string;
    onselect: (option: number) => void;
  } = $props();
</script>

<div class="l-settings-chips" role="group" aria-label={label}>
  {#each options as option (option)}
    <button
      class="l-settings-chips__chip"
      class:is-on={option === value}
      type="button"
      aria-pressed={option === value}
      onclick={() => onselect(option)}
    >
      {format(option)}
    </button>
  {/each}
</div>

<style>
  .l-settings-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sk-space-2xs);
  }

  .l-settings-chips__chip {
    min-inline-size: var(--sk-settings-chip-height);
    min-block-size: var(--sk-settings-chip-height);
    padding-inline: var(--sk-space-xs);
    border: var(--sk-edge) solid hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-sm);
    font-variant-numeric: tabular-nums;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      border-color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-settings-chips__chip:hover {
    color: hsl(var(--sk-color-text));
    border-color: hsl(var(--sk-color-brand));
  }

  .l-settings-chips__chip.is-on {
    color: hsl(var(--sk-color-on-brand));
    border-color: hsl(var(--sk-color-brand));
    background: hsl(var(--sk-color-brand));
  }
</style>

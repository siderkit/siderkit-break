<script lang="ts">
  let {
    label,
    options,
    value,
    size = 'Sm',
    format = (option: number) => String(option),
    onselect,
  }: {
    label: string;
    options: number[];
    value: number;
    size?: 'Sm' | 'Md';
    format?: (option: number) => string;
    onselect: (option: number) => void;
  } = $props();
</script>

<div class="l-settings-chips" class:is-tall={size === 'Md'} role="group" aria-label={label}>
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
    flex: 1 1 auto;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
  }

  .l-settings-chips__chip {
    display: inline-flex;
    flex: 1 1 0;
    align-items: center;
    justify-content: center;
    min-inline-size: 0;
    block-size: var(--sk-settings-chip-height);
    padding: 0;
    border: 0;
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-text) / 0.06);
    font-size: var(--sk-text-sm);
    font-variant-numeric: tabular-nums;
    line-height: normal;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-settings-chips.is-tall .l-settings-chips__chip {
    block-size: var(--sk-settings-chip-height-root);
  }

  .l-settings-chips__chip:hover {
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-settings-chips__chip.is-on {
    color: hsl(var(--sk-color-on-brand));
    background: hsl(var(--sk-color-brand));
    font-weight: var(--sk-weight-bold);
  }
</style>

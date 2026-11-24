<script lang="ts">
  let {
    label,
    options,
    value,
    format,
    onselect,
  }: {
    label: string;
    options: number[];
    value: number;
    format: (value: number) => string;
    onselect: (value: number) => void;
  } = $props();
</script>

<div class="l-preset-chips">
  <div class="l-preset-chips__list" role="group" aria-label={label}>
    {#each options as option (option)}
      <button
        class="l-preset-chips__chip"
        class:is-active={option === value}
        type="button"
        aria-pressed={option === value}
        onclick={() => onselect(option)}
      >
        {format(option)}
      </button>
    {/each}
  </div>
</div>

<style>
  .l-preset-chips {
    padding-block-end: var(--sk-space-sm);
  }

  .l-preset-chips__list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sk-space-2xs);
  }

  .l-preset-chips__chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: var(--sk-control-height-sm);
    padding-inline: var(--sk-space-md);
    border: 0;
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text-muted));
    background: hsl(var(--sk-color-text) / 0.06);
    font-size: var(--sk-text-sm);
    font-variant-numeric: tabular-nums;
    line-height: normal;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  /* Short windows keep all nine presets without pushing the dialog to scroll. */
  @media (max-height: 460px) {
    .l-preset-chips {
      padding-block-end: 0;
    }

    .l-preset-chips__chip {
      min-block-size: var(--sk-control-height-sm-tight);
      padding-inline: var(--sk-space-sm);
    }
  }

  .l-preset-chips__chip:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-preset-chips__chip.is-active {
    color: hsl(var(--sk-color-on-brand));
    background: hsl(var(--sk-color-brand));
  }
</style>

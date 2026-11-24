<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    divided = false,
    danger = false,
    stacked = false,
    label = false,
    onclick,
    children,
  }: {
    divided?: boolean;
    danger?: boolean;
    stacked?: boolean;
    label?: boolean;
    onclick?: () => void;
    children: Snippet;
  } = $props();
</script>

{#if onclick}
  <button
    class="l-settings-cell is-interactive"
    class:is-divided={divided}
    class:is-danger={danger}
    class:is-stacked={stacked}
    type="button"
    {onclick}
  >
    {@render children()}
  </button>
{:else if label}
  <label
    class="l-settings-cell is-interactive"
    class:is-divided={divided}
    class:is-danger={danger}
    class:is-stacked={stacked}
  >
    {@render children()}
  </label>
{:else}
  <div
    class="l-settings-cell"
    class:is-divided={divided}
    class:is-danger={danger}
    class:is-stacked={stacked}
  >
    {@render children()}
  </div>
{/if}

<style>
  .l-settings-cell {
    display: flex;
    align-items: center;
    gap: var(--sk-space-sm);
    /* Bleed 8 px past the page inset so hover and the divider reach wider
       than the text, like the approved prototype; content stays aligned
       with the rest of the page. */
    inline-size: calc(100% + 2 * var(--sk-settings-cell-pad-inline));
    margin-inline: calc(-1 * var(--sk-settings-cell-pad-inline));
    min-block-size: var(--sk-settings-cell-height);
    padding-block: var(--sk-settings-cell-pad);
    padding-inline: var(--sk-settings-cell-pad-inline);
    border: 0;
    color: hsl(var(--sk-color-text));
    background: transparent;
    text-align: start;
  }

  .l-settings-cell.is-divided {
    border-block-start: var(--sk-edge) solid hsl(var(--sk-color-border));
  }

  .l-settings-cell.is-stacked {
    flex-direction: column;
    align-items: stretch;
    gap: var(--sk-settings-field-gap);
  }

  .l-settings-cell.is-interactive {
    cursor: pointer;
    transition: background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-settings-cell.is-interactive:hover {
    background: hsl(var(--sk-color-brand-soft) / 0.45);
  }

  .l-settings-cell.is-interactive:active {
    background: hsl(var(--sk-color-brand-soft) / 0.72);
  }

  .l-settings-cell.is-danger {
    color: hsl(var(--sk-color-alert));
  }

  .l-settings-cell.is-danger.is-interactive:hover {
    background: hsl(var(--sk-color-alert) / 0.08);
  }

  .l-settings-cell.is-danger.is-interactive:active {
    background: hsl(var(--sk-color-alert) / 0.14);
  }

  /* Short desktop windows trade two touch pixels for a scroll-free list. */
  @media (max-height: 460px) {
    .l-settings-cell {
      min-block-size: var(--sk-settings-cell-height-tight);
    }
  }
</style>

<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { OverlaySize } from '../../ipc/types';
  import DropletMark from '../../ui/DropletMark.svelte';

  let {
    value,
    onchange,
  }: {
    value: OverlaySize;
    onchange: (size: OverlaySize) => void;
  } = $props();

  const options: Array<{ value: OverlaySize; label: string }> = [
    { value: 'S', label: m['settings.overlay.sizeSmall']() },
    { value: 'M', label: m['settings.overlay.sizeMedium']() },
    { value: 'L', label: m['settings.overlay.sizeLarge']() },
  ];
  const pixels: Record<OverlaySize, string> = {
    S: '96×32',
    M: '136×40',
    L: '180×52',
  };
  const dropSize: Record<OverlaySize, string> = {
    S: 'var(--sk-overlay-drop-size-s)',
    M: 'var(--sk-overlay-drop-size-m)',
    L: 'var(--sk-overlay-drop-size-l)',
  };
</script>

<div class="l-overlay-size" role="group" aria-label={m['settings.overlay.size']()}>
  {#each options as option (option.value)}
    <button
      class="l-overlay-size__card"
      class:is-on={option.value === value}
      type="button"
      aria-pressed={option.value === value}
      aria-label={`${option.label} · ${pixels[option.value]}`}
      onclick={() => onchange(option.value)}
    >
      <span class="l-overlay-size__preview" data-size={option.value.toLowerCase()}>
        <DropletMark size={dropSize[option.value]} />
        24:18
      </span>
      <span class="l-overlay-size__label">
        {option.value} · {pixels[option.value]}
      </span>
    </button>
  {/each}
</div>

<style>
  .l-overlay-size {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--sk-space-xs);
  }

  .l-overlay-size__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
    padding: var(--sk-space-xs);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-sm);
    background: hsl(var(--sk-color-bg-raised));
    transition:
      border-color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-overlay-size__card:hover {
    border-color: hsl(var(--sk-color-border-strong));
  }

  .l-overlay-size__card.is-on {
    border-color: hsl(var(--sk-color-brand));
    background: hsl(var(--sk-color-brand-soft) / 0.55);
  }

  .l-overlay-size__preview {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--sk-space-2xs);
    padding-inline: var(--sk-space-xs);
    overflow: hidden;
    border: var(--sk-edge) dashed hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-xs);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .l-overlay-size__preview[data-size='s'] {
    block-size: var(--sk-settings-chip-height);
    font-size: var(--sk-text-xs);
  }

  .l-overlay-size__preview[data-size='m'] {
    block-size: var(--sk-settings-row-height);
  }

  .l-overlay-size__preview[data-size='l'] {
    block-size: var(--sk-settings-control-height);
    font-size: var(--sk-text-sm);
  }

  .l-overlay-size__label {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    line-height: var(--sk-leading-tight);
    text-align: center;
  }

  .l-overlay-size__card.is-on .l-overlay-size__label {
    color: hsl(var(--sk-color-text));
  }
</style>

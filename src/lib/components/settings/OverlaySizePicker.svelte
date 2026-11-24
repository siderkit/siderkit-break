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
    S: 'var(--sk-size-preview-s-drop)',
    M: 'var(--sk-size-preview-m-drop)',
    L: 'var(--sk-size-preview-l-drop)',
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
    gap: var(--sk-space-sm);
  }

  .l-overlay-size__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
    block-size: var(--sk-settings-size-card-height);
    padding: 0;
    border: 0;
    border-radius: var(--sk-radius-card);
    color: hsl(var(--sk-color-text-muted));
    background: hsl(var(--sk-color-text) / 0.05);
    font-size: var(--sk-text-2xs);
    transition:
      background-color var(--sk-duration-base) var(--sk-ease-standard),
      color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-overlay-size__card:hover {
    color: hsl(var(--sk-color-brand-strong));
    background: hsl(var(--sk-color-brand-soft) / 0.45);
  }

  .l-overlay-size__card.is-on {
    color: hsl(var(--sk-color-brand));
    background: hsl(var(--sk-color-brand-soft) / 0.72);
    font-weight: var(--sk-weight-strong);
  }

  .l-overlay-size__preview {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sk-space-3xs);
    overflow: hidden;
    border: var(--sk-edge) solid hsl(var(--sk-color-text-muted) / 0.32);
    border-radius: var(--sk-radius-xs);
    color: hsl(var(--sk-color-text-muted));
    font-variant-numeric: tabular-nums;
    line-height: var(--sk-leading-none);
  }

  .l-overlay-size__preview[data-size='s'] {
    inline-size: var(--sk-size-preview-s-width);
    block-size: var(--sk-size-preview-s-height);
    font-size: var(--sk-size-preview-s-font);
  }

  .l-overlay-size__preview[data-size='m'] {
    inline-size: var(--sk-size-preview-m-width);
    block-size: var(--sk-size-preview-m-height);
    font-size: var(--sk-size-preview-m-font);
  }

  .l-overlay-size__preview[data-size='l'] {
    inline-size: var(--sk-size-preview-l-width);
    block-size: var(--sk-size-preview-l-height);
    font-size: var(--sk-size-preview-l-font);
  }

  .l-overlay-size__card.is-on .l-overlay-size__preview {
    border-color: hsl(var(--sk-color-brand) / 0.55);
    color: hsl(var(--sk-color-brand));
  }

  .l-overlay-size__label {
    color: inherit;
    font-size: inherit;
    line-height: var(--sk-leading-tight);
    text-align: center;
  }
</style>

<script lang="ts">
  import { m } from '../../../paraglide/messages.js';
  import type { Palette } from '../../ipc/types';

  let {
    value,
    onchange,
  }: {
    value: Palette;
    onchange: (palette: Palette) => void;
  } = $props();

  const options: Array<{ value: Palette; label: string }> = [
    { value: 'Forest', label: m['settings.general.paletteForest']() },
    { value: 'Ocean', label: m['settings.general.paletteOcean']() },
    { value: 'Ember', label: m['settings.general.paletteEmber']() },
    { value: 'Plum', label: m['settings.general.palettePlum']() },
    { value: 'Slate', label: m['settings.general.paletteSlate']() },
    { value: 'Rose', label: m['settings.general.paletteRose']() },
    { value: 'Aurora', label: m['settings.general.paletteAurora']() },
    { value: 'Sand', label: m['settings.general.paletteSand']() },
  ];
</script>

<div class="l-palette-picker">
  <span class="l-palette-picker__label">{m['settings.general.palette']()}</span>
  <div class="l-palette-picker__options" role="group" aria-label={m['settings.general.palette']()}>
    {#each options as option (option.value)}
      <button
        class="l-palette-picker__option"
        class:is-active={option.value === value}
        type="button"
        aria-pressed={option.value === value}
        onclick={() => onchange(option.value)}
      >
        <span
          class="l-palette-picker__swatch l-palette-picker__swatch--{option.value.toLowerCase()}"
          aria-hidden="true"
        >
          {#if option.value === value}
            <span class="l-palette-picker__check">
              <svg class="l-palette-picker__check-icon" viewBox="0 0 16 16">
                <path d="M3.4 8.4 6.5 11.5 12.7 4.9" />
              </svg>
            </span>
          {/if}
        </span>
        <span class="l-palette-picker__name">{option.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .l-palette-picker {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-sm);
    padding-block: var(--sk-space-md);
  }

  .l-palette-picker__label {
    color: hsl(var(--sk-color-text));
  }

  .l-palette-picker__options {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--sk-space-xs);
  }

  .l-palette-picker__option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sk-space-2xs);
    min-inline-size: 0;
    padding: var(--sk-space-xs) var(--sk-space-2xs) var(--sk-space-sm);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-md);
    color: hsl(var(--sk-color-text-muted));
    background: hsl(var(--sk-color-bg-raised) / 0.55);
    font-size: var(--sk-text-xs);
    text-align: center;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      border-color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard),
      box-shadow var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-palette-picker__option:hover {
    border-color: hsl(var(--sk-color-border-strong));
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-bg-raised));
  }

  .l-palette-picker__option.is-active {
    border-color: hsl(var(--sk-color-brand));
    color: hsl(var(--sk-color-brand-strong));
    background: hsl(var(--sk-color-brand-soft) / 0.9);
    box-shadow: inset 0 0 0 var(--sk-edge) hsl(var(--sk-color-brand) / 0.3);
  }

  .l-palette-picker__swatch {
    position: relative;
    flex: 0 0 auto;
    inline-size: var(--sk-swatch-size);
    block-size: var(--sk-swatch-size);
    border-radius: var(--sk-radius-full);
    background-image: radial-gradient(
      circle at 32% 26%,
      hsl(var(--sk-color-swatch-shine)),
      transparent 46%
    );
    box-shadow: inset 0 0 0 var(--sk-edge) hsl(var(--sk-color-swatch-ring));
    transition: transform var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-palette-picker__option:hover .l-palette-picker__swatch {
    transform: scale(1.08);
  }

  .l-palette-picker__swatch--forest {
    background-color: hsl(var(--sk-color-swatch-forest));
  }

  .l-palette-picker__swatch--ocean {
    background-color: hsl(var(--sk-color-swatch-ocean));
  }

  .l-palette-picker__swatch--ember {
    background-color: hsl(var(--sk-color-swatch-ember));
  }

  .l-palette-picker__swatch--plum {
    background-color: hsl(var(--sk-color-swatch-plum));
  }

  .l-palette-picker__swatch--slate {
    background-color: hsl(var(--sk-color-swatch-slate));
  }

  .l-palette-picker__swatch--rose {
    background-color: hsl(var(--sk-color-swatch-rose));
  }

  .l-palette-picker__swatch--aurora {
    background-color: hsl(var(--sk-color-swatch-aurora));
  }

  .l-palette-picker__swatch--sand {
    background-color: hsl(var(--sk-color-swatch-sand));
  }

  .l-palette-picker__check {
    position: absolute;
    inset-block-end: calc(-1 * var(--sk-space-3xs));
    inset-inline-end: calc(-1 * var(--sk-space-3xs));
    display: grid;
    place-items: center;
    inline-size: var(--sk-space-lg);
    block-size: var(--sk-space-lg);
    border: var(--sk-edge) solid hsl(var(--sk-color-bg-raised));
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-on-brand));
    background: hsl(var(--sk-color-brand));
    box-shadow: var(--sk-shadow-soft);
  }

  .l-palette-picker__check-icon {
    inline-size: var(--sk-icon-size);
    block-size: var(--sk-icon-size);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .l-palette-picker__name {
    inline-size: 100%;
    overflow-wrap: break-word;
    line-height: var(--sk-leading-tight);
  }

  .l-palette-picker__option.is-active .l-palette-picker__name {
    font-weight: var(--sk-weight-semibold);
  }
</style>

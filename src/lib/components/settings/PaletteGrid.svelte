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
    { value: 'Sand', label: m['settings.general.paletteSand']() },
    { value: 'Slate', label: m['settings.general.paletteSlate']() },
    { value: 'Rose', label: m['settings.general.paletteRose']() },
    { value: 'Moss', label: m['settings.general.paletteMoss']() },
    { value: 'Ink', label: m['settings.general.paletteInk']() },
    { value: 'Dusk', label: m['settings.general.paletteDusk']() },
    { value: 'Clay', label: m['settings.general.paletteClay']() },
    { value: 'Plum', label: m['settings.general.palettePlum']() },
    { value: 'Aurora', label: m['settings.general.paletteAurora']() },
  ];
</script>

<div class="l-palette-grid" role="group" aria-label={m['settings.general.palette']()}>
  {#each options as option (option.value)}
    <button
      class="l-palette-grid__swatch"
      class:is-on={option.value === value}
      type="button"
      aria-pressed={option.value === value}
      data-palette={option.value}
      onclick={() => onchange(option.value)}
    >
      <span class="l-palette-grid__band" aria-hidden="true">
        <i class="l-palette-grid__tone l-palette-grid__tone--bg"></i>
        <i class="l-palette-grid__tone l-palette-grid__tone--surface"></i>
        <i class="l-palette-grid__tone l-palette-grid__tone--accent"></i>
      </span>
      <span class="l-palette-grid__name">{option.label}</span>
      {#if option.value === value}
        <span class="l-palette-grid__check" aria-hidden="true">✓</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .l-palette-grid {
    display: grid;
    grid-template-columns: repeat(var(--sk-settings-swatch-columns), minmax(0, 1fr));
    gap: var(--sk-space-xs);
  }

  .l-palette-grid__swatch {
    position: relative;
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    padding: 0;
    overflow: hidden;
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-sm);
    background: hsl(var(--sk-color-bg-raised));
    text-align: center;
    transition:
      border-color var(--sk-duration-base) var(--sk-ease-standard),
      box-shadow var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-palette-grid__swatch:hover {
    border-color: hsl(var(--sk-color-border-strong));
  }

  .l-palette-grid__swatch.is-on {
    border-color: hsl(var(--sk-color-brand));
    box-shadow: inset 0 0 0 var(--sk-edge) hsl(var(--sk-color-brand));
  }

  .l-palette-grid__band {
    display: flex;
    block-size: var(--sk-settings-swatch-band);
  }

  .l-palette-grid__tone {
    flex: 1 1 auto;
  }

  .l-palette-grid__tone--bg {
    background: hsl(var(--palette-bg));
  }

  .l-palette-grid__tone--surface {
    background: hsl(var(--palette-surface));
  }

  .l-palette-grid__tone--accent {
    background: hsl(var(--palette-accent));
  }

  .l-palette-grid__name {
    padding: var(--sk-space-2xs) var(--sk-space-xs);
    overflow: hidden;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    line-height: var(--sk-leading-tight);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-palette-grid__swatch.is-on .l-palette-grid__name {
    color: hsl(var(--sk-color-text));
    font-weight: var(--sk-weight-semibold);
  }

  .l-palette-grid__check {
    position: absolute;
    inset-block-start: var(--sk-space-2xs);
    inset-inline-end: var(--sk-space-2xs);
    display: grid;
    place-items: center;
    inline-size: var(--sk-space-lg);
    block-size: var(--sk-space-lg);
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-on-brand));
    background: hsl(var(--sk-color-brand));
    font-size: var(--sk-text-xs);
  }

  .l-palette-grid__swatch[data-palette='Forest'] {
    --palette-bg: var(--sk-color-palette-forest-bg);
    --palette-surface: var(--sk-color-palette-forest-surface);
    --palette-accent: var(--sk-color-palette-forest-accent);
  }

  .l-palette-grid__swatch[data-palette='Ocean'] {
    --palette-bg: var(--sk-color-palette-ocean-bg);
    --palette-surface: var(--sk-color-palette-ocean-surface);
    --palette-accent: var(--sk-color-palette-ocean-accent);
  }

  .l-palette-grid__swatch[data-palette='Ember'] {
    --palette-bg: var(--sk-color-palette-ember-bg);
    --palette-surface: var(--sk-color-palette-ember-surface);
    --palette-accent: var(--sk-color-palette-ember-accent);
  }

  .l-palette-grid__swatch[data-palette='Sand'] {
    --palette-bg: var(--sk-color-palette-sand-bg);
    --palette-surface: var(--sk-color-palette-sand-surface);
    --palette-accent: var(--sk-color-palette-sand-accent);
  }

  .l-palette-grid__swatch[data-palette='Slate'] {
    --palette-bg: var(--sk-color-palette-slate-bg);
    --palette-surface: var(--sk-color-palette-slate-surface);
    --palette-accent: var(--sk-color-palette-slate-accent);
  }

  .l-palette-grid__swatch[data-palette='Rose'] {
    --palette-bg: var(--sk-color-palette-rose-bg);
    --palette-surface: var(--sk-color-palette-rose-surface);
    --palette-accent: var(--sk-color-palette-rose-accent);
  }

  .l-palette-grid__swatch[data-palette='Moss'] {
    --palette-bg: var(--sk-color-palette-moss-bg);
    --palette-surface: var(--sk-color-palette-moss-surface);
    --palette-accent: var(--sk-color-palette-moss-accent);
  }

  .l-palette-grid__swatch[data-palette='Ink'] {
    --palette-bg: var(--sk-color-palette-ink-bg);
    --palette-surface: var(--sk-color-palette-ink-surface);
    --palette-accent: var(--sk-color-palette-ink-accent);
  }

  .l-palette-grid__swatch[data-palette='Dusk'] {
    --palette-bg: var(--sk-color-palette-dusk-bg);
    --palette-surface: var(--sk-color-palette-dusk-surface);
    --palette-accent: var(--sk-color-palette-dusk-accent);
  }

  .l-palette-grid__swatch[data-palette='Clay'] {
    --palette-bg: var(--sk-color-palette-clay-bg);
    --palette-surface: var(--sk-color-palette-clay-surface);
    --palette-accent: var(--sk-color-palette-clay-accent);
  }

  .l-palette-grid__swatch[data-palette='Plum'] {
    --palette-bg: var(--sk-color-palette-plum-bg);
    --palette-surface: var(--sk-color-palette-plum-surface);
    --palette-accent: var(--sk-color-palette-plum-accent);
  }

  .l-palette-grid__swatch[data-palette='Aurora'] {
    --palette-bg: var(--sk-color-palette-aurora-bg);
    --palette-surface: var(--sk-color-palette-aurora-surface);
    --palette-accent: var(--sk-color-palette-aurora-accent);
  }
</style>

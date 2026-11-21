<script lang="ts">
  import { tick } from 'svelte';

  import { m } from '../../../paraglide/messages.js';
  import {
    filterLocales,
    localeMeta,
    systemLocale,
    type Locale,
    type LocaleMeta,
  } from '../../locale';
  import LanguageOption from './LanguageOption.svelte';

  let {
    value,
    onchange,
  }: {
    value: string | null;
    onchange: (locale: string | null) => void;
  } = $props();

  type Row = { kind: 'system' } | { kind: 'locale'; locale: LocaleMeta };

  let open = $state(false);
  let query = $state('');
  let activeIndex = $state(0);
  let dialog = $state<HTMLDialogElement>();
  let searchInput = $state<HTMLInputElement>();

  const detected = $derived(localeMeta(systemLocale()));
  const selected = $derived(value ? localeMeta(value as Locale) : null);
  const systemText = $derived(m['settings.general.languageSystem']());
  const systemMatches = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return ['system', 'auto', systemText, detected.native, detected.english].some((text) =>
      text.toLowerCase().includes(needle),
    );
  });
  const rows = $derived.by<Row[]>(() => [
    ...(systemMatches ? [{ kind: 'system' as const }] : []),
    ...filterLocales(query).map((locale) => ({ kind: 'locale' as const, locale })),
  ]);

  $effect(() => {
    if (dialog && open && !dialog.open) {
      dialog.showModal();
      void tick().then(() => searchInput?.focus());
    }
    if (dialog && !open && dialog.open) {
      dialog.close();
    }
  });

  $effect(() => {
    if (activeIndex >= rows.length) {
      activeIndex = Math.max(0, rows.length - 1);
    }
  });

  function show(): void {
    query = '';
    activeIndex = 0;
    open = true;
  }

  function pick(row: Row | undefined): void {
    if (!row) {
      return;
    }
    onchange(row.kind === 'system' ? null : row.locale.code);
    open = false;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(rows.length - 1, activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(rows[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      open = false;
    }
  }

  function select(index: number, row: Row): void {
    activeIndex = index;
    pick(row);
  }
</script>

<button class="l-language-picker__trigger" type="button" onclick={show}>
  <span class="l-language-picker__value">
    {#if selected}
      {selected.native}
    {:else}
      {systemText}
    {/if}
  </span>
  <span class="l-language-picker__meta">
    {selected
      ? selected.english
      : m['settings.general.languageSystemHint']({ language: detected.native })}
  </span>
</button>

<dialog
  class="l-language-picker__dialog"
  bind:this={dialog}
  aria-labelledby="language-title"
  onclose={() => (open = false)}
  onkeydown={onKeydown}
>
  <div class="l-language-picker__card">
    <h3 class="l-language-picker__title" id="language-title">
      {m['settings.general.language']()}
    </h3>
    <input
      class="l-language-picker__search"
      bind:this={searchInput}
      bind:value={query}
      type="search"
      placeholder={m['settings.general.languageSearch']()}
      aria-label={m['settings.general.languageSearch']()}
      oninput={() => (activeIndex = 0)}
    />
    <div
      class="l-language-picker__list"
      role="listbox"
      aria-label={m['settings.general.language']()}
    >
      {#each rows as row, index (row.kind === 'system' ? 'system' : row.locale.code)}
        <LanguageOption
          native={row.kind === 'system' ? systemText : row.locale.native}
          english={row.kind === 'system'
            ? `${m['settings.general.languageDetected']()} · ${detected.native}`
            : row.locale.english}
          code={row.kind === 'system' ? detected.code : row.locale.code}
          active={index === activeIndex}
          selected={row.kind === 'system' ? value === null : value === row.locale.code}
          onhover={() => (activeIndex = index)}
          onselect={() => select(index, row)}
        />
      {:else}
        <p class="l-language-picker__empty">{m['settings.general.languageEmpty']()}</p>
      {/each}
    </div>
    <div class="l-language-picker__footer">
      <button class="l-language-picker__close" type="button" onclick={() => (open = false)}>
        {m['common.action.close']()}
      </button>
      {#if value !== null}
        <button
          class="l-language-picker__reset"
          type="button"
          onclick={() => {
            onchange(null);
            open = false;
          }}
        >
          {m['settings.general.languageSystem']()}
        </button>
      {/if}
    </div>
  </div>
</dialog>

<style>
  .l-language-picker__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-md);
    inline-size: 100%;
    margin-block-start: var(--sk-space-2xs);
    padding: var(--sk-space-sm) var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-sm);
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-bg-raised));
    text-align: start;
    transition: border-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-language-picker__trigger:hover {
    border-color: hsl(var(--sk-color-brand));
  }

  .l-language-picker__value {
    flex: 0 0 auto;
    font-weight: var(--sk-weight-medium);
    white-space: nowrap;
  }

  .l-language-picker__meta {
    min-inline-size: 0;
    overflow: hidden;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-language-picker__dialog {
    inline-size: 86%;
    padding: 0;
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
  }

  .l-language-picker__dialog::backdrop {
    background: hsl(var(--sk-color-overlay-surface));
    -webkit-backdrop-filter: blur(var(--sk-overlay-blur));
    backdrop-filter: blur(var(--sk-overlay-blur));
  }

  .l-language-picker__card {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-lg);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-language-picker__title {
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-language-picker__search {
    inline-size: 100%;
    padding: var(--sk-space-sm) var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-sm);
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-bg-raised));
  }

  .l-language-picker__list {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-3xs);
    max-block-size: var(--sk-language-list-height);
    overflow-y: auto;
  }

  .l-language-picker__empty {
    margin: 0;
    padding: var(--sk-space-lg);
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
    text-align: center;
  }

  .l-language-picker__footer {
    display: flex;
    justify-content: space-between;
    gap: var(--sk-space-sm);
    padding-block-start: var(--sk-space-2xs);
  }

  .l-language-picker__close,
  .l-language-picker__reset {
    padding: var(--sk-space-2xs) var(--sk-space-sm);
    border: 0;
    border-radius: var(--sk-radius-xs);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-xs);
  }

  .l-language-picker__close:hover,
  .l-language-picker__reset:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft));
  }
</style>

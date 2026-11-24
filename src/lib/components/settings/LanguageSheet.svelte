<script lang="ts">
  import { filterLocales, localeMeta, systemLocale } from '../../locale';
  import { m } from '../../../paraglide/messages.js';

  let {
    value,
    onpick,
    onclose,
  }: {
    value: string | null;
    onpick: (locale: string | null) => void;
    onclose: () => void;
  } = $props();

  const commonCodes = new Set(['zh-CN', 'en', 'ja']);
  const detected = localeMeta(systemLocale());
  let query = $state('');

  const matching = $derived(filterLocales(query));
  const systemMatches = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return [
      'system',
      'auto',
      m['settings.general.languageSystem'](),
      detected.native,
      detected.english,
    ].some((text) => text.toLowerCase().includes(needle));
  });
  const common = $derived(matching.filter((locale) => commonCodes.has(locale.code)));
  const rest = $derived(matching.filter((locale) => !commonCodes.has(locale.code)));

  function pick(code: string | null): void {
    onpick(code);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onclose();
    }
  }

  function focusOnMount(node: HTMLInputElement): void {
    node.focus();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<section class="l-language-sheet" aria-labelledby="language-sheet-title">
  <header class="l-language-sheet__head">
    <h2 class="l-language-sheet__title" id="language-sheet-title">
      {m['settings.general.language']()}
    </h2>
    <button class="l-language-sheet__done" type="button" onclick={onclose}>
      {m['common.action.done']()}
    </button>
  </header>

  <div class="l-language-sheet__search">
    <span class="l-language-sheet__search-icon" aria-hidden="true">⌕</span>
    <input
      class="l-language-sheet__input"
      bind:value={query}
      type="search"
      placeholder={m['settings.general.languageSearch']()}
      aria-label={m['settings.general.languageSearch']()}
      use:focusOnMount
    />
  </div>

  <div class="l-language-sheet__list">
    {#if common.length > 0 || systemMatches}
      <p class="l-language-sheet__group">{m['settings.language.common']()}</p>
      {#if systemMatches}
        <button
          class="l-language-sheet__row"
          class:is-on={value === null}
          type="button"
          onclick={() => pick(null)}
        >
          <span class="l-language-sheet__native">{m['settings.general.languageSystem']()}</span>
          <span class="l-language-sheet__english">
            {m['settings.general.languageDetected']()} · {detected.native}
          </span>
          {#if value === null}<span class="l-language-sheet__check" aria-hidden="true">✓</span>{/if}
        </button>
      {/if}
      {#each common as locale (locale.code)}
        <button
          class="l-language-sheet__row"
          class:is-on={value === locale.code}
          type="button"
          onclick={() => pick(locale.code)}
        >
          <span class="l-language-sheet__native">{locale.native}</span>
          <span class="l-language-sheet__english">{locale.english}</span>
          {#if value === locale.code}
            <span class="l-language-sheet__check" aria-hidden="true">✓</span>
          {/if}
        </button>
      {/each}
    {/if}

    {#if rest.length > 0}
      <p class="l-language-sheet__group">{m['settings.language.all']()}</p>
      {#each rest as locale (locale.code)}
        <button
          class="l-language-sheet__row"
          class:is-on={value === locale.code}
          type="button"
          onclick={() => pick(locale.code)}
        >
          <span class="l-language-sheet__native">{locale.native}</span>
          <span class="l-language-sheet__english">{locale.english}</span>
          {#if value === locale.code}
            <span class="l-language-sheet__check" aria-hidden="true">✓</span>
          {/if}
        </button>
      {/each}
    {/if}

    {#if matching.length === 0 && !systemMatches}
      <p class="l-language-sheet__empty">{m['settings.general.languageEmpty']()}</p>
    {/if}
  </div>
</section>

<style>
  .l-language-sheet {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-bg-app));
  }

  .l-language-sheet__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-md);
    min-block-size: var(--sk-settings-page-header);
    padding-inline: var(--sk-space-lg);
  }

  .l-language-sheet__title {
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-language-sheet__done {
    padding: var(--sk-space-2xs) 0;
    border: 0;
    color: hsl(var(--sk-color-brand));
    background: transparent;
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
  }

  .l-language-sheet__search {
    display: flex;
    align-items: center;
    gap: var(--sk-space-xs);
    margin: 0 var(--sk-space-lg) var(--sk-space-sm);
    padding-inline: var(--sk-space-sm);
    border: var(--sk-edge) solid hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-sm);
    background: hsl(var(--sk-color-bg-raised));
  }

  .l-language-sheet__search-icon {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
  }

  .l-language-sheet__input {
    inline-size: 100%;
    min-block-size: var(--sk-settings-action-height);
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
  }

  .l-language-sheet__input:focus-visible {
    outline: none;
  }

  .l-language-sheet__list {
    flex: 1 1 auto;
    min-block-size: 0;
    padding: 0 var(--sk-space-lg) var(--sk-space-xl);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .l-language-sheet__group {
    margin: var(--sk-space-md) 0 var(--sk-space-2xs);
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-wide);
    text-transform: uppercase;
  }

  .l-language-sheet__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, auto) auto;
    align-items: center;
    gap: var(--sk-space-sm);
    inline-size: 100%;
    min-block-size: var(--sk-language-row-height);
    padding-inline: var(--sk-space-sm);
    border: 0;
    border-block-end: var(--sk-edge) solid hsl(var(--sk-color-border));
    color: hsl(var(--sk-color-text));
    background: transparent;
    text-align: start;
    transition: background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-language-sheet__row:hover {
    background: hsl(var(--sk-color-brand-soft) / 0.45);
  }

  .l-language-sheet__row.is-on {
    background: hsl(var(--sk-color-brand-soft) / 0.7);
  }

  .l-language-sheet__native {
    min-inline-size: 0;
    overflow: hidden;
    font-size: var(--sk-text-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-language-sheet__english {
    min-inline-size: 0;
    overflow: hidden;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-language-sheet__check {
    color: hsl(var(--sk-color-brand));
    font-weight: var(--sk-weight-semibold);
  }

  .l-language-sheet__empty {
    margin: 0;
    padding: var(--sk-space-xl) var(--sk-space-lg);
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
    text-align: center;
  }
</style>

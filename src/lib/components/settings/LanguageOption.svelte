<script lang="ts">
  let {
    native,
    english,
    code,
    active,
    selected,
    onhover,
    onselect,
  }: {
    native: string;
    english: string;
    code: string;
    active: boolean;
    selected: boolean;
    onhover: () => void;
    onselect: () => void;
  } = $props();
</script>

<button
  class="l-language-option"
  class:is-active={active}
  class:is-selected={selected}
  type="button"
  role="option"
  aria-selected={selected}
  onmouseenter={onhover}
  onclick={onselect}
>
  <span class="l-language-option__names">
    <span class="l-language-option__native">{native}</span>
    <span class="l-language-option__english">{english}</span>
  </span>
  <span class="l-language-option__badge">{code}</span>
  {#if selected}<span class="l-language-option__check" aria-hidden="true">✓</span>{/if}
</button>

<style>
  .l-language-option {
    display: flex;
    align-items: center;
    gap: var(--sk-space-sm);
    inline-size: 100%;
    padding: var(--sk-space-sm) var(--sk-space-md);
    border: 0;
    border-radius: var(--sk-radius-sm);
    color: hsl(var(--sk-color-text));
    background: transparent;
    text-align: start;
  }

  .l-language-option.is-active {
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-language-option.is-selected {
    box-shadow: inset var(--sk-edge) 0 0 hsl(var(--sk-color-brand));
  }

  .l-language-option__names {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-inline-size: 0;
  }

  .l-language-option__native {
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-medium);
  }

  .l-language-option__english {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-language-option__badge {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    font-variant-numeric: tabular-nums;
  }

  .l-language-option__check {
    color: hsl(var(--sk-color-brand));
    font-weight: var(--sk-weight-semibold);
  }
</style>

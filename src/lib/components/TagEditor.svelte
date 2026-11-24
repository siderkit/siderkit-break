<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { getRecentTags, isTauri } from '../ipc/client';

  let {
    value = $bindable(''),
    label = m['tags.label'](),
    recentLimit = 3,
    onpick,
    onsave,
    oncancel,
  }: {
    value?: string;
    label?: string;
    recentLimit?: number;
    onpick?: (tag: string) => void;
    onsave: () => void;
    oncancel: () => void;
  } = $props();

  let recent = $state<string[]>([]);

  const count = $derived(Array.from(value).length);

  onMount(() => {
    if (!isTauri) {
      return;
    }
    void getRecentTags(recentLimit + 1)
      .then((tags) => {
        recent = tags.filter((tag) => tag !== value).slice(0, recentLimit);
      })
      .catch(() => {
        recent = [];
      });
  });

  function focusOnMount(node: HTMLInputElement): void {
    node.focus();
    node.select();
  }

  /** Caps input at 40 Unicode scalars, the same unit Rust normalizes with. */
  function limit(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const next = Array.from(input.value).slice(0, 40).join('');
    if (next !== input.value) {
      input.value = next;
    }
    value = next;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      onsave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      oncancel();
    }
  }

  function pick(tag: string): void {
    if (onpick) {
      onpick(tag);
      return;
    }
    value = tag;
  }
</script>

<div class="l-tag-editor">
  <label class="l-tag-editor__label" for="l-tag-editor-input">{label}</label>
  <div class="l-tag-editor__box">
    <input
      class="l-tag-editor__input"
      id="l-tag-editor-input"
      {value}
      type="text"
      placeholder={m['tags.placeholder']()}
      aria-label={label}
      use:focusOnMount
      oninput={limit}
      onkeydown={onKeydown}
    />
    <span class="l-tag-editor__count">{count}/40</span>
  </div>

  {#if recent.length > 0}
    <div class="l-tag-editor__recent">
      <span class="l-tag-editor__recent-label">{m['tags.recent']()}</span>
      {#each recent as tag (tag)}
        <button class="l-tag-editor__chip" type="button" onclick={() => pick(tag)}>
          {tag}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .l-tag-editor {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-2xs);
  }

  .l-tag-editor__label {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-tag-editor__box {
    display: flex;
    align-items: center;
    gap: var(--sk-space-xs);
    min-block-size: var(--sk-tag-input-height);
    padding-inline: var(--sk-space-sm);
    border: var(--sk-edge) solid hsl(var(--sk-color-brand));
    border-radius: var(--sk-radius-sm);
    background: hsl(var(--sk-color-bg-raised));
  }

  .l-tag-editor__input {
    flex: 1 1 auto;
    min-inline-size: 0;
    border: 0;
    outline: none;
    color: hsl(var(--sk-color-text));
    background: transparent;
    font-size: var(--sk-text-sm);
  }

  .l-tag-editor__input::placeholder {
    color: hsl(var(--sk-color-text-muted));
  }

  .l-tag-editor__count {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    font-variant-numeric: tabular-nums;
  }

  .l-tag-editor__recent {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-2xs);
    margin-block-start: var(--sk-space-2xs);
  }

  .l-tag-editor__recent-label {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-tag-editor__chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: var(--sk-tag-chip-height);
    padding-inline: var(--sk-space-sm);
    border: 0;
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text-muted));
    background: hsl(var(--sk-color-text) / 0.06);
    font-size: var(--sk-text-xs);
    line-height: normal;
  }

  .l-tag-editor__chip:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft));
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { isTauri, setSessionTag } from '../ipc/client';
  import { cleanTag } from '../utils/tag.util';
  import ActionBar from '../ui/ActionBar.svelte';
  import Button from '../ui/Button.svelte';
  import TagEditor from './TagEditor.svelte';

  let {
    sessionId,
    initial,
    onchange,
    ondismiss,
  }: {
    sessionId: string;
    initial: string | null;
    onchange: (tag: string | null) => void;
    ondismiss: () => void;
  } = $props();

  const id = $props.id();
  const titleId = `l-tag-dialog-title-${id}`;

  let dialog = $state<HTMLDialogElement>();
  let value = $state('');
  let saving = $state(false);
  let error = $state<string | null>(null);

  onMount(() => {
    value = initial ?? '';
    dialog?.showModal();
  });

  async function save(): Promise<void> {
    if (saving) {
      return;
    }
    const next = cleanTag(value);
    if (next === null) {
      dialog?.close();
      return;
    }
    saving = true;
    error = null;
    try {
      if (isTauri) {
        await setSessionTag(sessionId, next);
      }
      onchange(next);
      dialog?.close();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : m['tags.error']();
    } finally {
      saving = false;
    }
  }

  async function remove(): Promise<void> {
    if (saving) {
      return;
    }
    saving = true;
    error = null;
    try {
      if (isTauri) {
        await setSessionTag(sessionId, null);
      }
      onchange(null);
      dialog?.close();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : m['tags.error']();
    } finally {
      saving = false;
    }
  }
</script>

<dialog class="l-tag-dialog" bind:this={dialog} aria-labelledby={titleId} onclose={ondismiss}>
  <div class="l-tag-dialog__card">
    <h2 class="l-tag-dialog__title" id={titleId}>{m['tags.editorTitle']()}</h2>

    <TagEditor
      bind:value
      onpick={(tag) => (value = tag)}
      onsave={() => void save()}
      oncancel={() => dialog?.close()}
    />

    {#if error}
      <p class="l-tag-dialog__error" role="alert">{error}</p>
    {/if}

    <ActionBar onclose={() => dialog?.close()} closeDisabled={saving}>
      <Button variant="Primary" size="Sm" disabled={saving} onclick={() => void save()}>
        {m['tags.save']()}
      </Button>
      {#if initial}
        <Button variant="Danger" size="Sm" disabled={saving} onclick={() => void remove()}>
          {m['tags.remove']()}
        </Button>
      {/if}
    </ActionBar>
  </div>
</dialog>

<style>
  .l-tag-dialog {
    inline-size: var(--sk-dialog-inline-size);
    padding: 0;
    border: 0;
    background: transparent;
    color: hsl(var(--sk-color-text));
  }

  .l-tag-dialog::backdrop {
    background: hsl(var(--sk-color-overlay-surface));
    -webkit-backdrop-filter: blur(var(--sk-overlay-blur));
    backdrop-filter: blur(var(--sk-overlay-blur));
  }

  .l-tag-dialog__card {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-lg);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-lg);
    background: hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-tag-dialog__title {
    margin: 0;
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-tag-dialog__error {
    margin: 0;
    color: hsl(var(--sk-color-alert));
    font-size: var(--sk-text-xs);
  }
</style>

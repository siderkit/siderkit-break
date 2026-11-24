<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { isTauri, setSessionTag } from '../ipc/client';
  import { cleanTag } from '../utils/tag.util';
  import { phaseLabel } from '../utils/format.util';
  import Button from '../ui/Button.svelte';
  import DropletMark from '../ui/DropletMark.svelte';
  import TagEditor from './TagEditor.svelte';

  let {
    sessionId,
    minutes,
    onstart,
    onclose,
  }: {
    sessionId: string;
    minutes: number;
    onstart: () => void;
    onclose: () => void;
  } = $props();

  let expanded = $state(false);
  let value = $state('');
  let saving = $state(false);
  let error = $state<string | null>(null);

  const meta = $derived(`${minutes} ${m['common.unit.minutes']()} · ${phaseLabel('Focus')}`);

  onMount(() => {
    if (!isTauri) {
      value = 'Writing';
    }
  });

  function toggle(): void {
    expanded = !expanded;
    error = null;
  }

  /** Saves a tag, then folds the editor; an empty value is a skip. */
  async function save(tag: string | null = cleanTag(value)): Promise<void> {
    if (saving) {
      return;
    }
    if (tag === null) {
      expanded = false;
      return;
    }
    saving = true;
    error = null;
    try {
      if (isTauri) {
        await setSessionTag(sessionId, tag);
      }
      value = tag;
      expanded = false;
    } catch (reason) {
      error = reason instanceof Error ? reason.message : m['tags.error']();
    } finally {
      saving = false;
    }
  }

  function start(): void {
    onstart();
  }
</script>

<section class="l-focus-done" aria-labelledby="l-focus-done-title">
  <div class="l-focus-done__head">
    <span class="l-focus-done__mark" aria-hidden="true">
      <DropletMark size="var(--sk-focus-done-mark-size)" />
    </span>
    <div class="l-focus-done__copy">
      <h2 class="l-focus-done__title" id="l-focus-done-title">
        {m['notification.focus.title']()}
      </h2>
      <div class="l-focus-done__meta-row">
        <span class="l-focus-done__pill">{meta}</span>
        <button
          class="l-focus-done__tag-link"
          type="button"
          aria-expanded={expanded}
          onclick={toggle}
        >
          {#if expanded}
            <svg class="l-focus-done__tag-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path d="m3.6 10.2 4.4-4.4 4.4 4.4" />
            </svg>
            {m['tags.cancel']()}
          {:else}
            <svg class="l-focus-done__tag-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 3.2v9.6M3.2 8h9.6" />
            </svg>
            {m['tags.add']()}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <p class="l-focus-done__body">{m['notification.focus.body']()}</p>

  {#if expanded}
    <TagEditor
      bind:value
      onpick={(tag) => void save(tag)}
      onsave={() => void save()}
      oncancel={toggle}
    />
  {/if}

  {#if error}
    <p class="l-focus-done__error" role="alert">{error}</p>
  {/if}

  <div class="l-focus-done__actions" data-card-actions>
    <Button variant="Ghost" size="Sm" disabled={saving} onclick={expanded ? toggle : onclose}>
      {m['tags.skip']()}
    </Button>
    {#if expanded}
      <Button variant="Primary" size="Sm" disabled={saving} onclick={() => void save()}>
        {m['tags.save']()}
      </Button>
    {:else}
      <Button variant="Primary" size="Sm" onclick={start}>
        {m['timer.action.startBreak']()}
      </Button>
    {/if}
  </div>
</section>

<style>
  .l-focus-done {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-lg);
    border: var(--sk-edge) solid hsl(var(--sk-color-break) / 0.32);
    border-radius: var(--sk-radius-lg);
    background:
      radial-gradient(circle at 0 0, hsl(var(--sk-color-break-soft) / 0.9), transparent 56%),
      hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-focus-done__head {
    display: flex;
    align-items: flex-start;
    gap: var(--sk-space-sm);
  }

  .l-focus-done__mark {
    display: block;
    flex: 0 0 auto;
    inline-size: var(--sk-focus-done-mark-size);
    block-size: var(--sk-focus-done-mark-size);
    overflow: visible;
  }

  .l-focus-done__copy {
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  .l-focus-done__title {
    margin: 0;
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-semibold);
    line-height: var(--sk-leading-tight);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-focus-done__meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-sm);
    margin-block-start: var(--sk-space-2xs);
  }

  .l-focus-done__pill {
    display: inline-flex;
    padding: var(--sk-space-2xs) var(--sk-space-xs);
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-break));
    background: hsl(var(--sk-color-break-soft));
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
  }

  .l-focus-done__tag-link {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--sk-space-2xs);
    padding: var(--sk-space-2xs);
    border: 0;
    border-radius: var(--sk-radius-xs);
    color: hsl(var(--sk-color-brand));
    background: transparent;
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
  }

  .l-focus-done__tag-link:hover {
    text-decoration: underline;
    text-underline-offset: var(--sk-space-2xs);
  }

  .l-focus-done__tag-icon {
    inline-size: var(--sk-icon-size-sm);
    block-size: var(--sk-icon-size-sm);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .l-focus-done__body {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
  }

  .l-focus-done__error {
    margin: 0;
    color: hsl(var(--sk-color-alert));
    font-size: var(--sk-text-xs);
  }

  .l-focus-done__actions {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-start;
    gap: var(--sk-space-sm);
    margin-block-start: var(--sk-space-2xs);
  }

  .l-focus-done__actions > :global(button) {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: no-preference) {
    .l-focus-done {
      animation: l-focus-done-enter var(--sk-duration-slow) var(--sk-ease-standard) both;
    }
  }

  @keyframes l-focus-done-enter {
    from {
      opacity: 0;
      transform: translateY(var(--sk-space-xs)) scale(0.985);
    }
  }
</style>

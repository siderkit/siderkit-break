<script lang="ts">
  import type { Snippet } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import Button from './Button.svelte';

  let {
    onclose,
    closeLabel,
    closeDisabled = false,
    children,
  }: {
    onclose: () => void;
    closeLabel?: string;
    closeDisabled?: boolean;
    children?: Snippet;
  } = $props();
</script>

<div class="l-action-bar">
  {@render children?.()}
  <Button variant="Ghost" size="Sm" disabled={closeDisabled} onclick={onclose}>
    {closeLabel ?? m['common.action.close']()}
  </Button>
</div>

<style>
  .l-action-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: var(--sk-space-sm);
    margin-block-start: var(--sk-space-xs);
  }
</style>

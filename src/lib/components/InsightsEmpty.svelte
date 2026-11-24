<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import Button from '../ui/Button.svelte';

  let { onstart }: { onstart: () => void } = $props();
</script>

<div class="l-insights-empty">
  <span class="l-insights-empty__title">{m['insights.emptyTitle']()}</span>
  <p class="l-insights-empty__body">{m['insights.emptyBody']()}</p>
  <Button variant="Primary" size="Sm" onclick={onstart}>
    {m['timer.action.startFocus']()}
  </Button>
</div>

<style>
  .l-insights-empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-lg);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-md);
    background: hsl(var(--sk-color-bg-surface));
  }

  .l-insights-empty__title {
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-semibold);
  }

  .l-insights-empty__body {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
  }
</style>

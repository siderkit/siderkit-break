<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import Button from '../ui/Button.svelte';

  let { onretry }: { onretry: () => void } = $props();
</script>

<div class="l-insights-error" role="alert">
  <span>{m['insights.error']()}</span>
  <Button variant="Ghost" size="Sm" onclick={onretry}>
    {m['insights.retry']()}
  </Button>
</div>

<style>
  .l-insights-error {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-alert) / 0.4);
    border-radius: var(--sk-radius-md);
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-alert) / 0.06);
    font-size: var(--sk-text-xs);
  }
</style>

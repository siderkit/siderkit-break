<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, children }: { title: string; children: Snippet } = $props();
</script>

<section class="l-settings-group">
  <h3 class="l-settings-group__title">{title}</h3>
  {@render children()}
</section>

<style>
  .l-settings-group {
    padding: var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-md);
    background: hsl(var(--sk-color-bg-surface));
  }

  .l-settings-group__title {
    margin: 0 0 var(--sk-space-2xs);
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-wide);
    text-transform: uppercase;
  }
</style>

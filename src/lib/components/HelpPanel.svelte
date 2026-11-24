<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import AboutInfo from './AboutInfo.svelte';

  let { onclose }: { onclose: () => void } = $props();
</script>

<section class="l-help-panel" aria-labelledby="help-title">
  <header class="l-help-panel__header">
    <h2 class="l-help-panel__title" id="help-title">{m['help.title']()}</h2>
    <button class="l-help-panel__close" type="button" onclick={onclose}>
      {m['help.close']()}
    </button>
  </header>

  <div class="l-help-panel__scroll">
    <section class="l-help-panel__section">
      <h3 class="l-help-panel__heading">{m['help.start.title']()}</h3>
      <p class="l-help-panel__body">{m['help.start.body']()}</p>
    </section>
    <section class="l-help-panel__section">
      <h3 class="l-help-panel__heading">{m['help.breaks.title']()}</h3>
      <p class="l-help-panel__body">{m['help.breaks.body']()}</p>
    </section>
    <section class="l-help-panel__section">
      <h3 class="l-help-panel__heading">{m['help.countdown.title']()}</h3>
      <p class="l-help-panel__body">{m['help.countdown.body']()}</p>
    </section>
    <section class="l-help-panel__section">
      <h3 class="l-help-panel__heading">{m['help.overlay.title']()}</h3>
      <p class="l-help-panel__body">{m['help.overlay.body']()}</p>
    </section>
    <section class="l-help-panel__section">
      <h3 class="l-help-panel__heading">{m['help.history.title']()}</h3>
      <p class="l-help-panel__body">{m['help.history.body']()}</p>
    </section>
    <section class="l-help-panel__section">
      <h3 class="l-help-panel__heading">{m['help.shortcuts.title']()}</h3>
      <p class="l-help-panel__body">{m['help.shortcuts.body']()}</p>
    </section>
    <section class="l-help-panel__section">
      <h3 class="l-help-panel__heading">{m['help.troubleshooting.title']()}</h3>
      <p class="l-help-panel__body">{m['help.troubleshooting.body']()}</p>
    </section>
    <section class="l-help-panel__section">
      <h3 class="l-help-panel__heading">{m['settings.about.title']()}</h3>
      <AboutInfo />
    </section>
  </div>
</section>

<style>
  .l-help-panel {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  .l-help-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-md);
    padding: var(--sk-space-lg) var(--sk-space-lg) var(--sk-space-sm);
  }

  .l-help-panel__title {
    margin: 0;
    font-size: var(--sk-text-xl);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-help-panel__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--sk-space-xs) var(--sk-space-sm);
    border: 0;
    border-radius: var(--sk-radius-full);
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-text) / 0.06);
    font-size: var(--sk-text-xs);
    line-height: normal;
  }

  .l-help-panel__close:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft));
  }

  .l-help-panel__scroll {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--sk-space-md);
    min-block-size: 0;
    padding: 0 var(--sk-space-lg) var(--sk-space-xl);
    overflow-y: auto;
  }

  .l-help-panel__section {
    padding: var(--sk-space-md);
    border: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-radius: var(--sk-radius-md);
    background: hsl(var(--sk-color-bg-surface));
  }

  .l-help-panel__heading {
    margin: 0 0 var(--sk-space-2xs);
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-wide);
    text-transform: uppercase;
  }

  .l-help-panel__body {
    margin: 0;
    font-size: var(--sk-text-sm);
  }
</style>

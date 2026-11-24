<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import PanelHeader from '../ui/PanelHeader.svelte';
  import AboutInfo from './AboutInfo.svelte';

  let { onclose }: { onclose: () => void } = $props();
</script>

<section class="l-help-panel" aria-labelledby="help-title">
  <PanelHeader title={m['help.title']()} titleId="help-title" onback={onclose} />

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

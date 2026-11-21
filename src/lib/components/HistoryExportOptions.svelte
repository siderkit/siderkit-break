<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import type { HistoryExportState } from '../history-export.svelte';
  import Segmented from '../ui/Segmented.svelte';

  let { state }: { state: HistoryExportState } = $props();

  const presetOptions = $derived([
    { value: 'Today', label: m['history.range.today']() },
    { value: 'ThisWeek', label: m['history.range.week']() },
    { value: 'ThisMonth', label: m['history.range.month']() },
    { value: 'ThisYear', label: m['history.range.year']() },
    { value: 'Custom', label: m['history.range.custom']() },
  ]);
</script>

<div class="l-export-options">
  <Segmented
    label={m['history.exportRange']()}
    options={presetOptions}
    value={state.preset}
    onchange={(value) => state.setPreset(value)}
  />

  {#if state.preset === 'Custom'}
    <div class="l-export-options__dates">
      <label class="l-export-options__field">
        <span>{m['history.range.start']()}</span>
        <input type="date" bind:value={state.customStart} max={state.customEnd} />
      </label>
      <label class="l-export-options__field">
        <span>{m['history.range.end']()}</span>
        <input type="date" bind:value={state.customEnd} min={state.customStart} />
      </label>
    </div>
  {/if}

  <p class="l-export-options__range">{state.rangeLabel}</p>
  <p class="l-export-options__preview" aria-live="polite">{state.previewText}</p>
  {#if state.previewError}
    <p class="l-export-options__error" role="alert">{state.previewError}</p>
  {/if}

  {#if state.warningLevel !== 'none' && !state.exporting}
    <p class="l-export-options__warning" class:is-critical={state.warningLevel === 'critical'}>
      {state.warningText}
    </p>
    {#if state.confirming}
      <p class="l-export-options__preview">{m['history.exportConfirmHint']()}</p>
    {/if}
  {/if}
</div>

<style>
  .l-export-options {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-xs);
    min-inline-size: 0;
  }

  .l-export-options__dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sk-space-sm);
  }

  .l-export-options__field {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-3xs);
    min-inline-size: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-export-options__field input {
    min-inline-size: 0;
    min-block-size: var(--sk-control-height-sm);
    padding-inline: var(--sk-space-xs);
    border: var(--sk-edge) solid hsl(var(--sk-color-border-strong));
    border-radius: var(--sk-radius-xs);
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-bg-raised));
    font-size: var(--sk-text-xs);
  }

  .l-export-options__range {
    margin: 0;
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-medium);
  }

  .l-export-options__preview {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-export-options__warning {
    margin: 0;
    padding: var(--sk-space-sm);
    border: var(--sk-edge) solid hsl(var(--sk-color-warning) / 0.35);
    border-radius: var(--sk-radius-sm);
    color: hsl(var(--sk-color-warning));
    background: hsl(var(--sk-color-warning) / 0.12);
    font-size: var(--sk-text-xs);
  }

  .l-export-options__warning.is-critical {
    color: hsl(var(--sk-color-break));
    background: hsl(var(--sk-color-break-soft) / 0.6);
    border-color: hsl(var(--sk-color-break) / 0.4);
  }

  .l-export-options__error {
    margin: 0;
    padding: var(--sk-space-sm);
    border-radius: var(--sk-radius-sm);
    color: hsl(var(--sk-color-break));
    background: hsl(var(--sk-color-break-soft) / 0.6);
    font-size: var(--sk-text-xs);
  }
</style>

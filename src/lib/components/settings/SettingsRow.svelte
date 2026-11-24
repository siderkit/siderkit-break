<script lang="ts">
  let {
    label,
    value,
    chevron = false,
    danger = false,
    divided = false,
    onclick,
  }: {
    label: string;
    value?: string;
    chevron?: boolean;
    danger?: boolean;
    divided?: boolean;
    onclick?: () => void;
  } = $props();
</script>

{#if onclick}
  <button
    class="l-settings-row"
    class:is-danger={danger}
    class:is-divided={divided}
    type="button"
    {onclick}
  >
    <span class="l-settings-row__label">{label}</span>
    {#if value}<span class="l-settings-row__value">{value}</span>{/if}
    {#if chevron}
      <span class="l-settings-row__chevron" aria-hidden="true">›</span>
    {/if}
  </button>
{:else}
  <div class="l-settings-row" class:is-danger={danger} class:is-divided={divided}>
    <span class="l-settings-row__label">{label}</span>
    {#if value}<span class="l-settings-row__value">{value}</span>{/if}
    {#if chevron}
      <span class="l-settings-row__chevron" aria-hidden="true">›</span>
    {/if}
  </div>
{/if}

<style>
  .l-settings-row {
    display: flex;
    align-items: center;
    gap: var(--sk-space-sm);
    inline-size: 100%;
    min-block-size: var(--sk-settings-row-height);
    padding: var(--sk-space-xs) var(--sk-space-sm);
    border: 0;
    border-radius: var(--sk-radius-xs);
    color: hsl(var(--sk-color-text));
    background: transparent;
    font-size: var(--sk-text-sm);
    text-align: start;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  button.l-settings-row:hover {
    background: hsl(var(--sk-color-brand-soft) / 0.45);
  }

  .l-settings-row.is-divided {
    border-block-start: var(--sk-edge) solid hsl(var(--sk-color-border));
    border-start-start-radius: 0;
    border-start-end-radius: 0;
  }

  .l-settings-row.is-danger {
    color: hsl(var(--sk-color-alert));
  }

  button.l-settings-row.is-danger:hover {
    background: hsl(var(--sk-color-alert) / 0.08);
  }

  .l-settings-row__label {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-settings-row__value {
    flex: 0 1 auto;
    max-inline-size: 62%;
    overflow: hidden;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    text-align: end;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-settings-row.is-danger .l-settings-row__value {
    color: inherit;
  }

  .l-settings-row__chevron {
    flex: 0 0 auto;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-lg);
    line-height: var(--sk-leading-none);
  }
</style>

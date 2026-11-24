<script lang="ts">
  import SettingsCell from './SettingsCell.svelte';
  import SettingsChevron from './SettingsChevron.svelte';

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

<SettingsCell {divided} {danger} {...onclick ? { onclick } : {}}>
  <span class="l-settings-row__label">{label}</span>
  {#if value}<span class="l-settings-row__value">{value}</span>{/if}
  {#if chevron}<SettingsChevron />{/if}
</SettingsCell>

<style>
  .l-settings-row__label {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-medium);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-settings-row__value {
    flex: 0 1 auto;
    max-inline-size: 62%;
    overflow: hidden;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-value);
    text-align: end;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

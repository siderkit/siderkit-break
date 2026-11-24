<script lang="ts">
  import SettingsCell from './SettingsCell.svelte';

  let {
    title,
    note,
    checked,
    divided = false,
    onchange,
  }: {
    title: string;
    note?: string;
    checked: boolean;
    divided?: boolean;
    onchange: (checked: boolean) => void;
  } = $props();
</script>

<SettingsCell label {divided}>
  <span class="l-settings-toggle__copy">
    <span class="l-settings-toggle__title">{title}</span>
    {#if note}<span class="l-settings-toggle__note">{note}</span>{/if}
  </span>
  <span class="l-settings-toggle__control">
    <input
      class="l-settings-toggle__input"
      type="checkbox"
      {checked}
      onchange={(event) => onchange(event.currentTarget.checked)}
    />
    <span class="l-settings-toggle__track" aria-hidden="true">
      <span class="l-settings-toggle__thumb"></span>
    </span>
  </span>
</SettingsCell>

<style>
  .l-settings-toggle__copy {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: calc(var(--sk-edge) * 2);
    min-inline-size: 0;
  }

  .l-settings-toggle__title {
    color: hsl(var(--sk-color-text));
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-medium);
  }

  .l-settings-toggle__note {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-note);
    line-height: var(--sk-leading-snug);
  }

  .l-settings-toggle__control {
    position: relative;
    flex: 0 0 auto;
    inline-size: var(--sk-toggle-width);
    block-size: var(--sk-toggle-height);
  }

  .l-settings-toggle__input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .l-settings-toggle__track {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    padding: var(--sk-toggle-inset);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-toggle-track));
    transition: background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-settings-toggle__thumb {
    display: block;
    inline-size: var(--sk-toggle-thumb-size);
    block-size: var(--sk-toggle-thumb-size);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-bg-raised));
    box-shadow: var(--sk-shadow-thumb);
    transition: transform var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-settings-toggle__input:checked + .l-settings-toggle__track {
    background: hsl(var(--sk-color-brand));
  }

  .l-settings-toggle__input:checked + .l-settings-toggle__track .l-settings-toggle__thumb {
    transform: translateX(
      calc(var(--sk-toggle-width) - var(--sk-toggle-thumb-size) - 2 * var(--sk-toggle-inset))
    );
  }

  .l-settings-toggle__input:focus-visible + .l-settings-toggle__track {
    outline: var(--sk-edge) solid hsl(var(--sk-color-focus));
    outline-offset: var(--sk-edge);
  }
</style>

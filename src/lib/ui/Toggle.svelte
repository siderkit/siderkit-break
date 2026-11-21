<script lang="ts">
  let {
    label,
    checked,
    onchange,
  }: {
    label: string;
    checked: boolean;
    onchange: (checked: boolean) => void;
  } = $props();
</script>

<label class="l-toggle">
  <span class="l-toggle__label">{label}</span>
  <span class="l-toggle__control">
    <input
      class="l-toggle__input"
      type="checkbox"
      {checked}
      onchange={(event) => onchange(event.currentTarget.checked)}
    />
    <span class="l-toggle__track" aria-hidden="true">
      <span class="l-toggle__thumb"></span>
    </span>
  </span>
</label>

<style>
  .l-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-lg);
    padding-block: var(--sk-space-md);
    cursor: pointer;
  }

  .l-toggle__label {
    color: hsl(var(--sk-color-text));
  }

  .l-toggle__control {
    position: relative;
    flex: 0 0 auto;
    inline-size: var(--sk-toggle-width);
    block-size: var(--sk-toggle-height);
    transition: transform var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-toggle:hover .l-toggle__track {
    box-shadow: inset 0 0 0 var(--sk-edge) hsl(var(--sk-color-brand) / 0.35);
  }

  .l-toggle:active .l-toggle__control {
    transform: scale(0.96);
  }

  .l-toggle__input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .l-toggle__track {
    position: absolute;
    inset: 0;
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-border-strong));
    transition: background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-toggle__thumb {
    position: absolute;
    inset-block-start: var(--sk-toggle-inset);
    inset-inline-start: var(--sk-toggle-inset);
    inline-size: var(--sk-toggle-thumb-size);
    block-size: var(--sk-toggle-thumb-size);
    border-radius: var(--sk-radius-full);
    background: hsl(var(--sk-color-bg-raised));
    box-shadow: var(--sk-shadow-thumb);
    transition: transform var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-toggle__input:checked + .l-toggle__track {
    background: hsl(var(--sk-color-brand));
  }

  .l-toggle__input:checked + .l-toggle__track .l-toggle__thumb {
    transform: translateX(calc(var(--sk-toggle-width) - var(--sk-toggle-height)));
  }

  :global([dir='rtl']) .l-toggle__input:checked + .l-toggle__track .l-toggle__thumb {
    transform: translateX(calc(-1 * (var(--sk-toggle-width) - var(--sk-toggle-height))));
  }

  .l-toggle__input:focus-visible + .l-toggle__track {
    outline: var(--sk-edge) solid hsl(var(--sk-color-focus));
    outline-offset: var(--sk-space-3xs);
  }
</style>

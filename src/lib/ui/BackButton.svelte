<script lang="ts">
  import { m } from '../../paraglide/messages.js';

  let { onclick }: { onclick: () => void } = $props();
</script>

<!--
  Shared drill-down header back control. Every subpage and sheet header renders
  this chevron as the first element so "go back one level" looks and acts the
  same everywhere; pages that also show Done keep both, with Done wired to the
  same target.
-->
<button class="l-back-button" type="button" aria-label={m['history.back']()} {onclick}>
  <svg class="l-back-button__icon" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M12.3 4.6 6.9 10l5.4 5.4" />
  </svg>
</button>

<style>
  .l-back-button {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    inline-size: var(--sk-icon-button-size);
    block-size: var(--sk-icon-button-size);
    /* Aligns the chevron with the header's content edge despite the
       header's inline padding. */
    margin-inline-start: calc(-1 * var(--sk-space-sm));
    padding: 0;
    border: 0;
    border-radius: var(--sk-radius-control);
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    transition:
      color var(--sk-duration-base) var(--sk-ease-standard),
      background-color var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-back-button:hover {
    color: hsl(var(--sk-color-text));
    background: hsl(var(--sk-color-brand-soft) / 0.55);
  }

  .l-back-button__icon {
    inline-size: var(--sk-icon-size-lg);
    block-size: var(--sk-icon-size-lg);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>

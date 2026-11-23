<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import { openProjectPage } from '../ipc/client';
  import UpdateCheck from './UpdateCheck.svelte';
</script>

<div class="l-about">
  <UpdateCheck />
  <p class="l-about__line">{m['settings.about.license']()}</p>
  <button class="l-about__link" type="button" onclick={() => void openProjectPage()}>
    <span>github.com/siderkit/siderkit-break</span>
    <span aria-hidden="true">↗</span>
  </button>
</div>

<style>
  .l-about {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-sm);
  }

  .l-about__line {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
  }

  .l-about__link {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: var(--sk-space-3xs);
    padding: 0;
    border: 0;
    color: hsl(var(--sk-color-brand));
    background: transparent;
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-medium);
    text-align: start;
  }

  .l-about__link:hover {
    text-decoration: underline;
  }
</style>

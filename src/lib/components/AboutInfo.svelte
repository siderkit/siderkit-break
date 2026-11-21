<script lang="ts">
  import { onMount } from 'svelte';
  import { getVersion } from '@tauri-apps/api/app';

  import { m } from '../../paraglide/messages.js';
  import { isTauri, openProjectPage } from '../ipc/client';

  let version = $state('');

  onMount(() => {
    if (!isTauri) {
      version = '0.0.0';
      return;
    }
    void getVersion()
      .then((value) => {
        version = value;
      })
      .catch(() => {
        version = '0.0.0';
      });
  });
</script>

<div class="l-about">
  {#if version}
    <p class="l-about__line">{m['settings.about.version']({ version })}</p>
  {/if}
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
    gap: var(--sk-space-2xs);
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

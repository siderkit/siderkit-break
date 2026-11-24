<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../../paraglide/messages.js';
  import type { Settings } from '../../ipc/types';
  import { updateStore } from '../../update-store.svelte';
  import DropletMark from '../../ui/DropletMark.svelte';
  import Button from '../../ui/Button.svelte';
  import UpdateCheck from '../UpdateCheck.svelte';
  import SettingsRow from './SettingsRow.svelte';

  let {
    version,
    value,
    onlicense,
    onprivacy,
  }: {
    version: string;
    value: Settings['update'];
    onlicense: () => void;
    onprivacy: () => void;
  } = $props();

  const skipped = $derived(updateStore.status?.skippedVersion ?? value.skippedVersion);

  onMount(() => {
    void updateStore.init();
  });
</script>

<div class="l-about-page">
  <div class="l-about-page__brand">
    <DropletMark />
    <div class="l-about-page__copy">
      <h3 class="l-about-page__name">{m['app.name']()}</h3>
      <p class="l-about-page__subtitle">{version} · {m['settings.about.subtitle']()}</p>
    </div>
  </div>

  <div class="l-about-page__rows">
    <SettingsRow label={m['settings.about.version']()} value={`v${version}`} />
    <SettingsRow
      label={m['settings.about.license']()}
      value="Apache-2.0"
      chevron
      divided
      onclick={onlicense}
    />
    <SettingsRow label={m['settings.about.privacy']()} chevron onclick={onprivacy} />
  </div>

  <div class="l-about-page__updates">
    <UpdateCheck live showVersion={false} />
    {#if skipped}
      <div class="l-about-page__skipped">
        <p class="l-about-page__skipped-text">
          {m['update.settings.skipped']({ version: skipped })}
        </p>
        <Button variant="Ghost" size="Sm" onclick={() => void updateStore.restoreSkipped()}>
          {m['update.action.showAgain']()}
        </Button>
      </div>
    {/if}
  </div>

  <p class="l-about-page__caption">{m['settings.about.caption']()}</p>
</div>

<style>
  .l-about-page {
    display: flex;
    flex-direction: column;
  }

  .l-about-page__brand {
    display: flex;
    align-items: center;
    gap: var(--sk-space-sm);
    padding: var(--sk-space-lg) var(--sk-space-sm);
  }

  .l-about-page__copy {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-2xs);
    min-inline-size: 0;
  }

  .l-about-page__name {
    margin: 0;
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-about-page__subtitle {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-about-page__rows {
    border-block-start: var(--sk-edge) solid hsl(var(--sk-color-border));
  }

  .l-about-page__updates {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-xs);
    padding: var(--sk-space-md) var(--sk-space-sm);
    border-block-start: var(--sk-edge) solid hsl(var(--sk-color-border));
  }

  .l-about-page__skipped {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-xs);
  }

  .l-about-page__skipped-text {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
  }

  .l-about-page__caption {
    margin: var(--sk-space-sm) var(--sk-space-sm) 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    line-height: var(--sk-leading-normal);
  }
</style>

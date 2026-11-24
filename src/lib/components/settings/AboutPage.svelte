<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../../paraglide/messages.js';
  import type { Settings } from '../../ipc/types';
  import { updateStore } from '../../state/update.store.svelte.ts';
  import DropletMark from '../../ui/DropletMark.svelte';
  import UpdateRow from '../UpdateRow.svelte';
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

  onMount(() => {
    void updateStore.init();
  });
</script>

<div class="l-about-page">
  <div class="l-about-page__brand">
    <DropletMark size="var(--sk-brand-mark-size-lg)" />
    <div class="l-about-page__copy">
      <h3 class="l-about-page__name">{m['app.name']()}</h3>
      <p class="l-about-page__subtitle">{version} · {m['app.tagline']()}</p>
    </div>
  </div>

  <SettingsRow label={m['settings.about.version']()} value={`v${version}`} divided />
  <SettingsRow
    label={m['settings.about.license']()}
    value="Apache-2.0"
    chevron
    divided
    onclick={onlicense}
  />
  <SettingsRow label={m['settings.about.privacy']()} chevron divided onclick={onprivacy} />
  <UpdateRow {value} />

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
    gap: var(--sk-settings-brand-gap);
    padding-block: var(--sk-settings-brand-pad-block-start) var(--sk-settings-brand-pad-block-end);
  }

  .l-about-page__copy {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  .l-about-page__name {
    margin: 0;
    font-size: var(--sk-text-md);
    font-weight: var(--sk-weight-bold);
  }

  .l-about-page__subtitle {
    margin: var(--sk-edge) 0 0;
    overflow: hidden;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-3xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-about-page__caption {
    margin: var(--sk-settings-section-gap) 0 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    line-height: var(--sk-leading-normal);
  }
</style>

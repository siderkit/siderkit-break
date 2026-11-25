<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import {
    formatDateHeading,
    formatMinutesLabel,
    formatTime,
    outcomeLabel,
    sessionKindLabel,
  } from '../utils/format.util';
  import { clockStore } from '../state/clock.store.svelte.ts';
  import type { HistoryListItem } from '../utils/history/history-page.util';
  import type { HistoryDay, HistorySession } from '../ipc/types';
  import type { Locale } from '../utils/locale.util';

  let {
    item,
    locale,
    ontagedit,
  }: {
    item: HistoryListItem;
    locale: Locale;
    ontagedit: (session: HistorySession) => void;
  } = $props();

  function daySummary(day: HistoryDay): string {
    return m['history.summary']({
      focus: day.completedFocus,
      countdown: day.completedCountdown,
      breaks: day.breakCount,
    });
  }
</script>

{#if item.kind === 'day'}
  <div class="l-history-row__day" style:block-size="{item.height}px">
    <h3 class="l-history-row__date">
      {formatDateHeading(item.day.date, locale, clockStore.dayKey)}
    </h3>
    <span class="l-history-row__summary">{daySummary(item.day)}</span>
  </div>
{:else if item.session}
  {@const session = item.session}
  <div class="l-history-row__session" style:block-size="{item.height}px">
    <span class="l-history-row__time">{formatTime(session.startedAtMs, locale)}</span>
    <span class="l-history-row__kind">{sessionKindLabel(session.kind)}</span>
    <span class="l-history-row__duration">{formatMinutesLabel(session.actualMs)}</span>
    <span class="l-history-row__outcome">{outcomeLabel(session.outcome)}</span>
    <button
      class="l-history-row__tag"
      class:is-empty={!session.tag}
      type="button"
      title={m['tags.edit']()}
      onclick={() => ontagedit(session)}
    >
      {session.tag ?? m['tags.add']()}
    </button>
  </div>
{/if}

<style>
  .l-history-row__day {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--sk-space-3xs);
    padding-inline: var(--sk-space-sm);
    border-block-end: var(--sk-edge) solid hsl(var(--sk-color-border));
    background: hsl(var(--sk-color-bg-surface));
  }

  .l-history-row__date {
    margin: 0;
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
  }

  .l-history-row__summary {
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-xs);
    line-height: var(--sk-leading-tight);
  }

  .l-history-row__session {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    grid-template-rows: auto auto;
    align-content: center;
    align-items: center;
    gap: 0 var(--sk-space-sm);
    padding-inline: var(--sk-space-sm);
    font-size: var(--sk-text-xs);
  }

  .l-history-row__session:hover {
    background: hsl(var(--sk-color-bg-surface));
  }

  .l-history-row__time,
  .l-history-row__duration {
    color: hsl(var(--sk-color-text-muted));
    font-variant-numeric: tabular-nums;
  }

  .l-history-row__kind {
    overflow: hidden;
    font-weight: var(--sk-weight-medium);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-history-row__outcome {
    color: hsl(var(--sk-color-text-muted));
    text-align: end;
  }

  .l-history-row__tag {
    grid-column: 1 / -1;
    justify-self: start;
    max-inline-size: 100%;
    padding: 0;
    overflow: hidden;
    border: 0;
    color: hsl(var(--sk-color-text-muted));
    background: transparent;
    font-size: var(--sk-text-xs);
    line-height: var(--sk-leading-tight);
    text-align: start;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .l-history-row__tag.is-empty {
    color: hsl(var(--sk-color-brand));
  }

  .l-history-row__tag:hover {
    color: hsl(var(--sk-color-brand-strong));
    text-decoration: underline;
    text-underline-offset: var(--sk-space-2xs);
  }
</style>

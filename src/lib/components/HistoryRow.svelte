<script lang="ts">
  import { m } from '../../paraglide/messages.js';
  import {
    formatDateHeading,
    formatMinutesLabel,
    formatTime,
    outcomeLabel,
    sessionKindLabel,
  } from '../format';
  import type { HistoryListItem } from '../history-page';
  import type { HistoryDay } from '../ipc/types';
  import type { Locale } from '../locale';

  let { item, locale }: { item: HistoryListItem; locale: Locale } = $props();

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
    <h3 class="l-history-row__date">{formatDateHeading(item.day.date, locale)}</h3>
    <span class="l-history-row__summary">{daySummary(item.day)}</span>
  </div>
{:else if item.session}
  <div class="l-history-row__session" style:block-size="{item.height}px">
    <span class="l-history-row__time">{formatTime(item.session.startedAtMs, locale)}</span>
    <span class="l-history-row__kind">{sessionKindLabel(item.session.kind)}</span>
    <span class="l-history-row__duration">{formatMinutesLabel(item.session.actualMs)}</span>
    <span class="l-history-row__outcome">{outcomeLabel(item.session.outcome)}</span>
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
    align-items: center;
    gap: var(--sk-space-sm);
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
</style>

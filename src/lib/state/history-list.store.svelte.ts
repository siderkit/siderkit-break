import { tick } from 'svelte';

import { getHistoryWindow, isTauri } from '../ipc/client';
import type { HistoryDay } from '../ipc/types';
import { mergeHistoryDays } from '../utils/history/history-page.util';
import { dateKeyToMs, localDayStartFromNow, shiftLocalDays } from '../utils/time/time.util';

export const PAGE_DAYS = 30;

/** Owns the infinite history feed so the virtual list stays presentational. */
export class HistoryListState {
  days = $state<HistoryDay[]>([]);
  loading = $state(true);
  loadingOlder = $state(false);
  hasMore = $state(false);
  loadError = $state<string | null>(null);
  private generation = 0;
  private readonly viewport: () => HTMLElement | undefined;

  constructor(viewport: () => HTMLElement | undefined) {
    this.viewport = viewport;
  }

  start(): void {
    void this.loadLatest();
  }

  async loadLatest(): Promise<void> {
    const token = ++this.generation;
    this.loading = true;
    this.loadingOlder = false;
    this.loadError = null;
    try {
      if (!isTauri) {
        this.days = [];
        this.hasMore = false;
        return;
      }
      let to = localDayStartFromNow(1);
      // Skip empty recent windows so an inactive month never looks like an
      // empty history.
      for (;;) {
        const from = shiftLocalDays(to, -PAGE_DAYS);
        const page = await getHistoryWindow(from, to);
        if (token !== this.generation) {
          return;
        }
        this.days = page.days;
        this.hasMore = page.hasMore;
        if (page.days.length > 0 || !page.hasMore) {
          break;
        }
        to = from;
      }
      await this.scrollToTop();
    } catch (cause) {
      if (token === this.generation) {
        this.loadError = errorMessage(cause);
      }
    } finally {
      if (token === this.generation) {
        this.loading = false;
      }
    }
  }

  async loadOlder(): Promise<void> {
    if (!this.hasMore || this.loading || this.loadingOlder) {
      return;
    }
    const oldest = oldestDayStart(this.days);
    if (oldest === null) {
      return;
    }
    const token = this.generation;
    this.loadingOlder = true;
    try {
      const from = shiftLocalDays(oldest, -PAGE_DAYS);
      const page = await getHistoryWindow(from, oldest);
      if (token !== this.generation) {
        return;
      }
      this.days = mergeHistoryDays(this.days, page.days);
      this.hasMore = page.hasMore;
    } catch (cause) {
      if (token === this.generation) {
        this.loadError = errorMessage(cause);
      }
    } finally {
      this.loadingOlder = false;
    }
  }

  private async scrollToTop(): Promise<void> {
    await tick();
    const viewport = this.viewport();
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }

  /** Applies a saved tag without refetching the whole feed. */
  applyTag(sessionId: string, tag: string | null): void {
    this.days = this.days.map((day) => ({
      ...day,
      sessions: day.sessions.map((session) =>
        session.id === sessionId ? { ...session, tag } : session,
      ),
    }));
  }
}

function oldestDayStart(groups: HistoryDay[]): number | null {
  const oldest = groups.at(-1);
  return oldest ? dateKeyToMs(oldest.date) : null;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

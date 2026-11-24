import { getInsights, isTauri } from './ipc/client';
import type { InsightsPayload, InsightsRange } from './ipc/types';
import { emptyInsights } from './insights';

/** Owns one aggregated Insights range; the UI never receives raw sessions. */
class InsightsStore {
  range = $state<InsightsRange>('week');
  payload = $state<InsightsPayload | null>(null);
  loading = $state(true);
  error = $state<string | null>(null);

  private request = 0;

  async load(range: InsightsRange = this.range): Promise<void> {
    this.range = range;
    const request = ++this.request;
    this.loading = true;
    this.error = null;
    if (!isTauri) {
      this.payload = emptyInsights(range);
      this.loading = false;
      return;
    }
    try {
      const payload = await getInsights(range);
      if (request === this.request) {
        this.payload = payload;
      }
    } catch (reason) {
      if (request === this.request) {
        this.error = reason instanceof Error ? reason.message : String(reason);
      }
    } finally {
      if (request === this.request) {
        this.loading = false;
      }
    }
  }

  select(range: InsightsRange): void {
    if (range !== this.range || this.payload === null) {
      void this.load(range);
    }
  }

  async refresh(): Promise<void> {
    await this.load(this.range);
  }
}

export const insightsStore = new InsightsStore();

import { m } from '../../paraglide/messages.js';
import {
  bytesToBase64,
  downloadBytes,
  EXCEL_MIME,
  exportFilename,
} from '../utils/export/export.util';
import {
  formatRangeLabel,
  localDateKey,
  rangeForPreset,
  rangeFromDates,
  type ExportPreset,
  type ExportRange,
} from '../utils/export/export-range.util';
import {
  chooseHistoryWorkbookPath,
  getHistoryRange,
  getHistoryRangeSummary,
  isTauri,
  revealHistoryWorkbook,
  writeHistoryWorkbook,
} from '../ipc/client';
import type { HistoryRangeSummary } from '../ipc/types';
import { currentLocale } from '../utils/locale.util';
import { buildWorkbook } from '../utils/export/xlsx.util';

const LARGE_EXPORT = 10_000;
const CONFIRM_EXPORT = 30_000;
const CRITICAL_EXPORT = 100_000;
const EMPTY_SUMMARY: HistoryRangeSummary = {
  sessions: 0,
  days: 0,
  focusMs: 0,
  breakMs: 0,
  countdownMs: 0,
};
const PRESETS: ExportPreset[] = ['Today', 'ThisWeek', 'ThisMonth', 'ThisYear', 'Custom'];

export type WarningLevel = 'none' | 'large' | 'critical';

/** Owns the export range, preview count, and workbook pipeline. */
export class HistoryExportState {
  preset = $state<ExportPreset>('ThisMonth');
  customStart = $state(localDateKey());
  customEnd = $state(localDateKey());
  summary = $state<HistoryRangeSummary | null>(null);
  previewing = $state(false);
  previewError = $state<string | null>(null);
  confirming = $state(false);
  exporting = $state(false);
  progress = $state(0);
  cancelled = $state(false);
  exportError = $state<string | null>(null);
  savedPath = $state<string | null>(null);
  private controller: AbortController | null = null;
  private previewRequest = 0;
  private readonly locale = currentLocale();

  get range(): ExportRange | null {
    if (this.preset === 'Custom') {
      return rangeFromDates(this.customStart, this.customEnd);
    }
    return rangeForPreset(this.preset);
  }

  get sessionCount(): number {
    return this.summary?.sessions ?? 0;
  }

  get warningLevel(): WarningLevel {
    if (this.sessionCount >= CRITICAL_EXPORT) {
      return 'critical';
    }
    if (this.sessionCount >= LARGE_EXPORT) {
      return 'large';
    }
    return 'none';
  }

  get needsConfirmation(): boolean {
    return this.sessionCount >= CONFIRM_EXPORT;
  }

  get rangeLabel(): string {
    const range = this.range;
    return range ? formatRangeLabel(range, this.locale) : m['history.range.invalid']();
  }

  get previewText(): string {
    if (this.previewing) {
      return m['history.previewLoading']();
    }
    if (!this.summary || this.summary.sessions === 0) {
      return m['history.previewEmpty']();
    }
    return m['history.preview']({
      sessions: this.summary.sessions,
      days: this.summary.days,
    });
  }

  get warningText(): string {
    if (this.warningLevel === 'critical') {
      return m['history.exportWarningCritical']({ sessions: this.sessionCount });
    }
    return m['history.exportWarning']({ sessions: this.sessionCount });
  }

  setPreset(value: string): void {
    if (PRESETS.includes(value as ExportPreset)) {
      this.preset = value as ExportPreset;
    }
  }

  /** Re-counts the current range; the component calls this from an effect. */
  async refreshPreview(): Promise<void> {
    const current = this.range;
    const request = ++this.previewRequest;
    this.summary = null;
    this.previewing = false;
    this.previewError = null;
    this.confirming = false;
    this.savedPath = null;
    this.cancelled = false;
    if (!current) {
      return;
    }
    if (!isTauri) {
      this.summary = EMPTY_SUMMARY;
      return;
    }
    this.previewing = true;
    try {
      const value = await getHistoryRangeSummary(current.fromMs, current.toMs);
      if (request === this.previewRequest) {
        this.summary = value;
      }
    } catch {
      if (request === this.previewRequest) {
        this.previewError = m['history.previewError']();
      }
    } finally {
      if (request === this.previewRequest) {
        this.previewing = false;
      }
    }
  }

  async startExport(now: Date): Promise<void> {
    const current = this.range;
    if (this.exporting || !current) {
      return;
    }
    if (this.needsConfirmation && !this.confirming) {
      this.confirming = true;
      return;
    }
    this.confirming = false;
    this.exporting = true;
    this.exportError = null;
    this.cancelled = false;
    this.savedPath = null;
    this.progress = 0;
    const abort = new AbortController();
    this.controller = abort;
    try {
      const fileName = exportFilename(current, now);
      if (!isTauri) {
        const workbook = await buildWorkbook({ days: [] }, current, now, {
          signal: abort.signal,
        });
        downloadBytes(workbook, fileName, EXCEL_MIME);
        this.savedPath = fileName;
        return;
      }
      const target = await chooseHistoryWorkbookPath(
        fileName,
        m['history.exportDialogTitle'](),
        m['history.exportFilter'](),
      );
      if (!target) {
        return;
      }
      const history = await getHistoryRange(current.fromMs, current.toMs);
      const workbook = await buildWorkbook(history, current, now, {
        signal: abort.signal,
        onProgress: (done, total) => {
          this.progress = total > 0 ? Math.round((done / total) * 100) : 0;
        },
      });
      this.progress = 100;
      await writeHistoryWorkbook(target, bytesToBase64(workbook));
      this.savedPath = target;
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') {
        this.cancelled = true;
      } else {
        this.exportError = m['history.exportError']();
      }
    } finally {
      this.controller = null;
      this.exporting = false;
    }
  }

  cancel(): void {
    this.controller?.abort();
  }

  async reveal(): Promise<void> {
    if (!this.savedPath || !isTauri) {
      return;
    }
    this.exportError = null;
    try {
      await revealHistoryWorkbook(this.savedPath);
    } catch {
      this.exportError = m['history.exportRevealError']();
    }
  }

  dispose(): void {
    this.controller?.abort();
  }
}

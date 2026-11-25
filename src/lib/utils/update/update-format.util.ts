/** Human-readable sizes for the updater UI. */

import { activeLocale } from '../locale.util.ts';

export function formatBytes(bytes: number, locale?: string): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value < 10 ? 1 : 0;
  const formatted = new Intl.NumberFormat(activeLocale(locale), {
    maximumFractionDigits: digits,
  }).format(value);
  return `${formatted} ${units[unit]}`;
}

/** "3.1 MB" while the total is unknown, otherwise "3.1 / 7.4 MB". */
export function formatDownloadSize(downloaded: number, total: number | null): string {
  if (total === null || total <= 0) {
    return formatBytes(downloaded);
  }
  return `${formatBytes(downloaded)} / ${formatBytes(total)}`;
}

export function downloadPercent(downloaded: number, total: number | null): number {
  if (total === null || total <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((downloaded / total) * 100)));
}

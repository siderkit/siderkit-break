/** Human-readable sizes and relative times for the updater UI. */

function activeLocale(override?: string): string | undefined {
  if (override) {
    return override;
  }
  if (typeof document === 'undefined') {
    return undefined;
  }
  return document.documentElement.lang || undefined;
}

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

export function formatRelative(timestampMs: number, now = Date.now(), locale?: string): string {
  const diffSeconds = Math.round((timestampMs - now) / 1000);
  const magnitude = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(activeLocale(locale), { numeric: 'auto' });
  if (magnitude < 60) {
    return subMinuteText(diffSeconds, formatter, locale);
  }
  if (magnitude < 60 * 60) {
    return formatter.format(Math.round(diffSeconds / 60), 'minute');
  }
  if (magnitude < 24 * 60 * 60) {
    return formatter.format(Math.round(diffSeconds / 60 / 60), 'hour');
  }
  return formatter.format(Math.round(diffSeconds / 60 / 60 / 24), 'day');
}

/**
 * Under a minute the formatter's bare "now" reads frozen on screen, so a
 * zero-second check says "刚刚"/"Just now" and the ticking clock keeps the
 * label moving instead of pinning it to the moment of render.
 */
function subMinuteText(
  diffSeconds: number,
  formatter: Intl.RelativeTimeFormat,
  locale?: string,
): string {
  if (Math.round(diffSeconds) !== 0) {
    return formatter.format(diffSeconds, 'second');
  }
  const lang = (activeLocale(locale) ?? '').toLowerCase();
  if (lang.startsWith('zh')) {
    return /tw|hk|mo|hant/.test(lang) ? '剛剛' : '刚刚';
  }
  if (lang.startsWith('en')) {
    return 'Just now';
  }
  return formatter.format(-1, 'second');
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

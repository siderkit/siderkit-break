import type { Diagnostics } from './ipc/types';

/** Compact byte labels for log sizes in settings rows. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  const digits = exponent === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[exponent]}`;
}

/** Builds the exact text copied from the Diagnostics page. No session data. */
export function diagnosticsText(data: Diagnostics): string {
  const lines = [
    `Version: ${data.version}`,
    `OS: ${data.os} (${data.arch})`,
    `WebView: ${data.webview}`,
    `Locale: ${data.locale}`,
    `Theme: ${data.theme}`,
    `Palette: ${data.palette}`,
    `Window: ${data.windowMode}`,
    `Logs: ${data.logDir} (${formatBytes(data.logSize)})`,
  ];
  if (data.recentLogs.length > 0) {
    lines.push('Recent warnings:');
    lines.push(...data.recentLogs);
  }
  return lines.join('\n');
}

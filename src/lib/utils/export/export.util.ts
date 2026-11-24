import type { ExportRange } from './export-range.util.ts';

export const EXPORT_FILENAME_PREFIX = 'siderkit-break';
export const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Builds a range-first, filesystem-safe name:
 * `siderkit-break-20261101-20261121-20261121-1430.xlsx`.
 */
export function exportFilename(range: ExportRange, now = new Date()): string {
  const start = range.startDate.replace(/\D/g, '');
  const end = range.endDate.replace(/\D/g, '');
  return `${EXPORT_FILENAME_PREFIX}-${start}-${end}-${localStampKey(now)}.xlsx`;
}

/** Returns the file name portion of a Windows or Unix path. */
export function fileNameOf(path: string): string {
  const segments = path.split(/[\\/]/);
  return segments[segments.length - 1] || path;
}

/** Encodes bytes for the binary IPC handoff without a JSON number array. */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/** Returns a compact local date-time key (for example 20261121-1430), not UTC. */
export function localStampKey(date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/** Saves a binary export through the webview's download path. */
export function downloadBytes(bytes: Uint8Array, filename: string, mime: string): void {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

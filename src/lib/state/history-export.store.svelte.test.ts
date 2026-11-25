import { beforeEach, expect, test, vi } from 'vitest';

import { exportFilename } from '../utils/export/export.util';
import { localDateKey, addLocalDays, startOfLocalDay } from '../utils/time/time.util';
import { HistoryExportState } from './history-export.store.svelte.ts';

const ipc = vi.hoisted(() => ({
  isTauri: true,
  getHistoryRangeSummary: vi.fn(async () => ({
    sessions: 7,
    days: 3,
    focusMs: 400_000,
    breakMs: 60_000,
    countdownMs: 0,
  })),
  getHistoryRange: vi.fn(async () => ({ days: [] })),
  chooseHistoryWorkbookPath: vi.fn(async () => null),
  writeHistoryWorkbook: vi.fn(async () => {}),
  revealHistoryWorkbook: vi.fn(async () => {}),
}));
vi.mock('../ipc/client', () => ipc);

const fresh = () => new HistoryExportState();

const WORKBOOK_PATH = 'C:\\out\\book.xlsx';

beforeEach(() => {
  ipc.getHistoryRangeSummary.mockReset();
  ipc.chooseHistoryWorkbookPath.mockReset();
  ipc.writeHistoryWorkbook.mockReset();
  ipc.revealHistoryWorkbook.mockReset();
});

test('week presets span Monday through today', () => {
  const state = fresh();
  state.setPreset('ThisWeek');
  const today = startOfLocalDay(new Date());
  const monday = addLocalDays(today, -((today.getDay() + 6) % 7));
  expect(state.range).toEqual({
    startDate: localDateKey(monday),
    endDate: localDateKey(today),
    fromMs: monday.getTime(),
    toMs: addLocalDays(today, 1).getTime(),
  });
});

test('unknown presets are ignored', () => {
  const state = fresh();
  state.setPreset('Nonsense');
  expect(state.preset).toBe('ThisMonth');
});

test('custom dates resolve through the range builder', () => {
  const state = fresh();
  state.setPreset('Custom');
  state.customStart = '2026-11-01';
  state.customEnd = '2026-11-21';
  expect(state.range?.startDate).toBe('2026-11-01');
  expect(state.range?.endDate).toBe('2026-11-21');
});

test('export size drives warning levels and confirmation', () => {
  const state = fresh();
  state.summary = { sessions: 150_000, days: 9, focusMs: 0, breakMs: 0, countdownMs: 0 };
  expect(state.warningLevel).toBe('critical');
  expect(state.needsConfirmation).toBe(true);
  state.summary = { sessions: 35_000, days: 9, focusMs: 0, breakMs: 0, countdownMs: 0 };
  expect(state.warningLevel).toBe('large');
  expect(state.needsConfirmation).toBe(true);
  state.summary = { sessions: 5, days: 1, focusMs: 0, breakMs: 0, countdownMs: 0 };
  expect(state.warningLevel).toBe('none');
  expect(state.needsConfirmation).toBe(false);
});

test('refreshPreview counts the active range', async () => {
  const state = fresh();
  await state.refreshPreview();
  expect(ipc.getHistoryRangeSummary).toHaveBeenCalledTimes(1);
  expect(state.summary?.sessions).toBe(7);
  expect(state.previewing).toBe(false);
});

test('an invalid custom range skips the IPC round-trip', async () => {
  const state = fresh();
  state.setPreset('Custom');
  state.customStart = '2026-02-30';
  await state.refreshPreview();
  expect(state.summary).toBeNull();
  expect(ipc.getHistoryRangeSummary).not.toHaveBeenCalled();
  expect(state.rangeLabel.length).toBeGreaterThan(0);
});

test('a large export asks for confirmation before running', async () => {
  const state = fresh();
  state.summary = { sessions: 50_000, days: 10, focusMs: 0, breakMs: 0, countdownMs: 0 };
  await state.startExport(new Date(2026, 10, 25, 10, 0, 0));
  expect(state.confirming).toBe(true);
  expect(state.exporting).toBe(false);
  expect(ipc.chooseHistoryWorkbookPath).not.toHaveBeenCalled();
});

test('startExport writes the workbook to the chosen path', async () => {
  const state = fresh();
  ipc.chooseHistoryWorkbookPath.mockResolvedValueOnce(WORKBOOK_PATH);
  await state.startExport(new Date(2026, 10, 25, 10, 0, 0));
  expect(ipc.chooseHistoryWorkbookPath).toHaveBeenCalledTimes(1);
  expect(ipc.getHistoryRange).toHaveBeenCalledTimes(1);
  expect(ipc.writeHistoryWorkbook).toHaveBeenCalledWith(WORKBOOK_PATH, expect.any(String));
  expect(state.savedPath).toBe(WORKBOOK_PATH);
  expect(state.exporting).toBe(false);
});

test('closing the dialog stops without saving', async () => {
  const state = fresh();
  ipc.chooseHistoryWorkbookPath.mockResolvedValueOnce(null);
  await state.startExport(new Date(2026, 10, 25, 10, 0, 0));
  expect(ipc.writeHistoryWorkbook).not.toHaveBeenCalled();
  expect(state.savedPath).toBeNull();
  expect(state.exporting).toBe(false);
});

test('a failed write surfaces the export error', async () => {
  const state = fresh();
  ipc.chooseHistoryWorkbookPath.mockResolvedValueOnce(WORKBOOK_PATH);
  ipc.writeHistoryWorkbook.mockRejectedValueOnce(new Error('disk full'));
  await state.startExport(new Date(2026, 10, 25, 10, 0, 0));
  expect(state.exportError).not.toBeNull();
  expect(state.exporting).toBe(false);
});

test('reveal errors surface', async () => {
  const state = fresh();
  state.savedPath = WORKBOOK_PATH;
  ipc.revealHistoryWorkbook.mockRejectedValueOnce(new Error('nope'));
  await state.reveal();
  expect(state.exportError).not.toBeNull();
});

test('reveal opens the saved file and stays clean', async () => {
  const state = fresh();
  state.savedPath = WORKBOOK_PATH;
  await state.reveal();
  expect(ipc.revealHistoryWorkbook).toHaveBeenCalledWith(WORKBOOK_PATH);
  expect(state.exportError).toBeNull();
});

test('outside Tauri the workbook downloads through the webview', async () => {
  ipc.isTauri = false;
  const state = fresh();
  const now = new Date(2026, 10, 25, 10, 0, 0);
  await state.startExport(now);
  expect(ipc.chooseHistoryWorkbookPath).not.toHaveBeenCalled();
  expect(state.exporting).toBe(false);
  if (state.range) {
    expect(state.savedPath).toBe(exportFilename(state.range, now));
  }
  ipc.isTauri = true;
});

test('outside Tauri reveal is a no-op', async () => {
  ipc.isTauri = false;
  const state = fresh();
  state.savedPath = 'book.xlsx';
  await state.reveal();
  expect(ipc.revealHistoryWorkbook).not.toHaveBeenCalled();
  expect(state.exportError).toBeNull();
  ipc.isTauri = true;
});

test('warnings and preview text cover every level', () => {
  const state = fresh();
  state.summary = { sessions: 150_000, days: 9, focusMs: 0, breakMs: 0, countdownMs: 0 };
  expect(state.warningText.length).toBeGreaterThan(0);
  state.summary = { sessions: 0, days: 0, focusMs: 0, breakMs: 0, countdownMs: 0 };
  expect(state.previewText.length).toBeGreaterThan(0);
  expect(state.rangeLabel.length).toBeGreaterThan(0);
});

test('dispose without a pipeline is harmless', () => {
  const state = fresh();
  state.dispose();
  expect(state.exporting).toBe(false);
});

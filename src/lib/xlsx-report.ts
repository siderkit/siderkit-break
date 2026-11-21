import type { History, HistoryDay, HistorySession, SessionOutcome } from './ipc/types';
import {
  formatFullDate,
  formatMinutesLabel,
  formatTimeWithSeconds,
  outcomeLabel,
  sessionKindLabel,
} from './format.ts';
import type { Locale } from './locale.ts';
import { formatRangeLabel, type ExportRange } from './export-range.ts';
import { PROJECT_URL } from './project.ts';
import { m } from '../paraglide/messages.js';
import { MAIN_NS, REPORT_COLORS, XML_HEADER, cell, row, sectionRow, sheetXml } from './xlsx-xml.ts';

type FlatSession = HistorySession & { date: string };

/** Progress and cancellation flow through the row builder. */
export interface SheetOptions {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

const BRAND_STYLE = 18;

export function stylesXml(): string {
  const fonts = [
    `<font><sz val="11"/><color rgb="${REPORT_COLORS.ink}"/><name val="Segoe UI"/></font>`,
    `<font><b/><sz val="22"/><color rgb="${REPORT_COLORS.brandDeep}"/><name val="Segoe UI"/></font>`,
    `<font><sz val="10"/><color rgb="${REPORT_COLORS.muted}"/><name val="Segoe UI"/></font>`,
    `<font><b/><sz val="11"/><color rgb="${REPORT_COLORS.white}"/><name val="Segoe UI"/></font>`,
    `<font><b/><sz val="20"/><color rgb="${REPORT_COLORS.brandDeep}"/><name val="Segoe UI"/></font>`,
    `<font><b/><sz val="9"/><color rgb="${REPORT_COLORS.muted}"/><name val="Segoe UI"/></font>`,
    `<font><b/><sz val="10"/><color rgb="${REPORT_COLORS.green}"/><name val="Segoe UI"/></font>`,
    `<font><b/><sz val="10"/><color rgb="${REPORT_COLORS.amber}"/><name val="Segoe UI"/></font>`,
    `<font><sz val="10"/><color rgb="${REPORT_COLORS.muted}"/><name val="Segoe UI"/></font>`,
    `<font><b/><sz val="10"/><color rgb="${REPORT_COLORS.coral}"/><name val="Segoe UI"/></font>`,
    `<font><u/><sz val="10"/><color rgb="${REPORT_COLORS.muted}"/><name val="Segoe UI"/></font>`,
  ];
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    `<fill><patternFill patternType="solid"><fgColor rgb="${REPORT_COLORS.brand}"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="${REPORT_COLORS.cream}"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="${REPORT_COLORS.mint}"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="${REPORT_COLORS.white}"/><bgColor indexed="64"/></patternFill></fill>`,
  ];
  const border = `<border><left/><right/><top/><bottom style="thin"><color rgb="${REPORT_COLORS.line}"/></bottom><diagonal/></border>`;
  const body = (font: number, fill: number) =>
    `<xf numFmtId="0" fontId="${font}" fillId="${fill}" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>`;
  const xfs = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>',
    `<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>`,
    `<xf numFmtId="0" fontId="5" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>`,
    `<xf numFmtId="0" fontId="4" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>`,
    `<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
    body(0, 5),
    body(0, 3),
    body(6, 5),
    body(6, 3),
    body(7, 5),
    body(7, 3),
    body(8, 5),
    body(8, 3),
    body(9, 5),
    body(9, 3),
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="10" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>',
  ];
  return [
    XML_HEADER,
    `<styleSheet xmlns="${MAIN_NS}">`,
    `<fonts count="${fonts.length}">${fonts.join('')}</fonts>`,
    `<fills count="${fills.length}">${fills.join('')}</fills>`,
    `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders>`,
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>`,
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
    '</styleSheet>',
  ].join('');
}

function outcomeStyle(outcome: SessionOutcome, alternate: boolean): number {
  switch (outcome) {
    case 'Completed':
      return alternate ? 10 : 9;
    case 'Skipped':
      return alternate ? 12 : 11;
    case 'Reset':
      return alternate ? 14 : 13;
    case 'Interrupted':
      return alternate ? 16 : 15;
  }
}

export function safeSheetName(name: string, fallback: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim();
  return (cleaned || fallback).slice(0, 31);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function flatten(history: History): FlatSession[] {
  return history.days
    .flatMap((day) => day.sessions.map((session) => ({ ...session, date: day.date })))
    .sort((left, right) => right.startedAtMs - left.startedAtMs);
}

function completionRate(history: History): number {
  const focus = history.days
    .flatMap((day) => day.sessions)
    .filter((session) => session.kind === 'Focus');
  if (focus.length === 0) {
    return 0;
  }
  const completed = focus.filter((session) => session.outcome === 'Completed').length;
  return Math.round((completed / focus.length) * 100);
}

function dayLabel(day: HistoryDay, locale: Locale): string {
  return formatFullDate(day.date, locale);
}

function brandRow(): string {
  return row(1, [`${m['app.name']()} · ${PROJECT_URL}`], BRAND_STYLE, 22);
}

function brandHyperlink(): Array<{ ref: string; target: string }> {
  return [{ ref: 'A1', target: PROJECT_URL }];
}

function printHeader(): string {
  return `${m['app.name']()} · ${PROJECT_URL}`;
}

function abortError(): DOMException {
  return new DOMException('Export cancelled', 'AbortError');
}

async function yieldToMain(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw abortError();
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  if (signal?.aborted) {
    throw abortError();
  }
}

function overviewRows(history: History, startRow: number): string[] {
  const focusSessions = sum(history.days.map((day) => day.completedFocus));
  const focusMs = sum(history.days.map((day) => day.focusMs));
  const breaks = sum(history.days.map((day) => day.breakCount));
  const breakMs = sum(history.days.map((day) => day.breakMs));
  const countdowns = sum(history.days.map((day) => day.completedCountdown));
  const metricsRow = startRow + 1;
  const timeRow = startRow + 2;

  return [
    sectionRow(startRow, m['export.overview'](), 22),
    `<row r="${metricsRow}" ht="28" customHeight="1">${[
      cell(`A${metricsRow}`, m['export.metric.focusSessions'](), 4),
      cell(`B${metricsRow}`, focusSessions, 5),
      cell(`C${metricsRow}`, m['export.metric.focusTime'](), 4),
      cell(`D${metricsRow}`, formatMinutesLabel(focusMs), 5),
      cell(`E${metricsRow}`, m['export.metric.completion'](), 4),
      cell(`F${metricsRow}`, `${completionRate(history)}%`, 5),
    ].join('')}</row>`,
    `<row r="${timeRow}" ht="28" customHeight="1">${[
      cell(`A${timeRow}`, m['export.metric.breaks'](), 4),
      cell(`B${timeRow}`, breaks, 5),
      cell(`C${timeRow}`, m['export.metric.breakTime'](), 4),
      cell(`D${timeRow}`, formatMinutesLabel(breakMs), 5),
      cell(`E${timeRow}`, m['export.metric.countdowns'](), 4),
      cell(`F${timeRow}`, countdowns, 5),
    ].join('')}</row>`,
  ];
}

function sessionRow(
  session: FlatSession,
  rowNumber: number,
  alternate: boolean,
  locale: Locale,
): string {
  const base = alternate ? 8 : 7;
  const cells = [
    cell(`A${rowNumber}`, formatFullDate(session.date, locale), base),
    cell(`B${rowNumber}`, formatTimeWithSeconds(session.startedAtMs, locale), base),
    cell(`C${rowNumber}`, sessionKindLabel(session.kind), base),
    cell(`D${rowNumber}`, outcomeLabel(session.outcome), outcomeStyle(session.outcome, alternate)),
    cell(`E${rowNumber}`, formatMinutesLabel(session.plannedMs), base),
    cell(`F${rowNumber}`, formatMinutesLabel(session.actualMs), base),
    cell(`G${rowNumber}`, session.interruptions, base),
  ];
  return `<row r="${rowNumber}" ht="20" customHeight="1">${cells.join('')}</row>`;
}

export async function summarySheet(
  history: History,
  locale: Locale,
  generated: string,
  range: ExportRange,
): Promise<string> {
  const rangeLabel = formatRangeLabel(range, locale);
  const rows: string[] = [];
  rows.push(brandRow());
  rows.push(row(2, [m['export.workbookTitle']()], 1, 34));
  rows.push(row(3, [`${rangeLabel} · ${m['export.generated']({ date: generated })}`], 2, 18));
  rows.push(...overviewRows(history, 5));
  rows.push(sectionRow(9, m['export.daily'](), 22));
  rows.push(
    row(
      10,
      [
        m['export.column.date'](),
        m['export.metric.focusSessions'](),
        m['export.metric.focusTime'](),
        m['export.metric.breaks'](),
        m['export.metric.countdowns'](),
        m['export.metric.countdownTime'](),
      ],
      6,
      24,
    ),
  );

  const tableStart = 11;
  let last = tableStart;
  if (history.days.length === 0) {
    rows.push(row(tableStart, [m['history.empty']()], 17, 28));
  } else {
    history.days.forEach((day, index) => {
      const style = index % 2 === 0 ? 7 : 8;
      rows.push(
        row(
          tableStart + index,
          [
            dayLabel(day, locale),
            day.completedFocus,
            formatMinutesLabel(day.focusMs),
            day.breakCount,
            day.completedCountdown,
            formatMinutesLabel(day.countdownMs),
          ],
          style,
          20,
        ),
      );
      last = tableStart + index;
    });
  }

  const emptyMerge = history.days.length === 0 ? [`A${tableStart}:F${tableStart}`] : [];
  return sheetXml({
    dimension: `A1:F${last}`,
    columns: [24, 16, 16, 14, 16, 18],
    rows,
    freeze: { rows: 10, topLeft: 'A11' },
    autoFilter: history.days.length > 0 ? `A10:F${last}` : undefined,
    merges: ['A1:F1', 'A2:F2', 'A3:F3', 'A5:F5', 'A9:F9', ...emptyMerge],
    hyperlinks: brandHyperlink(),
    printHeader: printHeader(),
  });
}

/** Everything a sheet needs to label its range and generation time. */
export interface SheetContext {
  locale: Locale;
  generated: string;
  range: ExportRange;
}

export async function sessionsSheet(
  history: History,
  context: SheetContext,
  options: SheetOptions = {},
): Promise<string> {
  const sessions = flatten(history);
  const rangeLabel = formatRangeLabel(context.range, context.locale);
  const rows: string[] = [];
  rows.push(brandRow());
  rows.push(row(2, [`${m['export.sessions']()} · ${rangeLabel}`], 1, 34));
  rows.push(row(3, [m['export.generated']({ date: context.generated })], 2, 18));
  rows.push(
    row(
      4,
      [
        m['export.column.date'](),
        m['export.column.start'](),
        m['export.column.type'](),
        m['export.column.outcome'](),
        m['export.column.planned'](),
        m['export.column.actual'](),
        m['export.column.interruptions'](),
      ],
      6,
      24,
    ),
  );

  const tableStart = 5;
  let last = tableStart;
  if (sessions.length === 0) {
    rows.push(row(tableStart, [m['history.empty']()], 17, 28));
  } else {
    for (const [index, session] of sessions.entries()) {
      if (index % 400 === 0) {
        options.onProgress?.(index, sessions.length);
        await yieldToMain(options.signal);
      }
      const rowNumber = tableStart + index;
      rows.push(sessionRow(session, rowNumber, index % 2 === 1, context.locale));
      last = rowNumber;
    }
    options.onProgress?.(sessions.length, sessions.length);
  }

  const emptyMerge = sessions.length === 0 ? [`A${tableStart}:G${tableStart}`] : [];
  return sheetXml({
    dimension: `A1:G${last}`,
    columns: [22, 12, 16, 16, 14, 14, 15],
    rows,
    freeze: { rows: 4, topLeft: 'A5' },
    autoFilter: sessions.length > 0 ? `A4:G${last}` : undefined,
    merges: ['A1:G1', 'A2:G2', 'A3:G3', ...emptyMerge],
    hyperlinks: brandHyperlink(),
    printHeader: printHeader(),
  });
}

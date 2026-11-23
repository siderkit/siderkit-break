import assert from 'node:assert/strict';
import test from 'node:test';

import type { History } from './ipc/types.ts';
import { rangeFromDates } from './export-range.ts';
import { buildWorkbook, columnName, crc32, escapeXml, zipStore } from './xlsx.ts';

const sampleRange = rangeFromDates('2026-11-20', '2026-11-20');
if (!sampleRange) {
  throw new Error('sample range must be valid');
}

const sampleHistory: History = {
  days: [
    {
      date: '2026-11-20',
      completedFocus: 2,
      focusMs: 50 * 60_000,
      completedCountdown: 1,
      countdownMs: 5 * 60_000,
      breakCount: 2,
      breakMs: 10 * 60_000,
      sessions: [
        {
          id: 'focus-1',
          kind: 'Focus',
          startedAtMs: Date.UTC(2026, 10, 20, 9, 0),
          endedAtMs: Date.UTC(2026, 10, 20, 9, 25),
          plannedMs: 25 * 60_000,
          actualMs: 25 * 60_000,
          outcome: 'Completed',
          interruptions: 0,
        },
        {
          id: 'countdown-1',
          kind: 'Countdown',
          startedAtMs: Date.UTC(2026, 10, 20, 10, 30),
          endedAtMs: Date.UTC(2026, 10, 20, 10, 35),
          plannedMs: 5 * 60_000,
          actualMs: 5 * 60_000,
          outcome: 'Completed',
          interruptions: 0,
        },
      ],
    },
  ],
};

test('crc32 matches the standard check value', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(crc32(bytes), 0xcbf43926);
});

test('xml text is escaped for workbook labels', () => {
  assert.equal(escapeXml('Tea & toast <ok>'), 'Tea &amp; toast &lt;ok&gt;');
  assert.equal(escapeXml(`it's "fine"`), 'it&apos;s &quot;fine&quot;');
});

test('column names roll over after Z', () => {
  assert.equal(columnName(0), 'A');
  assert.equal(columnName(6), 'G');
  assert.equal(columnName(25), 'Z');
  assert.equal(columnName(26), 'AA');
});

test('a stored zip reports every entry in its end record', async () => {
  const archive = await zipStore(
    [
      { name: 'a.txt', data: new TextEncoder().encode('hello') },
      { name: 'b/c.txt', data: new TextEncoder().encode('world') },
    ],
    false,
  );
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  assert.equal(view.getUint32(archive.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(archive.length - 22 + 10, true), 2);
  assert.equal(view.getUint32(0, true), 0x04034b50);
});

test('a compressed archive still reports every entry', async () => {
  const archive = await zipStore([
    { name: 'a.txt', data: new TextEncoder().encode('hello '.repeat(200)) },
  ]);
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  assert.equal(view.getUint32(archive.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(archive.length - 22 + 10, true), 1);
});

test('the workbook contains styled summary and session sheets', async () => {
  const workbook = await buildWorkbook(
    sampleHistory,
    sampleRange,
    new Date('2026-11-20T12:00:00Z'),
    { compress: false },
  );
  const text = new TextDecoder().decode(workbook);
  assert.equal(text.includes('[Content_Types].xml'), true);
  assert.equal(text.includes('xl/styles.xml'), true);
  assert.equal(text.includes('xl/worksheets/sheet1.xml'), true);
  assert.equal(text.includes('xl/worksheets/sheet2.xml'), true);
  assert.equal(text.includes('xl/worksheets/_rels/sheet1.xml.rels'), true);
  assert.equal(text.includes('Focus report'), true);
  assert.equal(text.includes('November 20, 2026'), true);
  assert.equal(text.includes('https://github.com/siderkit/siderkit-break'), true);
  assert.equal(text.includes('TargetMode="External"'), true);
  assert.match(text, /\d{2}:\d{2}:\d{2}/);
  assert.equal(text.includes('50 min'), true);
  assert.equal(text.includes('Countdown'), true);
  assert.equal(text.includes('<autoFilter ref="A10:F11"/>'), true);
  assert.equal(text.includes('showGridLines="0"'), true);
  // Summary metrics and table values share a right edge; labels stay left.
  assert.equal(text.includes('<alignment horizontal="right" vertical="center"/>'), true);
  assert.equal(text.includes('<c r="B6" s="5">'), true);
  assert.equal(text.includes('<c r="B11" s="19"><v>2</v></c>'), true);
  assert.equal(text.includes('<c r="C11" s="19"'), true);
  assert.equal(text.includes('<pane ySplit="4" topLeftCell="A5"'), true);
  assert.equal(text.includes('<pane ySplit="10" topLeftCell="A11"'), true);
  assert.equal(text.includes('<mergeCell ref="A1:F1"/>'), true);
  // Every sheet repeats the brand row, its link, and the print header.
  assert.equal(text.split('<hyperlink ref="A1"').length - 1, 2);
  assert.equal(text.split('<headerFooter>').length - 1, 2);
  assert.equal(text.includes('Siderkit Break · https://github.com/siderkit/siderkit-break'), true);
  assert.equal(text.includes('<oddHeader>&amp;LSiderkit Break'), true);
});

test('an empty history still produces a readable workbook', async () => {
  const workbook = await buildWorkbook(
    { days: [] },
    sampleRange,
    new Date('2026-11-20T12:00:00Z'),
    { compress: false },
  );
  const text = new TextDecoder().decode(workbook);
  assert.equal(text.includes('No sessions recorded yet.'), true);
  assert.equal(text.includes('<mergeCell ref="A11:F11"/>'), true);
});

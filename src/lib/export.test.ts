import assert from 'node:assert/strict';
import test from 'node:test';

import { bytesToBase64, exportFilename, fileNameOf, localStampKey } from './export.ts';
import { rangeFromDates } from './export-range.ts';

test('exportFilename carries the range and the local timestamp', () => {
  const range = rangeFromDates('2026-11-01', '2026-11-21');
  assert.ok(range);
  assert.equal(
    exportFilename(range, new Date(2026, 10, 21, 14, 30, 5)),
    'siderkit-break-20261101-20261121-20261121-1430.xlsx',
  );
});

test('exportFilename keeps a single-day range explicit', () => {
  const range = rangeFromDates('2026-11-21', '2026-11-21');
  assert.ok(range);
  assert.equal(
    exportFilename(range, new Date(2026, 10, 21, 9, 7, 4)),
    'siderkit-break-20261121-20261121-20261121-0907.xlsx',
  );
});

test('localStampKey uses local calendar fields down to the minute', () => {
  assert.equal(localStampKey(new Date(2026, 0, 2, 9, 7, 4)), '20260102-0907');
  assert.equal(localStampKey(new Date(2026, 10, 20, 23, 59, 59)), '20261120-2359');
});

test('fileNameOf reads Windows and Unix paths', () => {
  const expected = 'siderkit-break.xlsx';
  assert.equal(fileNameOf('C:\\Users\\me\\siderkit-break.xlsx'), expected);
  assert.equal(fileNameOf('/home/me/siderkit-break.xlsx'), expected);
  assert.equal(fileNameOf('siderkit-break.xlsx'), expected);
});

test('bytesToBase64 keeps the workbook bytes intact', () => {
  const bytes = new Uint8Array(40_000);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = index % 251;
  }
  const decoded = Uint8Array.from(Buffer.from(bytesToBase64(bytes), 'base64'));
  assert.deepEqual(decoded, bytes);
});

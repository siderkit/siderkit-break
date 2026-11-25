import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  XML_HEADER,
  cell,
  columns,
  columnName,
  escapeXml,
  row,
  sectionRow,
} from './xlsx-xml.util.ts';

test('escapeXml escapes markup, quotes and apostrophes', () => {
  assert.equal(escapeXml(`<a&"b'c>`), '&lt;a&amp;&quot;b&apos;c&gt;');
  assert.equal(escapeXml('plain text'), 'plain text');
});

test('columnName maps zero-based indexes to Excel letters', () => {
  assert.equal(columnName(0), 'A');
  assert.equal(columnName(8), 'I');
  assert.equal(columnName(25), 'Z');
  assert.equal(columnName(26), 'AA');
  assert.equal(columnName(27), 'AB');
  assert.equal(columnName(701), 'ZZ');
  assert.equal(columnName(702), 'AAA');
});

test('cell emits numbers as values and strings as inline text', () => {
  assert.equal(cell('A1', 5, 2), '<c r="A1" s="2"><v>5</v></c>');
  assert.equal(
    cell('B2', 'A&B', 0),
    '<c r="B2" s="0" t="inlineStr"><is><t xml:space="preserve">A&amp;B</t></is></c>',
  );
});

test('row numbers cells from column A and honours custom height', () => {
  assert.equal(
    row(1, ['Focus', 25], 1),
    '<row r="1"><c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Focus</t></is></c>' +
      '<c r="B1" s="1"><v>25</v></c></row>',
  );
  assert.ok(row(4, [1, 2], 0, 20).startsWith('<row r="4" ht="20" customHeight="1">'));
  assert.equal(row(5, [], 0), '<row r="5"></row>');
});

test('sectionRow renders one styled label cell at column A', () => {
  assert.equal(
    sectionRow(9, 'Totals', 24),
    '<row r="9" ht="24" customHeight="1">' +
      '<c r="A9" s="3" t="inlineStr"><is><t xml:space="preserve">Totals</t></is></c></row>',
  );
});

test('columns emits one custom-width column per entry', () => {
  assert.equal(
    columns([24, 12]),
    '<cols><col min="1" max="1" width="24" customWidth="1"/>' +
      '<col min="2" max="2" width="12" customWidth="1"/></cols>',
  );
});

test('column widths stay attached to their position', () => {
  const xml = columns([10, 20, 30]);
  assert.ok(xml.includes('<col min="3" max="3" width="30" customWidth="1"/>'));
  assert.ok(!xml.includes('width="undefined"'));
  assert.ok(XML_HEADER.length > 0);
});

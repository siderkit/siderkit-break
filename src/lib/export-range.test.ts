import assert from 'node:assert/strict';
import test from 'node:test';

import { formatRangeLabel, localDateKey, rangeForPreset, rangeFromDates } from './export-range.ts';

// 2026-11-18 is a Wednesday, so "this week" must start on Monday the 16th.
const WEDNESDAY = new Date(2026, 10, 18, 10, 30, 0);
const WEDNESDAY_KEY = '2026-11-18';
const MONDAY_KEY = '2026-11-16';
const MONTH_START = '2026-11-01';
const RANGE_END = '2026-11-21';
const YEAR_START = '2026-01-01';

test('today covers exactly one local calendar day', () => {
  const range = rangeForPreset('Today', WEDNESDAY);
  assert.equal(range.startDate, WEDNESDAY_KEY);
  assert.equal(range.endDate, WEDNESDAY_KEY);
  assert.equal(range.toMs, new Date(2026, 10, 19).getTime());
});

test('this week starts on Monday', () => {
  const range = rangeForPreset('ThisWeek', WEDNESDAY);
  assert.equal(range.startDate, MONDAY_KEY);
  assert.equal(range.endDate, WEDNESDAY_KEY);
});

test('this month and this year stop at today', () => {
  assert.equal(rangeForPreset('ThisMonth', WEDNESDAY).startDate, MONTH_START);
  assert.equal(rangeForPreset('ThisMonth', WEDNESDAY).endDate, WEDNESDAY_KEY);
  assert.equal(rangeForPreset('ThisYear', WEDNESDAY).startDate, YEAR_START);
  assert.equal(rangeForPreset('ThisYear', WEDNESDAY).endDate, WEDNESDAY_KEY);
});

test('custom ranges include the whole end day', () => {
  const range = rangeFromDates(MONTH_START, RANGE_END);
  assert.ok(range);
  assert.equal(range.toMs, new Date(2026, 10, 22).getTime());
});

test('invalid or reversed dates are rejected', () => {
  assert.equal(rangeFromDates(RANGE_END, MONTH_START), null);
  assert.equal(rangeFromDates('2026-02-30', '2026-03-01'), null);
  assert.equal(rangeFromDates('not-a-date', MONTH_START), null);
});

test('range labels are localized and readable', () => {
  const range = rangeFromDates(MONTH_START, RANGE_END);
  assert.ok(range);
  const label = formatRangeLabel(range, 'en');
  assert.match(label, /Nov/);
  assert.match(label, /2026/);
  const single = rangeFromDates(RANGE_END, RANGE_END);
  assert.ok(single);
  assert.match(formatRangeLabel(single, 'en'), /Nov 21, 2026/);
});

test('local keys use calendar fields', () => {
  assert.equal(localDateKey(WEDNESDAY), WEDNESDAY_KEY);
});

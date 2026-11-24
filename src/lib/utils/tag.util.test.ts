import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanTag } from './tag.util.ts';

test('cleanTag trims and collapses whitespace', () => {
  assert.equal(cleanTag('  deep   work  '), 'deep work');
  assert.equal(cleanTag('a\tb\nc'), 'a b c');
});

test('cleanTag keeps at most 40 Unicode scalars', () => {
  assert.equal(Array.from(cleanTag('x'.repeat(60))).length, 40);
  assert.equal(Array.from(cleanTag('🚀'.repeat(45))).length, 40);
});

test('cleanTag trims the tail after truncation', () => {
  const value = `${'a'.repeat(39)} b  `;
  assert.equal(cleanTag(value), 'a'.repeat(39));
});

test('cleanTag returns null for blank values', () => {
  assert.equal(cleanTag('   '), null);
  assert.equal(cleanTag('\t\n'), null);
});

test('cleanTag keeps single characters and emoji', () => {
  assert.equal(cleanTag('🚀'), '🚀');
  assert.equal(cleanTag('a'), 'a');
});

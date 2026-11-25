import assert from 'node:assert/strict';
import { test } from 'vitest';

import { cleanTag, TAG_MAX_CHARS } from './tag.util.ts';

test('cleanTag trims and collapses whitespace', () => {
  assert.equal(cleanTag('  deep   work  '), 'deep work');
  assert.equal(cleanTag('a\tb\nc'), 'a b c');
});

test('cleanTag keeps the full value; the cap lives in the tag input', () => {
  assert.equal(TAG_MAX_CHARS, 40);
  const long = 'x'.repeat(60);
  assert.equal(cleanTag(long), long);
  const emoji = '🚀'.repeat(45);
  assert.equal(cleanTag(emoji), emoji);
});

test('cleanTag returns null for blank values', () => {
  assert.equal(cleanTag('   '), null);
  assert.equal(cleanTag('\t\n'), null);
});

test('cleanTag keeps single characters and emoji', () => {
  assert.equal(cleanTag('🚀'), '🚀');
  assert.equal(cleanTag('a'), 'a');
});

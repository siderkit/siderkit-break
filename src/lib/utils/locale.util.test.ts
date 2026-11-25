import assert from 'node:assert/strict';
import { expect, test, vi } from 'vitest';

import {
  applyDocumentLocale,
  activeLocale,
  currentLocale,
  prepareLocale,
  switchLocale,
} from './locale.util.ts';
import {
  LOCALES,
  filterLocales,
  isLocale,
  localeDirection,
  localeMeta,
  normalizeLocale,
  systemLocale,
} from './locale.util.ts';

vi.mock('../../paraglide/runtime.js', () => ({
  getLocale: () => 'en',
  setLocale: vi.fn(async () => {}),
}));

test('normalizeLocale matches shipped tags case-insensitively', () => {
  assert.equal(normalizeLocale('en'), 'en');
  assert.equal(normalizeLocale('zh-cn'), 'zh-CN');
  assert.equal(normalizeLocale('pt'), 'pt');
});

test('normalizeLocale maps regional and script variants', () => {
  assert.equal(normalizeLocale('zh-Hans-CN'), 'zh-CN');
  assert.equal(normalizeLocale('zh-Hant-HK'), 'zh-TW');
  assert.equal(normalizeLocale('pt-BR'), 'pt');
  assert.equal(normalizeLocale('fil-PH'), 'fil');
  assert.equal(normalizeLocale('de-DE'), 'de');
});

test('normalizeLocale rejects unknown languages', () => {
  assert.equal(normalizeLocale('xx-YY'), null);
  assert.equal(normalizeLocale(''), null);
});

test('systemLocale picks the first supported system preference', () => {
  assert.equal(systemLocale(['xx-YY', 'ja-JP', 'en-US']), 'ja');
  assert.equal(systemLocale(['zh-Hant-TW']), 'zh-TW');
  assert.equal(systemLocale(['xx-YY']), 'en');
  assert.ok(isLocale(systemLocale([])));
});

test('every shipped locale passes the type guard', () => {
  for (const locale of LOCALES) {
    assert.ok(isLocale(locale.code));
    assert.equal(localeMeta(locale.code).code, locale.code);
  }
  assert.equal(isLocale('xx'), false);
});

test('RTL locales are marked for document direction', () => {
  assert.equal(localeDirection('ar'), 'rtl');
  assert.equal(localeDirection('ur'), 'rtl');
  assert.equal(localeDirection('fa'), 'rtl');
  assert.equal(localeDirection('en'), 'ltr');
  assert.equal(localeDirection('zh-CN'), 'ltr');
});

test('language search matches native name, English name, and code', () => {
  assert.deepEqual(
    filterLocales('日本').map((locale) => locale.code),
    ['ja'],
  );
  assert.deepEqual(
    filterLocales('german').map((locale) => locale.code),
    ['de'],
  );
  assert.deepEqual(
    filterLocales('zh-tw').map((locale) => locale.code),
    ['zh-TW'],
  );
  assert.equal(filterLocales('').length, LOCALES.length);
  assert.equal(filterLocales('zzzz').length, 0);
});

test('currentLocale resolves the paraglide locale', () => {
  assert.equal(currentLocale(), 'en');
});

test('activeLocale prefers the override and then the document', () => {
  assert.equal(activeLocale('zh-TW'), 'zh-TW');
  document.documentElement.lang = 'fr';
  assert.equal(activeLocale(), 'fr');
  assert.equal(activeLocale('en'), 'en');
});

test('applyDocumentLocale stamps language and direction', () => {
  applyDocumentLocale('ar');
  assert.equal(document.documentElement.lang, 'ar');
  assert.equal(document.documentElement.dir, 'rtl');
  assert.equal(document.documentElement.dataset.locale, 'ar');
  applyDocumentLocale('en');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(document.documentElement.dir, 'ltr');
});

test('prepareLocale sets paraglide without reloading', async () => {
  const runtime = await import('../../paraglide/runtime.js');
  await prepareLocale('zh-TW');
  expect(runtime.setLocale).toHaveBeenCalledWith('zh-TW', { reload: false });
  assert.equal(document.documentElement.lang, 'zh-TW');
});

test('switchLocale applies immediately and asks paraglide to reload', async () => {
  const runtime = await import('../../paraglide/runtime.js');
  switchLocale('de');
  expect(runtime.setLocale).toHaveBeenCalledWith('de');
  assert.equal(document.documentElement.lang, 'de');
});

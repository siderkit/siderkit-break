#!/usr/bin/env node
// Token gate for Siderkit Break (ADR-0028 semantics, local single source).
//
//   1. Raw color and length literals are forbidden outside tokens.css.
//      @media breakpoint values are the one allowed exception.
//   2. var(--sk-x, <literal>) fallbacks are forbidden.
//   3. Every referenced token must be defined in src/styles/tokens.css.
//   4. --sk-* definitions live in tokens.css only.
//   5. Dead tokens fail: zero references means the token is deleted.
//   6. Width breakpoints are the closed set 639 / 767 / 1023 / 1279.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const TOKENS_FILE = join(SRC, 'styles', 'tokens.css');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'paraglide', '.git']);
const BREAKPOINTS = new Set(['639', '767', '1023', '1279']);
const LENGTH_UNITS = new Set([
  'px',
  'rem',
  'em',
  'vh',
  'vw',
  'vmin',
  'vmax',
  'pt',
  'cm',
  'mm',
  'in',
]);
const COLOR_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla']);
const TOKEN_PREFIX = '--sk-';
const problems = [];

function walk(directory) {
  const out = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(svelte|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function styleText(text, file) {
  if (file.endsWith('.css')) return text;
  return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n');
}

function skipSpaces(source, index) {
  let cursor = index;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  return cursor;
}

function readToken(source, index) {
  let end = index + TOKEN_PREFIX.length;
  while (end < source.length && /[a-z0-9-]/.test(source[end])) end += 1;
  return { name: source.slice(index, end), end };
}

function isValidTokenName(name) {
  const segments = name.slice(TOKEN_PREFIX.length).split('-');
  return segments.every((segment) => /^[a-z0-9]+$/.test(segment));
}

/** Finds `var(--sk-x)` references plus whether they carry a literal fallback. */
function tokenReferences(source) {
  const references = [];
  let index = source.indexOf('var(');
  while (index !== -1) {
    const start = skipSpaces(source, index + 4);
    if (source.startsWith(TOKEN_PREFIX, start)) {
      const { name, end } = readToken(source, start);
      if (isValidTokenName(name)) {
        references.push({ name, hasFallback: source[skipSpaces(source, end)] === ',' });
      }
    }
    index = source.indexOf('var(', index + 4);
  }
  return references;
}

/** Finds `--sk-x:` definitions so they can be rejected outside tokens.css. */
function tokenDefinitions(source) {
  const definitions = [];
  let index = source.indexOf(TOKEN_PREFIX);
  while (index !== -1) {
    const { name, end } = readToken(source, index);
    if (isValidTokenName(name) && source[skipSpaces(source, end)] === ':') {
      definitions.push(name);
    }
    index = source.indexOf(TOKEN_PREFIX, index + TOKEN_PREFIX.length);
  }
  return definitions;
}

function isDigit(char) {
  return char >= '0' && char <= '9';
}

function isLetter(char) {
  const lower = char.toLowerCase();
  return lower >= 'a' && lower <= 'z';
}

function rawLengths(source) {
  const hits = [];
  let index = 0;
  while (index < source.length) {
    if (!isDigit(source[index])) {
      index += 1;
      continue;
    }
    let numberEnd = index + 1;
    while (numberEnd < source.length && (isDigit(source[numberEnd]) || source[numberEnd] === '.')) {
      numberEnd += 1;
    }
    const number = source.slice(index, numberEnd);
    let unitEnd = numberEnd;
    while (unitEnd < source.length && isLetter(source[unitEnd])) unitEnd += 1;
    const unit = source.slice(numberEnd, unitEnd);
    if (LENGTH_UNITS.has(unit.toLowerCase())) hits.push(number + unit);
    index = Math.max(numberEnd, unitEnd);
  }
  return hits;
}

function rawColorFunctions(source) {
  const hits = [];
  for (const match of source.matchAll(/\b([a-z]+)\(/gi)) {
    const name = match[1].toLowerCase();
    if (!COLOR_FUNCTIONS.has(name)) continue;
    const rest = source.slice(match.index + match[0].length).trimStart();
    if (!rest.startsWith('var(')) hits.push(`${name}(`);
  }
  return hits;
}

/** Removes @media conditions so their breakpoint values are not raw lengths. */
function withoutMediaQueries(css) {
  let result = '';
  let cursor = 0;
  let index = css.indexOf('@media');
  while (index !== -1) {
    let end = index + '@media'.length;
    while (end < css.length && css[end] !== '{') end += 1;
    result += `${css.slice(cursor, index)} `;
    cursor = end;
    index = css.indexOf('@media', end);
  }
  return result + css.slice(cursor);
}

function mediaQueries(css) {
  const queries = [];
  let index = css.indexOf('@media');
  while (index !== -1) {
    let end = index + '@media'.length;
    while (end < css.length && css[end] !== '{') end += 1;
    queries.push(css.slice(index, end));
    index = css.indexOf('@media', end);
  }
  return queries;
}

function breakpoints(css) {
  const values = [];
  for (const query of mediaQueries(css)) {
    const marker = 'max-width';
    const at = query.indexOf(marker);
    if (at === -1) continue;
    const rest = query.slice(at + marker.length).trimStart();
    if (!rest.startsWith(':')) continue;
    const digits = /^\d+/.exec(rest.slice(1).trimStart());
    if (digits) values.push(digits[0]);
  }
  return values;
}

const tokensSource = stripComments(readFileSync(TOKENS_FILE, 'utf8'));
const defined = new Map();
// A token may be declared again in [data-theme='Dark']; that is a repaint,
// not a duplicate, so the same name is counted once and overrides keep working.
for (const name of tokenDefinitions(tokensSource)) {
  defined.set(name, 0);
}
if (defined.size === 0) {
  problems.push('src/styles/tokens.css: no tokens found');
}

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const text = stripComments(readFileSync(file, 'utf8'));
  const style = styleText(text, file);
  const css = withoutMediaQueries(style);

  for (const { name, hasFallback } of tokenReferences(text)) {
    if (!defined.has(name)) {
      problems.push(`${rel}: ${name} is referenced but not defined in tokens.css`);
    } else {
      defined.set(name, defined.get(name) + 1);
    }
    if (hasFallback) {
      problems.push(`${rel}: ${name} uses a literal fallback; define the token instead`);
    }
  }

  if (file === TOKENS_FILE) continue;

  for (const name of tokenDefinitions(text)) {
    problems.push(`${rel}: ${name} is defined outside tokens.css`);
  }

  for (const value of rawLengths(css)) {
    problems.push(`${rel}: raw length value "${value}" — use a --sk-* token`);
  }
  for (const match of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    problems.push(`${rel}: raw color value "${match[0]}" — use a --sk-* token`);
  }
  for (const value of rawColorFunctions(css)) {
    problems.push(`${rel}: raw color value "${value}" — use a --sk-* token`);
  }
  for (const value of breakpoints(style)) {
    if (!BREAKPOINTS.has(value)) {
      problems.push(`${rel}: breakpoint ${value}px is outside the closed set`);
    }
  }
}

for (const [name, uses] of defined) {
  if (uses === 0) {
    problems.push(`src/styles/tokens.css: ${name} is never referenced — delete it`);
  }
}

if (problems.length > 0) {
  console.error(`check:tokens failed with ${problems.length} problem(s):\n`);
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`check:tokens passed (${defined.size} tokens, single source, zero dead tokens)`);

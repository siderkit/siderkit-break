#!/usr/bin/env node
// CSS namespace gate for Siderkit Break.
//
// Rules (aligned with 0150-frontend-code-standard + ADR-0021):
//   1. App-scoped <style> may only define l-* blocks/elements/modifiers and
//      is-* state classes. sk-* belongs to a shared design-system package.
//   2. l-* and is-* names must match BEM shape; full words only.
//   3. Global .css files must not define classes at all; classes live in the
//      owning .svelte scoped <style> and get the compile-time hash.
//   4. App <style> must not use :global() with a class, which would bypass the
//      scoped hash and reintroduce global collisions.
//   5. Every l-* class used in markup must be defined in the same file.
//   6. Every l-* class defined in a file must be used in that file; dynamic
//      prefix classes such as l-button--{variant} count as a prefix claim.
//   7. One class may only be defined in one file.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'paraglide', '.git']);
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BANNED_SEGMENTS = new Set([
  'nav',
  'btn',
  'msg',
  'info',
  'cat',
  'comp',
  'el',
  'mod',
  'cont',
  'wrap',
  'hdr',
  'ftr',
]);
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

const files = walk(SRC);
const svelteFiles = files.filter((file) => file.endsWith('.svelte'));
const cssFiles = files.filter((file) => file.endsWith('.css'));

/**
 * Validates `prefix + block + optional __element + optional --modifier`
 * without a single mega-regex, so each part can be reported precisely.
 */
function isBemName(name, prefix) {
  if (!name.startsWith(prefix)) return false;
  const [base, modifier, ...extraParts] = name.slice(prefix.length).split('--');
  if (extraParts.length > 0) return false;
  const elements = base.split('__');
  if (elements.length > 2) return false;
  if (modifier !== undefined && !SEGMENT.test(modifier)) return false;
  return elements.every((part) => SEGMENT.test(part));
}

function checkName(name, where) {
  const prefix = name.startsWith('is-') ? 'is-' : 'l-';
  if (!isBemName(name, prefix)) {
    problems.push(`${where}: "${name}" is not a valid ${prefix} BEM name`);
    return;
  }
  const segments = name
    .slice(name.indexOf('-') + 1)
    .split(/__|--|-/)
    .filter(Boolean);
  for (const segment of segments) {
    if (BANNED_SEGMENTS.has(segment)) {
      problems.push(`${where}: "${name}" uses the abbreviation "${segment}"`);
    }
  }
}

function classNames(css) {
  return [...css.matchAll(/\.([a-z][a-z0-9_-]*)/g)].map((match) => match[1]);
}

/** Returns the selector text of every top-level CSS rule. */
function topLevelSelectors(css) {
  const selectors = [];
  let depth = 0;
  let buffer = '';
  for (const char of css) {
    if (char === '{') {
      if (depth === 0) selectors.push(...buffer.split(','));
      depth += 1;
      buffer = '';
    } else if (char === '}') {
      depth = Math.max(0, depth - 1);
      buffer = '';
    } else if (depth === 0) {
      buffer += char;
    }
  }
  return selectors;
}

/** Returns the class selectors of a global stylesheet. */
function globalClassSelectors(css) {
  return topLevelSelectors(css)
    .map((selector) => selector.trim())
    .filter((selector) => /^\.[a-zA-Z_-]/.test(selector));
}

const owners = new Map();

for (const file of svelteFiles) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const styleBlocks = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
    (match) => match[1],
  );
  const styleText = styleBlocks.join('\n');
  const defined = new Set();

  if (/:global\(\s*\./.test(styleText)) {
    problems.push(`${rel}: app <style> must not use :global() with a class`);
  }

  for (const name of classNames(styleText)) {
    if (name.startsWith('sk-')) {
      problems.push(`${rel}: app scoped <style> must not define public .${name}`);
      continue;
    }
    if (!name.startsWith('l-') && !name.startsWith('is-')) {
      problems.push(`${rel}: .${name} is neither l-* nor is-*`);
      continue;
    }
    checkName(name, rel);
    defined.add(name);
    if (name.startsWith('l-')) {
      if (!owners.has(name)) owners.set(name, new Set());
      owners.get(name).add(rel);
    }
  }

  const markup = text.replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
  const used = new Set();
  const dynamicPrefixes = new Set();

  for (const match of markup.matchAll(/class=(?:"([^"]*)"|'([^']*)')/g)) {
    const value = (match[1] ?? match[2] ?? '').replace(/\{[^{}]*\}/g, ' ');
    for (const token of value.split(/\s+/)) {
      if (!token) continue;
      if (token.endsWith('--') || token.endsWith('__')) {
        dynamicPrefixes.add(token);
        continue;
      }
      if (token.includes('{') || token.includes('}')) continue;
      if (!token.startsWith('l-') && !token.startsWith('is-')) {
        problems.push(`${rel}: class "${token}" is neither l-* nor is-*`);
        continue;
      }
      checkName(token, rel);
      used.add(token);
    }
  }

  for (const match of markup.matchAll(/class:([a-z0-9-]+)=/g)) {
    const token = match[1];
    if (!token.startsWith('l-') && !token.startsWith('is-')) {
      problems.push(`${rel}: class:${token} is neither l-* nor is-*`);
      continue;
    }
    checkName(token, rel);
    used.add(token);
  }

  for (const name of used) {
    if (!defined.has(name)) {
      problems.push(`${rel}: uses .${name} but does not define it in this file`);
    }
  }

  for (const name of defined) {
    if (!name.startsWith('l-')) continue;
    const claimed = [...dynamicPrefixes].some((prefix) => name.startsWith(prefix));
    if (!used.has(name) && !claimed) {
      problems.push(`${rel}: defines .${name} but never uses it in this file`);
    }
  }
}

for (const [name, fileSet] of owners) {
  if (fileSet.size > 1) {
    problems.push(`.${name} is defined in more than one file:\n  ${[...fileSet].join('\n  ')}`);
  }
}

for (const file of cssFiles) {
  if (file.endsWith('tokens.css')) continue;
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const selector of globalClassSelectors(css)) {
    problems.push(`${rel}: global css must not define class selectors (${selector})`);
  }
}

if (problems.length > 0) {
  console.error(`check:css failed with ${problems.length} problem(s):\n`);
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(
  `check:css passed (${svelteFiles.length} components, ${owners.size} scoped classes, one owner per class)`,
);

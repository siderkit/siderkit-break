#!/usr/bin/env node
/**
 * Interaction feedback gate.
 *
 * Every raw <button> must ship a hover state, press feedback must never resize
 * the control, and the shared ripple must be installed for every window. The
 * checks stay heuristic on purpose: they catch a missing state without forcing
 * a particular visual treatment.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';
const errors = [];
let components = 0;
let rawButtons = 0;

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function styleBlock(source) {
  const start = source.indexOf('<style>');
  const end = source.lastIndexOf('</style>');
  return start >= 0 && end > start ? source.slice(start, end) : '';
}

function markupBlock(source) {
  const start = source.indexOf('<style>');
  return start >= 0 ? source.slice(0, start) : source;
}

function activeRules(style) {
  const rules = [];
  let index = style.indexOf(':active');
  while (index >= 0) {
    const open = style.indexOf('{', index);
    const close = style.indexOf('}', open + 1);
    if (open < 0 || close < 0) {
      break;
    }
    const start = Math.max(style.lastIndexOf('}', index), style.lastIndexOf('{', index)) + 1;
    rules.push({
      selector: style.slice(start, open).trim().replace(/\s+/g, ' '),
      declarations: style.slice(open + 1, close),
    });
    index = style.indexOf(':active', close);
  }
  return rules;
}

for (const file of walk(SRC).filter((path) => path.endsWith('.svelte'))) {
  components += 1;
  const source = readFileSync(file, 'utf8');
  const style = styleBlock(source);
  const markup = markupBlock(source);

  if (/<button[\s>]/.test(markup)) {
    rawButtons += 1;
    if (!/:hover/.test(style)) {
      errors.push(`${file}: raw <button> has no :hover state`);
    }
  }

  for (const rule of activeRules(style)) {
    if (/transform\s*:[^;]*scale\(/.test(rule.declarations)) {
      errors.push(`${file}: press state scales the control (${rule.selector})`);
    }
  }
}

const appCss = readFileSync('src/app.css', 'utf8');
if (!/button:not\(:disabled\):active\s*\{[^}]*filter:\s*brightness/.test(appCss)) {
  errors.push('src/app.css: missing the shared non-scaling button press state');
}

const bootstrap = readFileSync('src/lib/app/bootstrap.ts', 'utf8');
if (!bootstrap.includes('installRipple()')) {
  errors.push('src/lib/app/bootstrap.ts: installRipple() is not installed');
}

const ripple = readFileSync('src/lib/utils/ripple.util.ts', 'utf8');
if (!ripple.includes('prefers-reduced-motion')) {
  errors.push('src/lib/utils/ripple.util.ts: reduced-motion preference is not respected');
}

if (errors.length > 0) {
  console.error('check:interaction failed');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `check:interaction passed (${components} components, ${rawButtons} raw buttons, no press scaling)`,
);

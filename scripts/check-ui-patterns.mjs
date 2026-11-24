#!/usr/bin/env node
/**
 * UI composition gate for the Siderkit product line.
 *
 * Repeated UI patterns must be owned by one shared component. This gate keeps
 * the two patterns that drifted worst under control:
 *
 *   1. Dialog / form action rows: every dialog with action buttons renders
 *      them through <ActionBar> (left aligned, small buttons, automatic close)
 *      instead of growing a local `__actions` row.
 *   2. Settings cells: padding, dividers, hit area and hover chrome live only
 *      in <SettingsCell>; row/toggle/field/slider components style inner
 *      content only, and pages render cells directly.
 *
 * The checks are source-level on purpose: cheap, deterministic and independent
 * of the component that happens to compile the CSS.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'src';
const errors = [];
let files = 0;
let dialogs = 0;
let settingsPages = 0;

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

function report(file, message) {
  errors.push(`${relative(process.cwd(), file)}: ${message}`);
}

for (const file of walk(SRC).filter((path) => path.endsWith('.svelte'))) {
  files += 1;
  const source = readFileSync(file, 'utf8');
  const style = styleBlock(source);

  if (/<dialog[\s>]/.test(source)) {
    dialogs += 1;
    if (/\bl-[\w-]+__actions\b/.test(source)) {
      report(file, 'dialog defines a local action row; render buttons through ActionBar');
    }
    const hasActionButtons = /<Button[\s>]/.test(source) || /<button[\s>]/.test(source);
    if (hasActionButtons && !/<ActionBar[\s>]/.test(source)) {
      report(file, 'dialog action buttons must be wrapped in ActionBar');
    }
  }

  if (/settings[\\/][\w-]+Page\.svelte$/.test(file)) {
    settingsPages += 1;
    if (/\bl-[\w-]+__rows\b/.test(source)) {
      report(file, 'settings page wraps cells in a local __rows block; render cells directly');
    }
  }

  if (!file.endsWith('SettingsCell.svelte')) {
    for (const token of ['--sk-settings-cell-height', '--sk-settings-cell-pad']) {
      if (source.includes(token)) {
        report(file, `${token} is owned by SettingsCell; do not redeclare cell chrome`);
      }
    }
  }

  if (
    file.endsWith('SettingsPanel.svelte') === false &&
    source.includes('--sk-settings-page-inset')
  ) {
    report(
      file,
      '--sk-settings-page-inset is owned by SettingsPanel; pages must not add top padding',
    );
  }

  if (/Settings(Row|Toggle|Field|Slider)\.svelte$/.test(file)) {
    for (const chunk of style.split('}')) {
      const open = chunk.lastIndexOf('{');
      if (open < 0) {
        continue;
      }
      const selector = chunk.slice(0, open).trim().replace(/\s+/g, ' ');
      if (!/^\.l-settings-(row|toggle|field|slider)$/.test(selector)) {
        continue;
      }
      if (/(^|[;\s])(padding|min-block-size|border-block-start|background)\s*:/.test(chunk)) {
        report(file, `${selector} redefines cell chrome; move it to SettingsCell`);
      }
    }
  }

  if (/<ActionBar[\s>]/.test(source)) {
    for (const match of source.matchAll(/<Button\b[^>]*>/gs)) {
      if (!/\bsize="Sm"/.test(match[0])) {
        report(file, 'buttons inside ActionBar must use size="Sm"');
      }
    }
  }

  for (const match of source.matchAll(/\bclass:[\w-]+/g)) {
    const after = source.slice((match.index ?? 0) + match[0].length);
    if (!/^\s*=/.test(after)) {
      report(file, `${match[0]} is a shorthand directive; pass an explicit boolean value`);
    }
  }
}

if (errors.length > 0) {
  console.error('check:ui-patterns failed');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `check:ui-patterns passed (${files} components, ${dialogs} dialogs, ${settingsPages} settings pages)`,
);

#!/usr/bin/env node
/**
 * Source structure gate.
 *
 * `src/lib` is layered; every file lives in the layer that owns it:
 *
 *   app/        window entries and bootstrap
 *   components/ UI components (+ co-located *.model.ts contracts)
 *   ipc/        the only bridge to Tauri commands and events
 *   state/      cross-component reactive stores (*.store.svelte.ts)
 *   ui/         shared presentational primitives (*.svelte)
 *   utils/      pure helpers (*.util.ts), one domain folder at most
 *
 * Lower layers must not reach upward: utils never import state, components
 * or app; state never imports components or app; ui never imports
 * components, state or app; components never import app.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

const LIB = 'src/lib';
const LAYERS = ['app', 'components', 'ipc', 'state', 'ui', 'utils'];
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const errors = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function layerOf(file) {
  const first = relative(LIB, file).split(/[\\/]/)[0];
  return LAYERS.includes(first) ? first : null;
}

const files = walk(LIB);

for (const entry of readdirSync(LIB, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    if (!LAYERS.includes(entry.name)) {
      errors.push(`src/lib/${entry.name}: unknown layer directory`);
    }
    continue;
  }
  errors.push(`src/lib/${entry.name}: files are not allowed at the lib root; move into a layer`);
}

const byLayer = new Map(LAYERS.map((layer) => [layer, []]));
for (const file of files) {
  const layer = layerOf(file);
  if (!layer) {
    errors.push(`${file}: outside the known layers`);
    continue;
  }
  byLayer.get(layer).push(file);
}

for (const file of byLayer.get('app')) {
  const name = relative(join(LIB, 'app'), file).split(/[\\/]/).pop();
  if (name !== 'bootstrap.ts' && !name.endsWith('.svelte')) {
    errors.push(`${file}: app/ allows bootstrap.ts and *.svelte entries only`);
  }
}

for (const file of byLayer.get('state')) {
  if (!/\.store\.svelte\.(ts|test\.ts)$/.test(file)) {
    errors.push(`${file}: state/ files must be *.store.svelte.ts`);
  }
}

for (const file of byLayer.get('ui')) {
  if (!file.endsWith('.svelte')) {
    errors.push(`${file}: ui/ allows *.svelte primitives only`);
  }
}

for (const file of byLayer.get('components')) {
  if (!file.endsWith('.svelte') && !/\.model\.(ts|test\.ts)$/.test(file)) {
    errors.push(`${file}: components/ allows *.svelte and *.model.ts only`);
  }
}

for (const file of byLayer.get('utils')) {
  const rel = relative(LIB, file);
  const segments = rel.split(/[\\/]/);
  if (segments.length > 3) {
    errors.push(`${file}: utils/ allows at most one domain folder`);
  }
  for (const segment of segments.slice(1, -1)) {
    if (!SEGMENT.test(segment)) {
      errors.push(`${file}: folder '${segment}' must be lowercase kebab-case`);
    }
  }
  if (!/\.util\.(ts|test\.ts)$/.test(file)) {
    errors.push(`${file}: utils/ files must be *.util.ts`);
  }
  // Node's test runner executes utils directly under ESM, which requires
  // explicit extensions on every relative import (paraglide emits .js).
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
    if (!/\.(ts|js|svelte)$/.test(match[1])) {
      errors.push(`${file}: utils/ relative imports need an explicit extension ('${match[1]}')`);
    }
  }
}

const UP = new Map([
  ['utils', ['components', 'state', 'ui', 'app']],
  ['ui', ['components', 'state', 'app']],
  ['state', ['components', 'ui', 'app']],
  ['components', ['app']],
]);

const importPattern = /(?:from|import)\s+['"](\.[^'"]+)['"]/g;
for (const [layer, forbidden] of UP) {
  for (const file of byLayer.get(layer)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const base = resolve(dirname(file), match[1]);
      const candidates = [base, `${base}.ts`, `${base}.js`];
      const target = candidates.find((candidate) => {
        try {
          return statSync(candidate).isFile();
        } catch {
          return false;
        }
      });
      if (!target) {
        continue;
      }
      const targetLayer = layerOf(target);
      if (targetLayer && forbidden.includes(targetLayer)) {
        errors.push(
          `${file}: ${layer}/ must not import ${targetLayer}/ (${relative(LIB, target)})`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error('check:structure failed');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const counts = LAYERS.map((layer) => `${layer} ${byLayer.get(layer).length}`).join(', ');
console.log(`check:structure passed (${counts})`);

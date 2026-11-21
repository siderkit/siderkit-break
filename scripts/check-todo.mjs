import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? '.';
const skipDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.svelte-kit',
  '.vite',
  'target',
  'gen',
]);
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.svelte', '.rs']);
const marker = /\b(TODO|FIXME|XXX)\b(?!\s*\()/g;
const self = path.resolve(import.meta.filename);
const errors = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (path.resolve(full) === self) continue;
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!extensions.has(path.extname(entry.name))) continue;
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      marker.lastIndex = 0;
      if (marker.test(line)) {
        errors.push(`${full}:${index + 1}: ownerless TODO/FIXME/XXX`);
      }
    });
  }
}

walk(root);

if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\ncheck:todo failed: ${errors.length} occurrence(s).`);
  console.error('Use TODO(#issue): ... or FIXME(#issue): ...');
  process.exit(1);
}

console.log(`check:todo passed: ${root}`);

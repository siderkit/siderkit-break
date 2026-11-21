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
  'paraglide',
]);
const limits = new Map([
  ['.ts', 400],
  ['.svelte', 300],
  ['.rs', 500],
]);
const testLimit = 600;
const errors = [];

function isTestFile(file) {
  return /\.(test|spec)\.[^.]+$/.test(file);
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const extension = path.extname(entry.name);
    const limit = limits.get(extension);
    if (limit === undefined) continue;
    const effectiveLimit = isTestFile(entry.name) ? testLimit : limit;
    const lineCount = fs.readFileSync(full, 'utf8').split(/\r?\n/).length;
    if (lineCount > effectiveLimit) {
      errors.push(`${full}: ${lineCount} lines (limit ${effectiveLimit})`);
    }
  }
}

walk(root);

if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\ncheck:file-size failed: ${errors.length} file(s).`);
  process.exit(1);
}

console.log(`check:file-size passed: ${root}`);

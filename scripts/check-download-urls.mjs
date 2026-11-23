#!/usr/bin/env node
// Enforces the download-host URL contract.
//
// dl.siderkit.com serves every product, so the first path segment is always
// the product slug. A URL such as https://dl.siderkit.com/latest.json or
// .../releases/1.0.0/file is a regression: it silently claims the whole host
// for one product.
//
// Legacy aliases are allowed only on a line that also marks them as legacy,
// deprecated, or a 302 redirect, so the compatibility table stays documented
// without letting the old shape back into code.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const TARGETS = [
  '.github/workflows',
  'docs',
  'infra',
  'scripts',
  'src-tauri',
  'CHANGELOG.md',
  'PRIVACY.md',
  'README.md',
];
const SKIP_DIRS = new Set(['node_modules', 'target', 'dist', '.git']);
const EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.json',
  '.jsonc',
  '.rs',
  '.ts',
  '.mjs',
  '.js',
  '.toml',
  '.yml',
  '.yaml',
]);
const HOST = 'https://dl.siderkit.com';
const URL_PATTERN = /https:\/\/dl\.siderkit\.com[^\s"'`)<>,]*/g;
const PRODUCT_PATH = /^\/[a-z0-9][a-z0-9-]*\//;
const LEGACY_HINT = /legacy|deprecated|302/i;
const TRAILING_CHARS = new Set(['.', ',', ';', ':', '。', '；', '：', '）', ')', '】']);

function trimTrailing(value) {
  let end = value.length;
  while (end > 0 && TRAILING_CHARS.has(value[end - 1])) {
    end -= 1;
  }
  return value.slice(0, end);
}

function* walk(entry) {
  const stats = fs.statSync(entry);
  if (stats.isFile()) {
    yield entry;
    return;
  }
  for (const child of fs.readdirSync(entry, { withFileTypes: true })) {
    if (SKIP_DIRS.has(child.name)) continue;
    yield* walk(path.join(entry, child.name));
  }
}

const problems = [];
let checked = 0;

for (const target of TARGETS) {
  const absolute = path.join(ROOT, target);
  if (!fs.existsSync(absolute)) continue;
  for (const file of walk(absolute)) {
    if (path.resolve(file) === path.resolve(process.argv[1] ?? '')) continue;
    if (!EXTENSIONS.has(path.extname(file))) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const match of line.match(URL_PATTERN) ?? []) {
        const url = trimTrailing(match);
        const rest = url.slice(HOST.length);
        checked += 1;
        if (rest === '' || rest === '/' || rest === '/health') continue;
        if (rest.startsWith('/<product')) continue;
        if (PRODUCT_PATH.test(rest)) continue;
        if (LEGACY_HINT.test(line)) continue;
        problems.push({ file: path.relative(ROOT, file), line: index + 1, url });
      }
    });
  }
}

if (problems.length > 0) {
  console.error('download-urls: URLs must be product-scoped:');
  for (const problem of problems) {
    console.error(`  ${problem.file}:${problem.line}  ${problem.url}`);
  }
  console.error(
    `\nExpected ${HOST}/<product>/..., for example ${HOST}/siderkit-break/latest.json.`,
  );
  process.exit(1);
}

console.log(`download-urls: ok (${checked} URLs)`);

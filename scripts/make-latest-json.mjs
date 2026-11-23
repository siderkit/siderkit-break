#!/usr/bin/env node
// Builds a Tauri updater manifest for one platform.
//
// The updater fetches `latest.json`, compares its version with the running app,
// then downloads the installer URL and verifies it against the minisign
// signature. This script only assembles that document; signing stays in the
// Tauri build, which writes the `.sig` file next to the installer.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const USAGE = `Usage:
  node scripts/make-latest-json.mjs \\
    --version 1.0.0 \\
    --installer path/to/installer.exe \\
    --signature path/to/installer.exe.sig \\
    --url https://dl.siderkit.com/siderkit-break/releases/1.0.0/installer.exe \\
    [--platform windows-x86_64] [--notes text | --notes-file file] \\
    [--pub-date 2026-11-23T12:00:00Z] [--out latest.json]`;

function parseArgs(argv) {
  const options = { platform: 'windows-x86_64', out: 'latest.json' };
  const valued = new Set([
    'version',
    'installer',
    'signature',
    'url',
    'platform',
    'notes',
    'notes-file',
    'pub-date',
    'out',
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
    if (!argument.startsWith('--')) {
      throw new Error(`unexpected argument: ${argument}`);
    }
    const name = argument.slice(2);
    if (!valued.has(name)) {
      throw new Error(`unknown option: ${argument}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${argument}`);
    }
    options[name] = value;
    index += 1;
  }
  return options;
}

function required(options, name) {
  const value = options[name];
  if (!value) {
    throw new Error(`missing --${name}`);
  }
  return value;
}

function readSignature(file) {
  const signature = fs.readFileSync(file, 'utf8').trim();
  if (!signature || !/^[A-Za-z0-9+/=\r\n]+$/.test(signature)) {
    throw new Error(`${file} is not a base64-encoded minisign signature`);
  }
  const decoded = Buffer.from(signature, 'base64').toString('utf8');
  if (!decoded.includes('untrusted comment:')) {
    throw new Error(`${file} does not decode to a minisign signature`);
  }
  return signature;
}

function readNotes(options) {
  if (options.notes && options['notes-file']) {
    throw new Error('use either --notes or --notes-file, not both');
  }
  if (options['notes-file']) {
    return fs.readFileSync(options['notes-file'], 'utf8').trim();
  }
  return options.notes?.trim() ?? '';
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const version = required(options, 'version');
  const installer = required(options, 'installer');
  const signatureFile = required(options, 'signature');
  const url = required(options, 'url');

  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`--version is not a semantic version: ${version}`);
  }
  if (!fs.existsSync(installer)) {
    throw new Error(`installer does not exist: ${installer}`);
  }
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new Error(`--url must be https: ${url}`);
  }

  const manifest = {
    version,
    notes: readNotes(options),
    pub_date: options['pub-date'] ?? new Date().toISOString(),
    platforms: {
      [options.platform]: {
        signature: readSignature(signatureFile),
        url,
      },
    },
  };

  const target = path.resolve(options.out);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${target} for ${version} (${options.platform})`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(USAGE);
  process.exit(1);
}

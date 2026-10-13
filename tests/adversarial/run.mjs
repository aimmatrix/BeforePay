#!/usr/bin/env node
/**
 * S2 runner. CORE's package.json test glob is tests/*.test.cjs only.
 * S2 does not edit that file. Invoke: node tests/adversarial/run.mjs
 */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const files = readdirSync(here)
  .filter((name) => name.endsWith('.test.mjs'))
  .map((name) => join('tests/adversarial', name));

if (files.length === 0) {
  console.error('No tests/adversarial/*.test.mjs files found');
  process.exit(1);
}

const child = spawn(process.execPath, ['--test', '--test-reporter=spec', ...files], {
  cwd: root,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 1));

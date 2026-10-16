#!/usr/bin/env node
// Validates and builds every episode in content/ into dist/ (used locally and by Vercel).
// Usage: node scripts/build-all.mjs
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const episodes = readdirSync(resolve(root, 'content')).filter(f => /^S\d\dE\d\d\.json$/.test(f)).sort();
for (const ep of episodes) {
  const src = resolve(root, 'content', ep);
  execFileSync(process.execPath, [resolve(root, 'scripts/validate.mjs'), src], { stdio: 'inherit' });
  execFileSync(process.execPath, [resolve(root, 'scripts/build.mjs'), src], { stdio: 'inherit' });
}
console.log(`Built ${episodes.length} episode(s).`);

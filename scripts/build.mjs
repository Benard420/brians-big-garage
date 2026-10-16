#!/usr/bin/env node
// Injects an episode JSON into the reader engine to produce one offline, self-contained HTML file.
// Usage: node scripts/build.mjs content/S01E01.json [engine/template.html] [dist/S01E01.html]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const defaultTpl = ['../engine/template.html', '../assets/template.html'].map(p => resolve(here, p)).find(existsSync);
const [src, tplArg, out] = process.argv.slice(2);
const tpl = tplArg || defaultTpl;
if (!src) { console.error('Usage: node build.mjs <episode.json> [template.html] [out.html]'); process.exit(2); }

const ep = JSON.parse(readFileSync(src, 'utf8'));
// Escape "</" so story text can never close the data <script> tag (no untrusted scripts in story data).
const data = JSON.stringify(ep).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
const html = readFileSync(tpl, 'utf8');
if (!html.includes('/*EPISODE_DATA*/')) { console.error('Template is missing the /*EPISODE_DATA*/ placeholder'); process.exit(1); }

const dest = out || resolve(here, '../dist', `${basename(src, '.json')}.html`);
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, html.replace('/*EPISODE_DATA*/', () => data)
  .replace('<title>Brian\'s Big Garage</title>', () => `<title>${ep.series_title || "Brian's Big Garage"}</title>`));
console.log(`Built ${dest}`);

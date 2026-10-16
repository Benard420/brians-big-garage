#!/usr/bin/env node
// Validates an episode JSON against the PRD content model and readability rules (PRD §14, §15, FR-01).
// Localised episodes (with "locales") are checked once per locale after token substitution (FR-11).
// Usage: node scripts/validate.mjs content/S01E01.json
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('Usage: node validate.mjs <episode.json>'); process.exit(2); }
const raw = JSON.parse(readFileSync(file, 'utf8'));

const errors = [], warnings = [];
let tag = '';
const err = m => errors.push(tag + m), warn = m => warnings.push(tag + m);

const SPEAKERS = new Set(['Brian', 'Jasmine', 'Marcus', 'Ada']);
const ACTORS = new Set(['brian', 'jasmine', 'marcus', 'ada']);
const PROPS = new Set(['car','cars3','startline','finish','mat','board','ramp','blocks','table','flagpaper','thought','checklist','energypath','magnifier','tweezers','loosethread','yarn','chart','hearts','sparkles','rublines','lyingmarcus','box','wheelpile','truck','bins','scissors','ramp2','iconpath','picturecards','photo','windlines','banana','horsecart','steamcar','oldcar','timeline','trafficlight','zebra','traffic','pedlight','stopsign']);
const ICONS = new Set(['battery','switch','motor','axle','wheel','banana','wind','sail','car','bolt','fuel','engine','plug','walk','horse','steam','oldcar','ev','sun','tl_red','tl_redamber','tl_green','tl_amber']);
const BGS = new Set(['garage','closeup','race','night','imagine','street']);
const ANIMS = new Set(['wobble','bounce','shake','pop','zoom','rollshort','rolllong','slidein','sway','spin','pulse']);
const FACES = new Set(['happy','big','wow','sad','sorry','think','determined','laugh']);
const ARMS = new Set(['down','up','wave','point','hip','hold','hug']);
const REQUIRED = ['panel_id','shot','location','visual','characters','dialogue','alt_text','motion','lesson_tags','safety_status','scene'];
const LOCALE_VARS = ['side','look1','look2','lookdir1','kerb','pavement','crossing','amber','walk','dontwalk','pedstyle','sequence','stopword'];
const words = t => t.trim().split(/\s+/).filter(Boolean).length;

// --- locale substitution: must match fill()/locVars() in engine/template.html ---
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function locVars(ep, code) {
  const L = ep.locales[code], v = Object.assign({}, L.vars, { name: L.name, code });
  const lab = { red: 'Red', redamber: `Red and ${v.amber} together`, green: 'Green', amber: cap(v.amber || '') };
  v.lookdir2 = -v.lookdir1; v.lookleft = v.look1 === "left";
  v.lightOrder = v.sequence;
  v.lightItems = [...(v.sequence || []).slice(1).reverse(), (v.sequence || [])[0]].map(id => ({ id, icon: 'tl_' + id, label: lab[id] }));
  v.sequenceText = (v.sequence || []).map(id => lab[id].toLowerCase()).join(' → ');
  return v;
}
function fill(x, v) {
  if (typeof x === 'string') {
    if (/^\$\w+$/.test(x) && x.slice(1) in v) return v[x.slice(1)];
    return x.replace(/\{(\w+)\}/g, (m, k) => k in v ? v[k] : (k[0] === k[0].toUpperCase() && k.toLowerCase() in v ? cap(String(v[k.toLowerCase()])) : m));
  }
  if (Array.isArray(x)) return x.map(y => fill(y, v));
  if (x && typeof x === 'object') { const o = {}; for (const k in x) o[k] = k === 'locales' ? x[k] : fill(x[k], v); return o; }
  return x;
}
function unresolved(x, path = '') {
  if (typeof x === 'string') { const m = x.match(/\{[A-Za-z]\w*\}|^\$\w+$/); if (m) err(`unresolved token ${m[0]} at ${path}`); return; }
  if (Array.isArray(x)) return x.forEach((y, i) => unresolved(y, `${path}[${i}]`));
  if (x && typeof x === 'object') for (const k in x) if (k !== 'locales') unresolved(x[k], path ? `${path}.${k}` : k);
}

function check(ep) {
  for (const k of ['series_id','episode_id','revision','title','pages','interactions','editorial_status']) if (!(k in ep)) err(`episode: missing "${k}"`);

  const shortForm = (ep.pages || []).length <= 12;
  const expectedPages = shortForm ? 12 : 20;
  if ((ep.pages || []).length !== expectedPages) warn(`episode has ${ep.pages.length} pages (pilot = 20, shorts = 12)`);

  const ids = new Set(), intIds = new Set((ep.interactions || []).map(i => i.id));
  let panelCount = 0;
  for (const pg of ep.pages || []) {
    if (!pg.panels?.length) err(`page ${pg.page}: no panels`);
    for (const p of pg.panels || []) {
      panelCount++;
      const where = p.panel_id || `page ${pg.page}`;
      for (const k of REQUIRED) if (!(k in p)) err(`${where}: missing "${k}"`);
      if (ids.has(p.panel_id)) err(`${where}: duplicate panel_id`); ids.add(p.panel_id);
      if (!/^S\d\dE\d\d-P\d\d-[A-Z]$/.test(p.panel_id || '')) err(`${where}: panel_id must look like S01E01-P01-A`);
      if ((p.dialogue || []).length > 2) warn(`${where}: ${p.dialogue.length} bubbles (target 1–2)`);
      for (const d of p.dialogue || []) {
        if (!SPEAKERS.has(d.speaker)) err(`${where}: unknown speaker "${d.speaker}"`);
        if (words(d.text) > 18) warn(`${where}: bubble is ${words(d.text)} words (target ≤ 18): "${d.text}"`);
      }
      if (!p.alt_text || p.alt_text.length < 20) err(`${where}: alt_text too short`);
      if (p.motion && p.motion.type !== 'none' && (p.motion.duration_ms < 250 || p.motion.duration_ms > 800)) err(`${where}: motion duration must be 250–800 ms`);
      if (p.interaction && !intIds.has(p.interaction)) err(`${where}: interaction "${p.interaction}" not defined`);
      if (p.fact && (!p.fact.title || !p.fact.text)) err(`${where}: fact needs title and text`);
      const sc = p.scene || {};
      if (sc.bg && !BGS.has(sc.bg)) err(`${where}: unknown bg "${sc.bg}"`);
      for (const a of sc.actors || []) {
        if (!ACTORS.has(a.who)) err(`${where}: unknown actor "${a.who}"`);
        if (a.face && !FACES.has(a.face)) err(`${where}: unknown face "${a.face}"`);
        for (const k of ['armL','armR']) if (a[k] && !ARMS.has(a[k])) err(`${where}: unknown arm pose "${a[k]}"`);
        if (a.anim && !ANIMS.has(a.anim)) err(`${where}: unknown anim "${a.anim}"`);
      }
      for (const pr of sc.props || []) {
        if (!PROPS.has(pr.type)) err(`${where}: unknown prop "${pr.type}"`);
        if (pr.anim && !ANIMS.has(pr.anim)) err(`${where}: unknown anim "${pr.anim}"`);
        for (const ic of pr.items || []) if (!ICONS.has(ic)) err(`${where}: unknown icon "${ic}"`);
      }
      for (const s of sc.sfx || []) if (/[<>]/.test(s.text)) err(`${where}: sfx text must not contain markup`);
      if (!(p.dialogue || []).length && !p.caption && !p.sfx) warn(`${where}: silent panel with no caption — make sure alt_text carries the story beat`);
    }
  }

  for (const it of ep.interactions || []) {
    const open = it.kind === 'prediction' || it.kind === 'explore';
    if (!['single_choice', 'spot', 'prediction', 'explore', 'order'].includes(it.kind)) err(`interaction ${it.id}: unknown kind "${it.kind}"`);
    if (it.kind === 'order') {
      const oids = (it.items || []).map(x => x.id);
      if (!Array.isArray(it.answer) || it.answer.length !== oids.length || !it.answer.every(a => oids.includes(a))) err(`interaction ${it.id}: order answer must list every item id once`);
      if (oids.join() === (it.answer || []).join()) warn(`interaction ${it.id}: items are already in answer order — shuffle them`);
      for (const x of it.items || []) if (!ICONS.has(x.icon)) err(`interaction ${it.id}: unknown icon "${x.icon}"`);
    }
    if (!open && !it.answer) err(`interaction ${it.id}: missing answer`);
    if (it.kind === 'single_choice' && !it.options?.some(o => o.id === it.answer)) err(`interaction ${it.id}: answer not among options`);
    if (it.kind === 'spot' && !it.hotspots?.some(h => h.id === it.answer)) err(`interaction ${it.id}: answer not among hotspots`);
    if (it.kind === 'explore' && !it.options?.every(o => o.h >= 1 && o.h <= 3 && o.result >= 1 && o.result <= 8)) err(`interaction ${it.id}: explore options need h 1–3 and result 1–8 blocks`);
    if (!open && !it.hint) err(`interaction ${it.id}: needs a non-punitive hint (FR-15)`);
    if (!it.explain) err(`interaction ${it.id}: needs an explanation`);
    if (!ep.pages.some(pg => pg.panels.some(p => p.interaction === it.id))) warn(`interaction ${it.id}: not attached to any panel`);
  }
  if ((ep.new_terms || []).length > 3) warn(`${ep.new_terms.length} new key terms (target ≤ 3 for age 7)`);

  for (const it of ep.interactions || []) {
    // Maths self-check for wheel-style questions: "N cars ... four wheels each"
    const m = /(\w+) cars need (\w+) wheels each/i.exec(it.prompt || '');
    const n = { two: 2, three: 3, four: 4, five: 5, six: 6 };
    if (m && n[m[1].toLowerCase()] && n[m[2].toLowerCase()]) {
      const want = String(n[m[1].toLowerCase()] * n[m[2].toLowerCase()]);
      if (it.answer !== want) err(`interaction ${it.id}: answer ${it.answer} but ${m[1]} × ${m[2]} = ${want}`);
    }
    // Grouping questions with a groups visual: answer must equal groups × per
    if (it.visual && it.visual.groups && /how many wheels\?/i.test(it.prompt || '')) {
      const want = String(it.visual.groups * (it.visual.per || 4));
      if (it.answer !== want) err(`interaction ${it.id}: answer ${it.answer} but visual shows ${want}`);
    }
  }
  return panelCount;
}

let panelCount;
if (raw.locales) {
  const codes = Object.keys(raw.locales);
  for (const code of codes) {
    tag = `[${code}] `;
    const L = raw.locales[code];
    for (const k of ['name', 'label', 'vars', 'review']) if (!L[k]) err(`locale missing "${k}"`);
    for (const k of LOCALE_VARS) if (!L.vars || !(k in L.vars)) err(`locale var missing "${k}"`);
    if (L.vars && !['left', 'right'].includes(L.vars.side)) err(`side must be "left" or "right"`);
    if (L.vars && L.vars.side) {
      const want = L.vars.side === 'right' ? 'left' : 'right';   // nearest traffic comes from this side
      if (L.vars.look1 !== want) err(`look1 should be "${want}" for ${L.vars.side}-hand traffic`);
      if (L.vars.lookdir1 !== (want === 'left' ? -1 : 1)) err(`lookdir1 should be ${want === 'left' ? -1 : 1}`);
    }
    if (L.vars && !(Array.isArray(L.vars.sequence) && L.vars.sequence[0] === 'red' && L.vars.sequence.every(s => ['red','redamber','green','amber'].includes(s)))) err(`sequence must start with "red" and use red/redamber/green/amber`);
    const ep = fill(raw, locVars(raw, code));
    unresolved(ep);
    panelCount = check(ep);
  }
  tag = '';
  console.log(`locales checked: ${codes.join(', ')}`);
} else {
  panelCount = check(raw);
}

console.log(`${raw.episode_id} "${raw.title}": ${raw.pages.length} pages, ${panelCount} panels, ${(raw.interactions || []).length} interactions`);
warnings.forEach(w => console.log('  warn  ' + w));
errors.forEach(e => console.log('  ERROR ' + e));
console.log(errors.length ? `✗ ${errors.length} error(s)` : `✓ valid (${warnings.length} warning(s))`);
process.exit(errors.length ? 1 : 0);

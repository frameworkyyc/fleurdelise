// Safari-safety guard for animation CSS. See docs/ANIMATION-GUIDELINES.md and docs/SAFARI-LOGO.md.
//
// Confirmed on-device (iPad Safari, Private Browsing): @keyframes that animate `filter: blur() drop-shadow()`
// rendered the hero logo as a white rectangle. This script FAILS the build if any @keyframes block contains
// a filter / backdrop-filter / blur() / drop-shadow(), and also FAILS on `transition`s of filter/backdrop-filter and on
// `will-change: filter`. (A *static* filter/backdrop-filter that is not animated is allowed.)
//
// Usage: node scripts/check-motion.mjs [rootDir=src]
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const root = process.argv[2] ?? 'src';
const exts = new Set(['.astro', '.css', '.html', '.svg']);
const FILTERISH = /(^|[\s;{])(?:-webkit-)?(?:backdrop-)?filter\s*:|blur\(|drop-shadow\(/i;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (exts.has(extname(e.name))) yield p;
  }
}

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const errors = [];
const warnings = [];

for await (const file of walk(root)) {
  const text = await readFile(file, 'utf8');
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')); // blank comments, keep line numbers

  // @keyframes blocks (brace-matched)
  const re = /@(?:-webkit-)?keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(code))) {
    let depth = 1, i = re.lastIndex;
    while (i < code.length && depth > 0) { if (code[i] === '{') depth++; else if (code[i] === '}') depth--; i++; }
    const body = code.slice(re.lastIndex, i);
    if (FILTERISH.test(body)) errors.push(`${file}:${lineOf(code, m.index)}  @keyframes ${m[1]} animates a filter/blur/drop-shadow`);
    re.lastIndex = i;
  }

  // Transition / will-change checks
  for (const [n, line] of code.split('\n').entries()) {
    if (/transition(?:-property)?\s*:[^;]*(?:backdrop-)?filter/i.test(line)) errors.push(`${file}:${n + 1}  transition animates a filter property: ${line.trim().slice(0, 100)}`);
    if (/will-change\s*:[^;]*filter/i.test(line)) errors.push(`${file}:${n + 1}  will-change: filter`);
  }
}

for (const w of warnings) console.warn(`motion-check warning: ${w}`);
if (errors.length) {
  console.error('\nmotion-check FAILED — animated filters are not allowed (Safari Private Browsing white-rectangle bug):');
  for (const e of errors) console.error('  ✘ ' + e);
  console.error('\nUse opacity/transform (and SVG transforms) instead. See docs/ANIMATION-GUIDELINES.md.\n');
  process.exit(1);
}
console.log(`motion-check: OK (${warnings.length} advisory warning${warnings.length === 1 ? '' : 's'})`);

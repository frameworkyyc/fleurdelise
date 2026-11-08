// Validates redirects/redirects.txt and writes dist/_redirects (Cloudflare Workers static-assets format).
// Fails the build on: malformed lines, duplicates, self-redirects, chains/loops, internal targets that do not exist,
// non-301/302/307/308 statuses, or exceeding Cloudflare's 2,000 static-rule limit.
// Usage (called by scripts/post-build.mjs):  node scripts/build-redirects.mjs [--check-only]
import { readFile, writeFile, access } from 'node:fs/promises';

const SRC = 'redirects/redirects.txt';
const OUT = 'dist/_redirects';
const MAX = 2000;
const STATUS = new Set(['301', '302', '307', '308']);
const errors = [];
const rules = [];

const text = await readFile(SRC, 'utf8');
text.split(/\r?\n/).forEach((raw, i) => {
  const line = raw.replace(/\s+#.*$/, '').trim();
  if (!line || line.startsWith('#')) return;
  const [from, to, status = '301', ...rest] = line.split(/\s+/);
  const at = `${SRC}:${i + 1}`;
  if (rest.length || !from || !to) return errors.push(`${at}: expected "/old /new [status]"`);
  if (!from.startsWith('/')) errors.push(`${at}: source must start with "/"`);
  if (/[?#]/.test(from)) errors.push(`${at}: source must not contain a query string or fragment`);
  if (/\*/.test(from) && !from.endsWith('/*') && !from.endsWith('*')) errors.push(`${at}: splat "*" is only allowed at the end of the source`);
  if (!STATUS.has(status)) errors.push(`${at}: status must be one of ${[...STATUS].join('/')}`);
  rules.push({ from, to, status, at });
});

const seen = new Map();
for (const r of rules) {
  if (seen.has(r.from)) errors.push(`${r.at}: duplicate source ${r.from} (first at ${seen.get(r.from)})`); else seen.set(r.from, r.at);
  if (r.to === r.from) errors.push(`${r.at}: ${r.from} redirects to itself`);
}
const fromSet = new Set(rules.map((r) => r.from));
for (const r of rules) {
  if (fromSet.has(r.to)) errors.push(`${r.at}: redirect chain — target ${r.to} is itself redirected (point straight at the final page)`);
  if (r.to.startsWith('/')) {
    const p = r.to.replace(/[?#].*$/, '').replace(/\/$/, '');
    const found = p === '' ? await exists('dist/index.html') : (await exists(`dist${p}/index.html`)) || (await exists(`dist${p}.html`)) || (await exists(`dist${p}`));
    if (!found && !r.to.includes('*') && !r.to.includes(':')) errors.push(`${r.at}: target ${r.to} does not exist in the build`);
  } else if (!/^https:\/\//.test(r.to)) errors.push(`${r.at}: target must be a site path or an https:// URL`);
}
if (rules.length > MAX) errors.push(`${rules.length} rules exceeds the ${MAX} static-redirect limit`);
async function exists(p) { try { await access(p); return true; } catch { return false; } }

if (errors.length) { console.error('redirects: FAILED\n  ' + errors.join('\n  ')); process.exit(1); }
if (process.argv.includes('--check-only')) { console.log(`redirects: ${rules.length} rule(s) valid`); process.exit(0); }
if (rules.length) await writeFile(OUT, rules.map((r) => `${r.from} ${r.to} ${r.status}`).join('\n') + '\n');
console.log(`redirects: ${rules.length} rule(s) valid${rules.length ? ` -> ${OUT}` : ' (none defined yet — waiting on the Wix URL inventory)'}`);

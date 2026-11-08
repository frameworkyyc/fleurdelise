// Verifies every rule in redirects/redirects.txt against a running site (301 + exact Location).
// Usage: node scripts/test-redirects.mjs <base-url>      e.g. a local `npx wrangler dev` URL (http://localhost:8787)
// (Staging sits behind Cloudflare Access, so test locally or from a session that is allowed through.)
import { readFile } from 'node:fs/promises';
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) { console.error('usage: node scripts/test-redirects.mjs <base-url>'); process.exit(2); }
const rules = (await readFile('redirects/redirects.txt', 'utf8')).split(/\r?\n/).map((l) => l.replace(/\s+#.*$/, '').trim()).filter((l) => l && !l.startsWith('#')).map((l) => { const [from, to, status = '301'] = l.split(/\s+/); return { from, to, status }; });
let bad = 0;
for (const r of rules) {
  if (r.from.includes('*')) { console.log(`SKIP  ${r.from} (splat — test a concrete URL manually)`); continue; }
  const res = await fetch(base + r.from, { redirect: 'manual' });
  const loc = res.headers.get('location') || '';
  const want = r.to.startsWith('http') ? r.to : base + r.to;
  const got = loc.startsWith('http') ? loc : base + loc;
  const ok = String(res.status) === r.status && got.replace(/\/$/, '') === want.replace(/\/$/, '');
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.from} -> ${res.status} ${loc}  (expected ${r.status} ${r.to})`);
}
console.log(`${rules.length} rule(s), ${bad} failing`); process.exit(bad ? 1 : 0);

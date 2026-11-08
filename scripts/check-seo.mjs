// SEO guard for a built site.   Usage: node scripts/check-seo.mjs [distDir=dist] [--mode=staging|production]
// Checks titles/descriptions/H1/canonicals/robots, JSON-LD validity + the SIT rule, internal links, image alt/size, robots.txt,
// sitemap and (staging) the noindex header. Exit code 1 on any FAIL; WARN is advisory.
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'dist';
const mode = (process.argv.find((a) => a.startsWith('--mode=')) || '').split('=')[1] || (process.env.PUBLIC_SITE_ENV === 'production' ? 'production' : 'staging');
const fails = [], warns = [];
const fail = (m) => fails.push(m), warn = (m) => warns.push(m);
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

async function walk(d) { const out = []; for (const e of await readdir(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) { if (e.name !== '_astro') out.push(...await walk(p)); } else if (e.name.endsWith('.html')) out.push(p); } return out; }
const files = await walk(dir);
const rel = (f) => '/' + f.slice(dir.length + 1).replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
const m = (h, re) => (h.match(re) || [])[1];
const titles = new Map(), descs = new Map();
const indexable = [];

for (const f of files) {
  const h = await readFile(f, 'utf8'); const path = rel(f) || '/'; const is404 = path === '/404';
  const title = (m(h, /<title>(.*?)<\/title>/s) || '').replace(/&amp;/g, '&');
  const desc = (m(h, /<meta name="description" content="(.*?)"/) || '').replace(/&amp;/g, '&');
  const robots = m(h, /<meta name="robots" content="(.*?)"/) || '';
  const canon = m(h, /<link rel="canonical" href="(.*?)"/);
  const h1s = (h.match(/<h1[\s>]/g) || []).length;
  if (!title) fail(`${path}: missing <title>`); else if (title.length > 62) fail(`${path}: title ${title.length} chars (>62): ${title}`); else if (title.length < 25) warn(`${path}: short title (${title.length})`);
  if (!desc) fail(`${path}: missing description`); else if (desc.length > 160) fail(`${path}: description ${desc.length} chars (>160)`); else if (desc.length < 70 && !is404) warn(`${path}: short description (${desc.length})`);
  if (!is404) {
    if (h1s !== 1) fail(`${path}: ${h1s} <h1> elements (need exactly 1)`);
    if (!canon || !/^https?:\/\//.test(canon)) fail(`${path}: canonical missing/relative`); else if (new URL(canon).pathname.replace(/\/$/, '') !== (path === '/' ? '' : path)) fail(`${path}: canonical points elsewhere (${canon})`);
    if (titles.has(title)) fail(`${path}: duplicate title with ${titles.get(title)}`); else titles.set(title, path);
    if (descs.has(desc)) fail(`${path}: duplicate description with ${descs.get(desc)}`); else descs.set(desc, path);
  }
  const wantIndex = mode === 'production' && !is404;
  if (wantIndex && /noindex/.test(robots)) fail(`${path}: noindex on a production page`);
  if (!wantIndex && !/noindex/.test(robots)) fail(`${path}: must be noindex (${mode}${is404 ? ', 404' : ''})`);
  if (wantIndex) indexable.push(path);

  // JSON-LD
  const blocks = [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((x) => x[1]);
  const nodes = [];
  for (const b of blocks) { try { nodes.push(JSON.parse(b)); } catch { fail(`${path}: invalid JSON-LD`); } }
  const types = (n) => [].concat(n['@type'] || []);
  if (path === '/services/sit' || nodes.some((n) => JSON.stringify(n).includes('Subconscious Imprinting') && path !== '/services/sit')) {
    // SIT must never be advertised as a Service/Offer before launch (May 1, 2027)
    for (const n of nodes) {
      if (path === '/services/sit' && (types(n).includes('Service') || types(n).includes('Offer'))) fail(`${path}: SIT must not be a Service/Offer before launch`);
      const s = JSON.stringify(n);
      if (/"@type":"(Service|Offer)"[^{}]*?Subconscious/.test(s) || /Subconscious[^{}]*?"@type":"(Service|Offer)"/.test(s)) fail(`${path}: SIT appears as a Service/Offer in JSON-LD`);
    }
  }
  for (const n of nodes) if (JSON.stringify(n).includes('"name":"SIT"') && /"@type":"(Service|Offer)"/.test(JSON.stringify(n)) ) warn(`${path}: check SIT is not marked up as a service`);
  if (path === '/' && !nodes.some((n) => types(n).includes('LocalBusiness'))) fail('/: LocalBusiness JSON-LD missing');
  if (path.startsWith('/services/') && !nodes.some((n) => types(n).includes('BreadcrumbList'))) fail(`${path}: BreadcrumbList missing`);

  // Credentials: SIT certification must always read as upcoming; sound/crystal/pendulum training is listed on /about only
  // (it must never imply those are offered services); structured data lists completed qualifications only.
  const text = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  // SIT: never "Certified SIT ..."/"SIT practitioner" as a present state; any certification mention must say it is expected (April 2027).
  if (/certified\s+SIT|SIT[- ]certified|SIT practitioner/i.test(text)) fail(`${path}: wording implies Lise is already SIT-certified`);
  for (const mm of text.matchAll(/(?:SIT|Subconscious Imprinting Technique)[^.]{0,80}certif|certif[^.]{0,80}(?:SIT|Subconscious Imprinting)/gi)) {
    if (!/expected/i.test(text.slice(Math.max(0, mm.index - 60), mm.index + mm[0].length + 80))) fail(`${path}: SIT certification mention is not marked "expected April 2027"`);
  }
  if (/\b(book|booking|book an?) (an? )?SIT\b|SIT (sessions? (are|is) (now )?(available|open|offered)|is now (available|offered))|I (now )?offer SIT/i.test(text)) fail(`${path}: wording implies SIT sessions are currently offered`);
  if (path !== '/about' && /\b(singing bowl|sound bath|sound healing|sound therapy|crystal practitioner|crystal singing|pendulum)\b/i.test(text)) fail(`${path}: sound/crystal/pendulum training mentioned outside /about (could imply an offered service)`);
  for (const n of nodes) if (types(n).includes('Person') && /SIT|Subconscious/i.test(JSON.stringify(n.hasCredential || []))) fail(`${path}: Person.hasCredential must not include the upcoming SIT certification`);

  // Images
  for (const img of h.match(/<img\b[^>]*>/g) || []) {
    if (!/\balt=/.test(img)) fail(`${path}: <img> without alt: ${img.slice(0, 80)}`);
    if (!/\bwidth=/.test(img) || !/\bheight=/.test(img)) warn(`${path}: <img> without width/height`);
  }
  // Internal links
  for (const href of new Set([...h.matchAll(/<a\b[^>]*\shref="(\/[^"#?]*)/g)].map((x) => x[1]))) {
    const p = href.replace(/\/$/, '') || '/';
    const ok = p === '/' ? true : (await exists(join(dir, p, 'index.html'))) || (await exists(join(dir, p + '.html'))) || (await exists(join(dir, p)));
    if (!ok) fail(`${path}: broken internal link ${href}`);
  }
}

// robots.txt / sitemap / headers
const robotsTxt = await readFile(join(dir, 'robots.txt'), 'utf8').catch(() => '');
const headers = await readFile(join(dir, '_headers'), 'utf8').catch(() => '');
if (mode === 'staging') {
  if (!/Disallow:\s*\/\s*$/m.test(robotsTxt)) fail('staging robots.txt must Disallow: /');
  if (!/X-Robots-Tag:\s*noindex/.test(headers)) fail('staging _headers missing X-Robots-Tag noindex');
  if ((await readdir(dir)).some((f) => f.startsWith('sitemap'))) fail('staging must not publish a sitemap');
} else {
  if (!/Allow:\s*\//.test(robotsTxt) || /Disallow:\s*\/\s*$/m.test(robotsTxt)) fail('production robots.txt must allow crawling');
  if (/X-Robots-Tag/.test(headers)) fail('production _headers must not contain X-Robots-Tag');
  const sm = await readFile(join(dir, 'sitemap-0.xml'), 'utf8').catch(() => '');
  if (!sm) fail('production sitemap-0.xml missing');
  const locs = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => new URL(x[1]).pathname.replace(/\/$/, '') || '/');
  for (const p of indexable) if (!locs.includes(p)) fail(`sitemap is missing ${p}`);
  for (const p of locs) if (!indexable.includes(p)) fail(`sitemap lists non-indexable/unknown ${p}`);
  if (!/lastmod/.test(sm)) warn('sitemap has no <lastmod> (expected in a full-history clone; omitted on shallow clones)');
}
if (!/Cache-Control:[^\n]*immutable/.test(headers)) fail('_headers: hashed /_astro/* assets are not cached immutably');

console.log(`check-seo (${mode}, ${files.length} pages): ${fails.length} FAIL, ${warns.length} WARN`);
warns.forEach((w) => console.log('  WARN ' + w)); fails.forEach((f) => console.log('  FAIL ' + f));
process.exit(fails.length ? 1 : 0);

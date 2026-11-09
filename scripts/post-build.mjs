// Runs after `astro build`. Non-production builds are hard-blocked from search engines at the HTTP layer too
// (X-Robots-Tag), in addition to the <meta robots> tag and Disallow-all robots.txt.
import { writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const production = process.env.PUBLIC_SITE_ENV === 'production';

const PROD_HOST = 'fleurdelisehealing.ca';
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
const TEST_SITEKEYS = ['1x00000000000000000000AA', '2x00000000000000000000AB', '3x00000000000000000000FF'];
const fail = (m) => { console.error('post-build: ' + m); process.exit(1); };
{
  // The production site URL is fixed; a build must never be mis-labelled (wrong canonicals/sitemap) — and staging must never claim it.
  const html = await readFile('dist/index.html', 'utf8');
  const canonical = hostOf((html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '');
  if (production && canonical !== PROD_HOST) fail(`PRODUCTION build has canonical host "${canonical}", expected "${PROD_HOST}". Use \`npm run build:production\` (sets PUBLIC_SITE_URL=https://${PROD_HOST}).`);
  if (!production && canonical === PROD_HOST) fail(`a non-production build must not use the production host (${PROD_HOST}) in canonicals.`);
  if (production) {
    const key = process.env.PUBLIC_TURNSTILE_SITEKEY || '';
    if (TEST_SITEKEYS.includes(key)) fail('PUBLIC_TURNSTILE_SITEKEY is a Cloudflare TEST key — a production build needs the real widget site key.');
    if (key && !/^0x[A-Za-z0-9_-]{10,}$/.test(key)) fail('PUBLIC_TURNSTILE_SITEKEY does not look like a real Turnstile site key (expected 0x…).');
  }
}

// A production build without a Turnstile site key would ship forms that cannot be submitted — refuse to build it.
if (production && !process.env.PUBLIC_TURNSTILE_SITEKEY && !process.env.ALLOW_MISSING_TURNSTILE) {
  console.error('post-build: PUBLIC_TURNSTILE_SITEKEY is not set for this PRODUCTION build — the contact/booking forms would not work. Set it (public site key) or set ALLOW_MISSING_TURNSTILE=1 for a local check only.');
  process.exit(1);
}

// Shared response headers. (Cloudflare _headers rules are additive: a path can match several blocks.)
const common = [
  'Referrer-Policy: strict-origin-when-cross-origin',
  'X-Content-Type-Options: nosniff',
  'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
];
// Hashed build output never changes under the same name -> cache for a year. Brand/bloom assets keep stable names, so cache for
// a week and let browsers revalidate in the background after that (re-encoded assets reach visitors within days, not a year).
const cache = [
  '/_astro/*', '  Cache-Control: public, max-age=31536000, immutable',
  '/brand/*', '  Cache-Control: public, max-age=604800, stale-while-revalidate=86400',
  '/favicon.ico', '  Cache-Control: public, max-age=604800, stale-while-revalidate=86400',
];
const block = (path, lines) => [path, ...lines.map((l) => '  ' + l)].join('\n');
const globalLines = production ? common : ['X-Robots-Tag: noindex, nofollow, noarchive', ...common];
await writeFile('dist/_headers', block('/*', globalLines) + '\n' + cache.join('\n') + '\n');

if (!production) {
  for (const f of await readdir('dist')) if (f.startsWith('sitemap')) await rm(`dist/${f}`);
  console.log('post-build: staging build — X-Robots-Tag noindex header written, sitemap removed');
} else {
  console.log('post-build: production build');
}
// redirects/redirects.txt -> dist/_redirects (validated; fails the build on errors). Emitted for staging too so rules can be tested there.
execFileSync('node', ['scripts/build-redirects.mjs'], { stdio: 'inherit' });

// Runs after `astro build`. Non-production builds are hard-blocked from search engines at the HTTP layer too
// (X-Robots-Tag), in addition to the <meta robots> tag and Disallow-all robots.txt.
import { writeFile, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const production = process.env.PUBLIC_SITE_ENV === 'production';

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

// Runs after `astro build`. Non-production builds are hard-blocked from search engines at the HTTP layer too
// (X-Robots-Tag), in addition to the <meta robots> tag and Disallow-all robots.txt.
import { writeFile, readdir, rm } from 'node:fs/promises';

const production = process.env.PUBLIC_SITE_ENV === 'production';
if (!production) {
  await writeFile('dist/_headers', '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: strict-origin-when-cross-origin\n');
  for (const f of await readdir('dist')) if (f.startsWith('sitemap')) await rm(`dist/${f}`);
  console.log('post-build: staging build — X-Robots-Tag noindex header written, sitemap removed');
} else {
  // diagnostics are staging-only
  await rm('dist/logo-test', { recursive: true, force: true });
  await rm('dist/brand/diag', { recursive: true, force: true });
  await writeFile('dist/_headers', '/*\n  Referrer-Policy: strict-origin-when-cross-origin\n');
  console.log('post-build: production build');
}

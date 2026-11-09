import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execFileSync } from 'node:child_process';

const isProduction = process.env.PUBLIC_SITE_ENV === 'production';
// Staging builds point canonical/OG URLs at the staging host; production at the real domain.
const site = process.env.PUBLIC_SITE_URL || 'https://fleurdelisehealing.ca';

// <lastmod> = date of the last commit that touched the files that make up each page. It is only emitted when git history is
// complete: in a shallow clone every file would report the build commit and every deploy would wrongly mark all pages "changed".
const git = (...a) => { try { return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const canDate = git('rev-parse', '--is-shallow-repository') === 'false';
const SERVICE_FILES = ['src/pages/services/[slug].astro', 'src/data/service-content.ts'];
const sources = {
  '/': ['src/pages/index.astro', 'src/components/Hero.astro', 'src/components/LiseIntro.astro', 'src/components/ServicesOverview.astro', 'src/components/Values.astro', 'src/components/SitAnnouncement.astro'],
  '/about': ['src/pages/about.astro'], '/contact': ['src/pages/contact.astro'], '/book': ['src/pages/book.astro', 'src/data/booking.ts'],
  '/privacy': ['src/pages/privacy.astro'], '/disclaimer': ['src/pages/disclaimer.astro'], '/services': ['src/pages/services/index.astro', 'src/data/service-content.ts'],
};
const lastmod = (path) => {
  if (!canDate) return undefined;
  const files = path.startsWith('/services/') ? SERVICE_FILES : sources[path];
  const d = files && git('log', '-1', '--format=%cI', '--', ...files);
  return d ? new Date(d).toISOString() : undefined;
};

export default defineConfig({
  site,
  integrations: isProduction ? [sitemap({ serialize(item) { const path = new URL(item.url).pathname.replace(/\/$/, '') || '/'; const l = lastmod(path); if (l) item.lastmod = l; return item; } })] : [], // no sitemap on staging
  trailingSlash: 'never', // matches Cloudflare html_handling: drop-trailing-slash (canonical URLs have no trailing slash)
  compressHTML: true,
  build: { inlineStylesheets: 'always' }, // small brochure site: inlining the ~44 KB CSS removes a render-blocking request (lab: FCP -300..-600 ms, inner-page LCP -350..-570 ms on slow mobile)
});

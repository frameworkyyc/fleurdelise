import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const isProduction = process.env.PUBLIC_SITE_ENV === 'production';
// Staging builds point canonical/OG URLs at the staging host; production at the real domain.
const site = process.env.PUBLIC_SITE_URL || 'https://fleurdelisehealing.com';

export default defineConfig({
  site,
  integrations: isProduction ? [sitemap()] : [], // no sitemap on staging
  trailingSlash: 'never', // matches Cloudflare html_handling: drop-trailing-slash (canonical URLs have no trailing slash)
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
});

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fleurdelisehealing.com',
  integrations: [sitemap()],
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
});

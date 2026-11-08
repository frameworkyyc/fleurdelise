# Redirects (Wix → new site) — infrastructure ready, rules waiting on the URL inventory

**Status: no redirect rules are defined.** The infrastructure is built and tested; Wix URLs must come from the real inventory, never from memory or guesswork.

## How it works
- Source of truth: `redirects/redirects.txt` (one rule per line: `/old /new [301|302|307|308]`, default 301; `#` comments).
- `npm run build` → `scripts/post-build.mjs` → `scripts/build-redirects.mjs` validates the file and writes `dist/_redirects` (Cloudflare Workers static-assets format). Emitted for staging and production builds.
- The build **fails** on: malformed lines, duplicate sources, self-redirects, redirect chains/loops, internal targets that don't exist in the build, bad status codes, or > 2,000 rules.
- `npm run check:redirects` validates without writing. `node scripts/test-redirects.mjs <base-url>` requests every rule and checks the status + exact `Location` (verified locally with `wrangler dev`; staging is behind Cloudflare Access, so test locally or from an allowed session).
- Already handled by hosting (`html_handling: drop-trailing-slash`): `/about/` → `/about`, `/index.html` → `/`. These return **307** (temporary) from Workers static assets, not 301; canonical tags cover SEO, and Wix URLs have no trailing slash, so no action is needed unless the inventory shows otherwise.

## Process once we have the inventory
1. Get the Wix sitemap(s) (`/sitemap.xml` → page/blog/booking sitemaps), the Search Console *Pages* and *Performance* exports (top URLs + queries), the Wix redirect manager list, and inbound-link sources.
2. Map each URL to the closest new page (or a new page if a ranking topic has no match). **Never redirect everything to the homepage.** Point straight at the final page (no chains).
3. Add rules to `redirects/redirects.txt`, run `npm run check:redirects`, build, run `scripts/test-redirects.mjs` locally, deploy to staging, re-verify.
4. Keep every rule for at least 12 months after cut-over. Production go-live and DNS need explicit approval.

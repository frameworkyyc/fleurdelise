# Deployment

Two environments only.

| Environment | Where | Branch | Status |
|---|---|---|---|
| **Staging** | existing Worker `fleurdelise` → https://fleurdelise.frameworktools.ca | `staging` | Connect via Cloudflare dashboard (below) |
| **Production** | Worker `fleurdelise-production` → https://fleurdelisehealing.ca | `main` | **Prepared in code** (`wrangler.production.jsonc`); Worker/pipeline creation, Resend, Turnstile and the domain move are manual steps in [PRODUCTION-CUTOVER.md](./PRODUCTION-CUTOVER.md). Until the cutover the `.ca` hostname is still attached to the staging Worker. |

## Connect GitHub to the existing Worker (one-time, dashboard)
1. Cloudflare dashboard → **Workers & Pages** → **fleurdelise** → **Settings** → **Builds** → **Connect**.
2. Choose **GitHub**. If prompted, install/authorise the **Cloudflare Workers & Pages** GitHub app for `frameworkyyc` and allow access to `fleurdelise`.
3. Select repository **frameworkyyc/fleurdelise**.
4. **Production branch:** `staging` (for this Worker "production branch" simply means the branch that deploys live to it — it is our staging environment).
5. **Build command:** `npm run build:staging`
6. **Deploy command:** `npx wrangler deploy`
7. **Root directory:** `/` · **Builds for non-production branches:** off (no extra preview deployments).
8. **Build variables:** none required. (`npm run build:staging` sets `PUBLIC_SITE_ENV=staging` and `PUBLIC_SITE_URL=https://fleurdelise.frameworktools.ca` itself.) Optional: `NODE_VERSION=22` (also pinned in `.nvmrc`).
9. Save, then **Retry build** on the first build, or push to `staging`.
10. Do **not** add domains or routes — `fleurdelise.frameworktools.ca` is already attached; `wrangler.jsonc` deliberately declares none.

## Day-to-day
Work on a feature branch → merge to `staging` → Cloudflare builds and deploys to the staging URL.

## Staging is never indexed
`<meta robots noindex,nofollow>` + `robots.txt` Disallow-all + `X-Robots-Tag` header (`dist/_headers`) + no sitemap. Only `npm run build:production` (`PUBLIC_SITE_ENV=production`) turns indexing on — never used on staging.

## Production (later, after approval)
Production is a **separate Worker** (`fleurdelise-production`) built from `main` with `npm run build:production` and deployed with `npx wrangler deploy -c wrangler.production.jsonc`. It is never built from `staging`, and staging never uses the `.ca` host. Full runbook, manual Cloudflare/Resend steps, verification and rollback: [PRODUCTION-CUTOVER.md](./PRODUCTION-CUTOVER.md). Offline pre-flight: `bash scripts/qa/production-build-check.sh`.

## Verification checklist (staging)
After a build: `https://fleurdelise.frameworktools.ca/` serves the site (not "Hello world"); response has `X-Robots-Tag: noindex, nofollow, noarchive`; `/robots.txt` is `Disallow: /`; `/sitemap-index.xml` is a 404.
If nothing deploys after a push to `staging`, check Cloudflare → Workers & Pages → fleurdelise → Settings → Builds (branch, commands) and the build history for errors.

## Confirmed Cloudflare configuration (staging) — 2026-11-07
Worker `fleurdelise` · repo `frameworkyyc/fleurdelise` · deployment branch `staging` · build `npm run build:staging` · deploy `npx wrangler deploy` · root `/` · preview-branch builds disabled · URL https://fleurdelise.frameworktools.ca. Earlier failed builds were from a mis-set `main` branch.

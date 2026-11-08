# SEO Phase 3a — implementation report (staging only)

Scope approved: SIT structured data; titles/descriptions/internal linking; homepage SEO; hero asset + first-visit performance; caching/technical SEO; verified-only structured data; redirect infrastructure. **Not done (held):** Wix redirect rules (no URL inventory), unconfirmed pricing/session lengths/credentials/service details, Google Business Profile.
Production and DNS were not touched. Staging remains noindex (meta, `X-Robots-Tag`, `Disallow: /`, no sitemap, Cloudflare Access).

## What changed
| Area | Change |
|---|---|
| SIT | JSON-LD is now a plain `WebPage` ("coming May 1, 2027"); no `Service`/`Offer` anywhere. Page stays indexable (production) as a coming-soon page; title shortened to "Subconscious Imprinting Technique — Coming May 2027". Guarded by `check:seo`. Launch steps: `docs/SIT-LAUNCH-CHECKLIST.md`. |
| Titles / descriptions | All ≤ 62 / ≤ 160 chars, unique (table below). Services/Book/About/SIT/Contact retitled; Home and EFT descriptions shortened. |
| Home | Approved tagline H1 and layout untouched. Hero eyebrow now "Reiki · EFT · Tarot — Windsor, Ontario" (in-person/virtual stays in the lead line). Title/description rewritten. |
| Internal links | Visible breadcrumbs on all inner pages (+ `BreadcrumbList` JSON-LD); About body links to Reiki / EFT tapping / tarot readings; footer lists the three service pages site-wide. |
| Structured data (verified facts only) | `src/data/schema.ts`: `LocalBusiness`+`HealthAndBeautyBusiness` (not a medical type) with `@id`, slogan (approved tagline), `ImageObject` logo, `contactPoint`, `areaServed` (Windsor, Ontario), `OfferCatalog` of the three live services (no prices), `sameAs` only when profiles exist; `WebSite` with publisher; `Person` with `@id`/url (+credentials only when supplied); per-service `Service` with `@id` and `serviceType`; Services `CollectionPage`/`ItemList`; ContactPage linked to the business. Hours, price, street address, social links, credentials: omitted until confirmed. |
| Hero/logo assets | Near-lossless quality 60 → 40 with a build **assertion** (max 8/255 channel error vs the approved artwork); new 1280 px variant so phones and 2× screens stop downloading the 1536 file. Lossy WebP was rejected (up to ~90/255 error around gold lines). |
| Loading | Inline the ~44 KB stylesheet (removes a render-blocking request). Long-cache `_headers`: `/_astro/*` immutable 1 yr; `/brand/*` 7 days + stale-while-revalidate. Added `X-Content-Type-Options`, `Permissions-Policy`. |
| Technical SEO | Production sitemap gets `<lastmod>` from git history (only when history is complete; omitted on shallow clones). `scripts/check-seo.mjs` (`npm run check:seo`) validates titles, descriptions, H1, canonicals, robots, JSON-LD, SIT rule, links, images, sitemap, staging noindex. |
| Redirects | `redirects/redirects.txt` (empty), validated build step → `dist/_redirects`, `scripts/test-redirects.mjs`; see `docs/REDIRECTS.md`. |
| Tested & rejected | Preloading the font files: improved one page's LCP but delayed FCP ≈ 280 ms and worsened another page — removed. A "slow-connection skips the bloom" gate: rejected to keep the animation behaviour unchanged. |
| Unchanged | Bloom animation/video/timing/hand-off (hold-vs-static difference 3.38, was 3.51), dark colour refinements, layout, typography, forms, once-per-session logic, reduced-motion handling. |

## Before → after
### Metadata (production-mode build)
| Page | Title chars | Description chars |
|---|---|---|
| Home | 66 → 62 | 188 → 155 |
| About | 64 → 55 | 133 → 133 |
| Book | 64 → 57 | 152 → 152 |
| Contact | 49 → 48 | 136 → 136 |
| Services | 77 → 62 | 170 → 146 |
| Reiki / Tarot | 49 / 58 (unchanged) | 149 / 141 (unchanged) |
| EFT | 55 (unchanged) | 162 → 153 |
| SIT | 81 → 51 | 148 → 148 |
Before: 5 titles and 3 descriptions over the display limits; after: 0 (`check:seo`: 0 FAIL, 0 WARN, staging and production modes).

### Structured data
Before: LocalBusiness (generic, no `@id` links between nodes, no breadcrumbs), Service ×4 **including SIT as an available Service**. After: linked entity graph, BreadcrumbList on every inner page, ItemList of live services, SIT = WebPage only.

### Performance (Chromium lab, mobile 390×844 @3×; relative, not field data)
| Metric | Before | After |
|---|---|---|
| Hero logo file served to phones (92vw × 3 DPR) | logo-dark-1536 · 719 KB | logo-dark-1280 · 417 KB (−42%) |
| Home transfer, repeat view | 945 KB | 466 KB (−51%) |
| Home transfer, first visit (bloom) | 1,393 KB | 914 KB (−34%) |
| Home LCP, repeat view, 4× CPU + slow 4G | 5.0 s | 2.6 s (−48%) |
| Home LCP, repeat view, no throttle | 1.50 s | 1.49 s |
| Home LCP, first visit (bloom), no throttle | 3.02 s | 2.90 s (timeline-bound; unchanged by design) |
| Home LCP, first visit (bloom), 4× CPU + slow 4G | 5.26 s | 4.89 s |
| Inner page (Reiki) FCP / LCP, 4× CPU + slow 4G | 0.55 / 0.89 s | 0.27 / 0.64 s |
| CLS (all pages, all runs) | 0.000 | 0.000–0.002 |
| Accessibility (axe-core WCAG 2.1 A/AA + best practice, 11 pages × desktop/mobile) | — | 0 violations |
Inline-CSS A/B (identical server, 7 runs each, slow mobile): FCP 908 → 576 ms, inner-page LCP 1228 → 660 ms.

## Remaining issues / what needs the client
1. **First-visit home LCP stays ≈ 2.9 s (fast) – 4.9 s (slow)** — the approved bloom plays before the largest element settles. Judge with real field data after launch (Search Console CrUX). Options if it matters: re-evaluate after the Wix cut-over; do not serve crawlers a different experience.
2. **Wix URL inventory** (sitemap, Search Console exports, redirect manager, inbound links) → redirect rules (`docs/REDIRECTS.md`).
3. **Facts needed for Phase 3b:** where Lise practises in person and whether the address is public; towns served; which services are in person/virtual; session lengths/format/pricing; credentials/training; a photo; hours; consented testimonials.
4. **Google Business Profile + citations** — coordinate with Lise (ownership/verification); then `sameAs` and hours go into the schema automatically via `site.ts`.
5. **Analytics decision** (Cloudflare Web Analytics vs GA4) and `/privacy` wording.
6. **Trailing-slash/`/index.html` variants return 307** from the hosting layer (canonicals cover SEO); fine unless the Wix inventory shows trailing-slash URLs.
7. **Sitemap `<lastmod>`** will appear only if the production build clones full git history (shallow clones skip it by design).
8. Real-device checks still manual: Safari/iPad pages with breadcrumbs, regular + Private Browsing; Rich Results Test / Schema Validator once a public URL exists (staging is behind Access).

# SIT — coming-soon now, available on May 1, 2027

Until launch, `/services/sit` is an **indexable coming-soon page** with waitlist CTA ("Ask to be notified"). SIT is **not** a Service/Offer anywhere in structured data, is not in the services list or booking form, and the page title says "Coming May 2027".

Enforced by `scripts/check-seo.mjs` (fails the check if SIT appears as `Service`/`Offer` JSON-LD) and by `src/data/schema.ts`, which has no date-based switch — launch is a deliberate edit.

## Launch-day steps (do together, in one commit)
1. `src/data/service-content.ts`: remove `upcoming: true`; rewrite eyebrow/lead/overview with Lise's approved copy; add details (format, duration, price) only if confirmed; update `metaTitle`/`metaDescription` (e.g. "Subconscious Imprinting Technique in Windsor, Ontario | Fleur de Lise Healing").
2. `src/data/site.ts`: add SIT to `services` (home cards, schema offer catalog, footer links) and `book.ts` options.
3. `src/data/schema.ts`: use `serviceSchema('sit')` instead of `sitSchema()` (extend the slug type) and update `scripts/check-seo.mjs` so SIT is allowed as a Service from this date.
4. Remove/replace the "Coming May 2027" band (`SitAnnouncement`, services index band, "Services available now" copy) and the waitlist CTA → booking CTA.
5. Run `npm run check:seo`, `astro check`, build; deploy staging, review; production only with approval. Resubmit the sitemap in Search Console.

# SEO audit — Fleur de Lise Healing (Phase 1 + 2)

Status: **audit and strategy only. No site changes have been made.** Phase 3 starts only after approval.
Audited: the production-mode build of the current `staging` branch (all 12 pages), Chromium mobile profiling, and public web searches (snapshot, not a ranking study).

## 0. What this audit can and cannot claim
| Limit | Consequence |
|---|---|
| **No keyword-volume or ranking tools** (no Search Console, Semrush, Ahrefs, GBP Insights) | **No volumes, rankings or difficulty scores appear here.** Keywords are targets chosen by search intent and by what the SERP snapshots showed. Volumes should be checked in Google Search Console (existing Wix site) and Google Keyword Planner (free) before final prioritisation. |
| **The sandbox cannot reach fleurdelisehealing.com** (egress blocked) and web search returned **nothing** for the name, the owner or `site:fleurdelisehealing.com` | I could **not** inspect the Wix site: its URLs, titles, content, sitemap, redirects, or whether it is indexed. Migration findings below are risks and a method, not a URL map. "Not found in a search tool" is **not** proof it is unindexed. |
| Competitor evidence is five single-query snapshots from a US-only search tool | Treated as indicative. Re-check from a Windsor IP/device before acting on it. |
| Performance numbers are Chromium lab runs (software GL, emulated throttling) | Directionally valid; field data (CrUX/Search Console) only exists after launch. |

## 1. Executive summary
**Strong foundation (keep):** server-rendered static HTML; one H1 per page with a clean H2/H3 outline; unique titles, descriptions and canonical URLs on every page; consistent no-trailing-slash URLs; `en-CA`; Open Graph + Twitter cards; LocalBusiness/Service/Person/ContactPage JSON-LD already present; correct production `robots.txt` + `sitemap-index.xml`; staging triple-protected (meta robots, `X-Robots-Tag`, Disallow-all robots.txt, plus Cloudflare Access); copy is clean of medical/therapeutic claims; inner pages are very fast (LCP 0.1–0.9 s).

**Biggest opportunities, in order:**
1. **Migration safety is unplanned.** No redirect map exists (`_redirects` is absent) and the Wix URL inventory is unknown. This is the only item that can *lose* existing visibility. (P0)
2. **No Google Business Profile / local citations in the plan.** For "Reiki Windsor"-type searches the map pack and directories are the main battleground, and the site cannot influence them directly. (P0, client action)
3. **Service pages are thin and generic** (≈190–320 words each, no session format/length/price/FAQ/location detail, no credentials). They name Windsor but give Google and visitors little to prefer them over directory listings. Blocked mainly on client facts (see §6). (P1)
4. **SIT is marked up as an available `Service`** and listed in the sitemap, which conflicts with "not available before May 1, 2027" even though the visible copy is correct. (P0, small)
5. **Titles/descriptions** over-length on 5 pages (Home 66 chars/188-char description, Services 77, SIT 81, About 64, Book 64) and the Home H1 carries no topic or place. (P1, small)
6. **First-visit home LCP is 3.0 s (fast network) to ≈5.3 s (4× CPU + slow 4G)** because the approved bloom delays the largest visible element. Repeat views and all inner pages are fine. (P2, trade-off for you to decide)
7. **Structured data can be richer and more accurate** (more specific business type, `areaServed` list, `sameAs`, breadcrumbs, real hours/price once known). (P1)

## 2. Technical audit (observed)
| Area | Finding | Status |
|---|---|---|
| Indexing controls | Production: `index, follow, max-image-preview:large`; 404 `noindex`. Staging: `noindex,nofollow,noarchive` header + meta + `Disallow: /` + no sitemap. | OK |
| Canonicals | Present, absolute, self-referencing, no trailing slash. Parameter URLs (`/book?service=reiki`, `/contact?interest=sit`) canonicalise to the base page. | OK (verify live after launch) |
| robots.txt / sitemap | Production: `Allow: /` + sitemap index. Sitemap lists 11 URLs, **no `<lastmod>`**, includes `/privacy` and `/disclaimer` (low value, harmless). | Minor |
| Redirects | **None defined.** Workers static assets support a `_redirects` file (301). `html_handling: drop-trailing-slash` already 301s trailing-slash variants. | **Gap** |
| Hosting/caching | `_headers` sets only robots + referrer policy. Hashed `/_astro/*` and `/brand/*` have no explicit long-cache header. No HSTS / `X-Content-Type-Options`. | Quick win |
| Structured data | LocalBusiness (Windsor, ON; phone; email; founder; empty `sameAs`), WebSite, Person, ContactPage, Service ×4 (incl. SIT). No BreadcrumbList. No hours, no street address (appropriate for a service-area business — see §6), no price. | Improve |
| Headings | Exactly one H1/page; logical H2/H3. Home H1 is the tagline ("Come as you are. Bloom at your own pace."). | Minor |
| Images / a11y | Logo `alt` is descriptive; decorative sub-marks use `alt=""` correctly; all images have width/height; non-hero images lazy. No photography exists. | OK |
| Language / social | `lang="en-CA"`, `og:locale en_CA`, OG image 1200×630 (75 KB). | OK |
| Internationalisation | Single language; hreflang not needed. | n/a |
| Analytics / measurement | None installed. Without it there is no way to prove SEO impact or count calls/emails/forms. | **Gap** |

## 3. Core Web Vitals / speed (Chromium lab, mobile 390×844 @3×)
| Page / scenario | FCP | LCP | CLS | Transfer |
|---|---|---|---|---|
| Home, **first visit (bloom plays)**, no throttle | 0.2 s | **3.0 s** (wordmark layer) | 0.000 | 1.39 MB |
| Home, **repeat visit / bloom skipped** | 0.16 s | 1.5 s (hero logo 1536 px, 719 KB) | 0.000 | 0.95 MB |
| Home first visit, 4× CPU + slow-4G | 0.74 s | **5.3 s** | 0.000 | 1.39 MB |
| Home repeat, 4× CPU + slow-4G | 0.82 s | 5.0 s | 0.001 | 0.95 MB |
| `/services/reiki`, no throttle / slow | 0.1 / 0.55 s | 0.1 / 0.9 s | 0 | ≈120–150 KB |

Interpretation (honest): CLS and JS are excellent. The home page's weight is dominated by **two images** (hero logo up to 719 KB on high-density phones; bloom video 720 KB on first visit). On a slow phone even the static logo is the LCP at ≈5 s, so **compressing the hero logo helps everyone**; the bloom adds ≈1.5 s on first visits. Google's thresholds are LCP ≤ 2.5 s good / > 4 s poor at the 75th percentile of real visits over 28 days — decide from field data after launch, not from these lab numbers. CWV is a modest ranking factor; an approved brand animation is a legitimate trade-off, but the weight reductions below are free wins.

## 4. Keyword & intent strategy (targets, not measured volumes)
Observed in SERP snapshots: Windsor "Reiki" results are dominated by **directories and booking pages** (Fresha, Jane App, BBB, Yell) plus massage/spa clinics offering Reiki; "tarot reading Windsor" returns mostly **directories and Detroit/Toronto-based readers** with few true Windsor-based practitioner sites; "EFT" in Windsor is **ambiguous** — results include *Emotionally Focused Therapy* (couples therapy, different thing) and Psychology Today therapist profiles. Treat this as a hypothesis that a genuine, well-structured local practitioner site has room to compete, especially for tarot and EFT *tapping*.

| Page | Primary target | Secondary / supporting | Intent |
|---|---|---|---|
| `/` | Reiki, EFT and tarot in Windsor, Ontario | holistic wellness Windsor; Lise Pinard-Wolf; Fleur de Lise Healing (brand) | Commercial/local |
| `/services/reiki` | Reiki Windsor Ontario | Reiki session Windsor; what is Reiki; first Reiki session; virtual/distance Reiki Ontario *(only if offered)* | Commercial + informational |
| `/services/eft` | EFT tapping Windsor Ontario | Emotional Freedom Technique Windsor; what is EFT tapping; tapping session virtual Ontario | Commercial + informational; **always pair "EFT" with "tapping"/"Emotional Freedom Technique"** to avoid the Emotionally Focused confusion |
| `/services/tarot` | Tarot reading Windsor Ontario | tarot reader Windsor; reflective tarot; online tarot reading Ontario/Canada *(if offered)* | Commercial/local |
| `/services/sit` | Subconscious Imprinting Technique Windsor | SIT Windsor; (waitlist) | Informational/waitlist — **not bookable until May 1, 2027** |
| `/services` | Reiki, EFT and tarot services Windsor | in-person and virtual sessions | Hub |
| `/about` | Lise Pinard-Wolf Windsor | Reiki practitioner/tarot reader Windsor *(wording per credentials)* | Trust/branded |
| `/book`, `/contact` | (conversion pages) book Reiki/EFT/tarot appointment Windsor | contact Fleur de Lise Healing | Transactional/navigational |

Compliance guardrails for all copy: no outcome promises or condition-specific claims (anxiety, pain, trauma, etc.); avoid "therapy/therapist/psychotherapy/counselling" (protected or regulated wording in Ontario — confirm with the client/legal); keep the existing complementary-wellness disclaimer; use "support", "session", "practitioner", "reading".

## 5. Recommendations (prioritised)
Impact: H/M/L on organic visibility or visitors-to-inquiries. Effort: S ≤ ½ day, M ≈ 1–3 days, L > 3 days. "Client" = needs client information or accounts.

| # | Priority | Recommendation | Impact | Effort | Depends on |
|---|---|---|---|---|---|
| 1 | **P0** | **Wix inventory + 301 map.** Collect Wix `sitemap.xml`, Search Console Pages/Performance export (top URLs, queries), Wix redirect manager, inbound-link list. Map each live URL to its closest new page; implement as `_redirects` (301); test every mapping on staging with a script; list any "orphan" Wix pages whose topic deserves a new page. | H (protects existing visibility) | M | Client: Search Console/Wix access or exports |
| 2 | **P0** | **Go-live checklist** (production only after approval): choose apex vs www (current canonicals = apex); keep Wix live until redirects verified; lower DNS TTL beforehand; launch off-peak; submit `sitemap-index.xml` in Search Console (Domain property) and Bing Webmaster Tools; use Change-of-address only if the domain changes (it doesn't); monitor Coverage/404s/queries for 4 weeks; keep redirects ≥ 12 months. | H | S–M | Approval to touch production |
| 3 | **P0** | **Google Business Profile** as a *service-area business* (hide home address; set Windsor + service area), most specific available categories, services list, photos, hours, booking/inquiry link `/book`. Then citations on a few consistent directories (Apple Maps, Bing Places, BBB if eligible, chamber/community listings) with **identical name/phone/URL**. Ask satisfied clients for Google reviews (never incentivise or fabricate). | H (local pack) | S–M | Client owns/verifies |
| 4 | **P0** | **SIT schema/sitemap hygiene:** remove `Service` JSON-LD from `/services/sit` until launch (use plain `WebPage`), keep "Coming May 2027"/waitlist wording, keep page out of any "services available" list. Decision: stay indexable as an announcement/waitlist page (recommended) or `noindex` until May 1, 2027. On launch day: switch to Service + enable booking. | M (compliance) | S | Your decision |
| 5 | P1 | **Title/description rewrite** to ≤ 60/155 chars with place + service first; add a keyworded eyebrow/subhead near the Home H1 (keep the approved tagline as the H1 or move the keywords into the visible lead). Proposed examples: Home *"Reiki, EFT & Tarot in Windsor, Ontario \| Fleur de Lise Healing"* (shorten desc.); Services *"Reiki, EFT & Tarot Services in Windsor \| Fleur de Lise"*; SIT *"Subconscious Imprinting Technique — Coming May 2027"*. | M | S | — |
| 6 | P1 | **Expand service pages** to ≈ 600–900 helpful words each: who it's for, what a session is like, length/format, prep, in-person vs virtual, pricing (if the client wants it public), cancellation, 5–8 genuine FAQs ("Do I need experience?", "What should I wear/bring?", "Is it a substitute for medical care?" — *no*), clear CTA. Use only facts supplied by Lise. | H | M | Client: session facts, credentials |
| 7 | P1 | **Trust/E-E-A-T:** About page with Lise's real training/certifications, lineage and years (only what she confirms); real photo of Lise and (if applicable) the space with descriptive alt text; real testimonials only with written consent. | M–H | S–M | Client |
| 8 | P1 | **Structured data upgrade:** more specific LocalBusiness subtype (verify the best fit; avoid medical types), `areaServed` as a list of confirmed cities, `sameAs` (GBP, social), `openingHoursSpecification` and `priceRange` only if supplied, `BreadcrumbList` on inner pages, `Service.offers` only with real prices, `image` on Person. FAQ content on pages is useful, but Google now shows FAQ rich results mainly for authoritative gov/health sites, so don't expect a SERP feature. Validate with Rich Results Test + Schema Validator once on a public URL. | M | S–M | Items from #3, #6 |
| 9 | P1 | **Measurement:** Search Console + a privacy-friendly analytics (Cloudflare Web Analytics is cookieless; GA4 is alternative) with events for form submit, phone tap, email tap; update `/privacy` accordingly. | H (proves ROI) | S | Your choice of tool |
| 10 | P1 | **Local content hub (careful):** a single "Serving Windsor-Essex" section/page listing the real service area and in-person vs virtual availability — **not** one near-duplicate page per suburb (doorway-page risk). | M | S | Client: where Lise actually serves |
| 11 | P1 | **Internal linking:** add contextual in-body links between services (e.g. Reiki ↔ EFT "other ways to be supported" already exist; add descriptive anchors in overview copy), breadcrumbs, link About → services and each service → About/Book. Keep descriptive anchor text. | M | S | — |
| 12 | P2 | **Weight/CWV quick wins:** re-encode the hero logo (719 KB at 1536 px) and wordmark layer at a higher compression with a visual check against the approved artwork; add long-cache headers for `/_astro/*` and `/brand/*` via `_headers`; consider preloading the two critical font files. Expected: lower LCP on every home visit without touching the animation. | M | S–M | Visual sign-off |
| 13 | P2 | **Sitemap polish:** add `lastmod`, consider omitting `/privacy` and `/disclaimer` (keep crawlable). | L | S | — |
| 14 | P2 | **Resources (informational intent):** 3–5 careful articles, e.g. "What to expect at your first Reiki session", "What is EFT tapping (and what it isn't)", "What a tarot reading is — and isn't", each with the disclaimer and no health claims. Publish only if Lise will maintain them. | M (long term) | M–L | Client time |
| 15 | P2 | **Home first-visit LCP vs bloom:** options are (a) accept (approved experience), (b) after #12, re-measure; (c) never serve crawlers/Lighthouse a different experience (that is cloaking — not recommended). Decide with CrUX data after launch. | L–M | — | Your decision |
| 16 | P2 | **Security headers** (HSTS after the domain is on HTTPS-only, `X-Content-Type-Options`, basic CSP). Small trust/hygiene signal, not a ranking lever. | L | S | — |

## 6. Differentiation (grounded in brand and the research snapshot)
- **Story and voice:** a single practitioner with lived experience ("a practitioner who understands"), plain-spoken, no-judgement positioning — already the site's tone; competitors surfaced as directory entries or clinics offering Reiki among many services.
- **A real Windsor tarot practitioner:** the tarot snapshot returned mostly event-booking directories and readers based in Detroit/Toronto — a clear, local, reflective (not predictive-claims) tarot page is the most open opportunity (to be re-checked from Windsor).
- **EFT *tapping* clarity** in a space where "EFT" is shared with a different therapy type.
- **In-person and virtual** in one place, once the client confirms which services offer which.
- **"First conversation before booking"** — low-pressure entry that suits first-timers; make it the primary CTA across pages.
- **SIT:** do not claim uniqueness; first check whether any Windsor-area practitioner offers it, then decide whether "among the first in Windsor-Essex" can be stated truthfully.
- **Trust signals:** clear disclaimer, privacy, transparent process (already in `/book`), plus credentials, photos and consented reviews when available.

## 7. Wix → new site migration risk register
| Risk | Why it matters | Mitigation |
|---|---|---|
| Unknown Wix URL structure (Wix commonly generates paths for service/booking/blog pages — **verify, do not assume**) | Any ranking URL without a 301 becomes a 404 and loses equity | Item 1: inventory + `_redirects`; scripted test of every old URL |
| Old pages with no equivalent topic | Lost long-tail traffic | Create a matching page or redirect to the closest parent (never everything to the homepage) |
| Title/H1/content changes on ranking pages | Temporary ranking movement | Carry over proven keywords/phrases (from Search Console queries) into new titles/copy |
| NAP inconsistency (old site, GBP, directories) | Local ranking dilution | Single name/phone/URL standard; update all listings the same day |
| Domain/DNS cutover | Downtime, SSL, email | Keep the Wix domain registration and DNS until the Worker is verified; email uses Gmail so MX records are not involved (confirm there are no domain-based mailboxes) |
| Search Console/analytics continuity | Lose history | Verify the Domain property before cutover; export Wix data first |
| Accidentally indexing staging | Duplicate content | Already blocked 3 ways + Access; keep `PUBLIC_SITE_ENV=production` only in the production build |
| SIT appearing as bookable | Compliance | Item 4 |
| Redirect chains / `www` vs apex / trailing slash | Crawl waste, split signals | One canonical host; direct 301s; existing `drop-trailing-slash` handles slash variants |
| Wix backlinks/social bios pointing to old URLs | Link equity | Redirect + update profile links |

## 8. Action plan
**Phase 3a — can start immediately on staging, no client input (≈ 1–2 days):** #4 SIT schema, #5 titles/descriptions/Home lead, #8 structured-data upgrade for what is known (breadcrumbs, area, specific type), #11 internal links, #12 hero/wordmark compression + cache headers, #13 sitemap `lastmod`, #16 headers, redirect scaffolding + test script (#1 mechanics).
**Phase 3b — needs client facts (≈ 2–4 days once supplied):** #6 service-page expansion, #7 About/credentials/photos, #10 service-area copy, #9 analytics events, final #8 data (hours, price, `sameAs`).
**Off-site (client/agency):** #3 Google Business Profile + citations, reviews process, Search Console/Bing setup, Wix exports.
**Go-live (needs your explicit approval):** #2, then 4-week monitoring plan; revisit #14/#15 with real data.

## 9. Information needed to proceed
1. Wix admin or exports: `sitemap.xml`, page list, Search Console (or at least top pages/queries), any redirects, social/profile links pointing at the old site.
2. Where does Lise practise in person, and may the address be public? Which towns does she actually serve? Which services are in person / virtual / both?
3. Session length, format and (if public) pricing for Reiki, EFT, tarot.
4. Lise's real training/certifications, lineage and years; permission and a photo of her (and the space); any testimonials with written consent.
5. Business hours (or "by appointment"), existing social/Google/Facebook profiles.
6. Who owns/will verify the Google Business Profile.
7. Analytics choice (Cloudflare Web Analytics vs GA4).
8. SIT preference: indexable waitlist page (recommended) vs `noindex` until May 1, 2027.
9. Approval of the Phase 3a scope (staging only).

## 10. Sources (research snapshots, accessed this session; unverified rankings)
Web searches run: "Reiki Windsor Ontario", "EFT tapping practitioner Windsor Ontario", "tarot reading Windsor Ontario", the business name/owner, and `site:fleurdelisehealing.com`. Illustrative result pages referenced: [Walkerville Massage Healing and Wellness](https://walkervillemassage.clinicsense.com), [Fresha — energy healing in Windsor](https://www.fresha.com/lp/en/tt/energy-healing/in/ca-windsor), [BBB — Reiki therapy, Windsor](https://bbb.org/ca/on/windsor/category/reiki-therapy), [Yell — Reiki in Windsor](https://www.yell.com/s/reiki-windsor.html), [Therapy Tribe — Emotionally Focused therapists in Windsor](https://therapytribe.com/therapist/ontario-on-windsor/emotionally-focused-therapy), [The Bash — tarot readers Windsor](https://www.thebash.com/search/tarot-card-reader-windsor-on), [GigSalad — tarot readers Windsor](https://www.gigsalad.com/Variety/Tarot-Reader/ON/Windsor). Technical facts about the new site come from this repository's production-mode build and Chromium measurements.

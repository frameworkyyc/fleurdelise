# Mobile-first redesign — implementation report (staging only)

Implemented per `docs/MOBILE-REDESIGN-PROPOSAL.md` with your decisions (botanical still-life for Meet Lise; cropped candle-lit hands for Reiki; steaming cup in window light for EFT; proposed Tarot/SIT photography; floating pill; two signature dividers; credits kept in docs only). **Staging only** — production, DNS, Cloudflare and the production pipeline (and the `main` branch) were not touched.
Screenshots: `docs/images/redesign-before-after-390.jpg`, `-768.jpg`, `-1440.jpg` (top row = before, bottom row = after).

## What changed
| Area | Before | After |
|---|---|---|
| Meet Lise | empty 342×428 arch + 2 paragraphs (1,072 px) | compact photo arch beside the heading, lead paragraph, verified credential line "Certified Master Usui Reiki Practitioner · Tarot since 2003", link (559 px). Desktop: large arch filled with the botanical still-life. |
| Services | 3 tall plum boxes with line icons (1,576 px) | 3 photographic tiles (Reiki candle-lit hands · EFT window-light cup · Tarot cards on dark textile), line illustration reduced to a gold badge, whole tile is the link (999 px). 3-up 4:5 tiles from 700 px. |
| Values | 3 stacked blocks with icons (1,035 px) | one slim ribbon: Safe · Nurturing · Authentic (315 px) |
| SIT | 234 px glossy orb (757 px) | candle photograph melting into Midnight, copy on solid Midnight, same "coming May 1, 2027 / ask to be notified" wording (501 px) |
| Invitation | lotus garden 228 px (762 px) | small lotus (569 px) |
| Footer | single column (1,365 px) | logo + tagline row, two-column links (809 px) |
| Dividers | 6 overhanging medallions, one clipped, one dimmed | **2 in-flow signature dividers** (hairlines + fleur-de-lis) at hero → Meet Lise and Services → Values; `SeamOrnament` deleted. Cannot be clipped/dimmed: it never overhangs a section edge, and the SIT section no longer needs `overflow:hidden`. |
| Sticky booking | 72 px full-width bar, always on (8.5 % of viewport) | 46 px floating pill (5.5 %), steps aside whenever it would sit over a control, heading, tile text, footer link, the open menu or the keyboard |
| Spacing | 72 px section padding on phones | 40–52 px (tablet/desktop unchanged) |
Preserved: cinematic hero, approved logo/bloom/tagline, brand colours/fonts, all SEO headings/links/structured data, forms and every production safeguard.

## Page heights (full-page, px)
| Width | Before | After | Change |
|---|---|---|---|
| 390 (iPhone) | 7,439 (8.8 screens) | **4,595 (5.4 screens)** | −38 % |
| 768 (iPad portrait) | 7,517 | **4,563** | −39 % |
| 1440 (desktop) | 5,608 | 5,241 | −7 % (kept its structure; photography added) |
| About @390 | 7,005 | 5,808 | −17 % (inherits compact arch + spacing) |
| Services @390 | 5,129 | 4,260 | −17 % |
| Reiki page @390 | 4,680 | 3,964 | −15 % (spacing) |
At 390: hero 844 · Meet Lise 559 · Services 999 · Values 315 · SIT 501 · Invitation 569 · Footer 809.

## Performance (Chromium lab, same server, before vs after)
- **Photography:** five graded masters → AVIF/WebP/JPEG at 400/640/900 (SIT 480/800/1200); AVIF sizes are 1.5–26 KB each (e.g. Tarot 640 px = 12 KB). All `loading="lazy"`, `decoding="async"`, explicit width/height. Home image bytes after a full scroll on a phone: 406 → 463 KB (+57 KB, well under the 160 KB budget); fonts/JS/CSS unchanged.
- **LCP / CLS (390 mobile, no throttle):** first visit 2.9 → 2.8 s, repeat view 1.49 → 1.42 s; throttled repeat 2.59 → 2.78 s (noise-level; first-visit values on slow-4G vary run-to-run because the bloom either starts or falls back to the static logo). **CLS 0.000** everywhere. Inner pages unchanged.
- Bloom/hand-off regression: hold-vs-static difference 3.39 (approved baseline 3.38–3.51); default/lite/override variants all load; static logo always ends visible.
- Hero geometry: identical at 768 and 1440; at 390 the hero is now exactly one screen (844 px) so its content sits 8 px lower (bottom padding 96 → 52).

## Accessibility & QA results
- **axe-core: 0 violations** on all 11 pages × desktop and mobile.
- **Contrast of text over photography** (measured from real screenshot pixels with the text hidden): ≥ 4.5:1 against the **98th-percentile** background at 320/390/430/768/1024/1440 (lowest 6.4:1 on tiles at 430; SIT copy sits on solid Midnight). Worst case is a single brightest pixel (e.g. a candle-flame highlight): 2.4–6.7:1 — flagged honestly in the compromises below.
- **Dividers:** both centred (±1 px), fully visible (opacity 1), not clipped by any ancestor, at all six widths.
- **Floating pill:** at 320/390/430/768, scrolling six pages in 90 px steps: **zero overlaps** with links, buttons, fields, headings, footer links or tile text; height 46 px (≥ 44), always inside the viewport; visible at ≈ 30 % of scroll positions (see compromises).
- **No horizontal overflow** on 9 pages × 6 widths.
- Other checks: `astro check` 0 errors; Worker unit tests 25/25; forms E2E 37/37; production-config E2E 15/15; `check:seo` 0 FAIL in staging and production modes; `check:motion` OK; production pre-flight (`scripts/qa/production-build-check.sh`) passes; `scripts/qa/e2e-layout.cjs` (new) 5–6 checks × 6 widths.

## Design compromises & outstanding issues (please read before production approval)
1. **Length:** 5.4 screens, above the 4.8 guideline — the SIT candle strip (+≈120 px) and the 224 px tiles were kept for visual quality; further trimming is possible (e.g. 190 px tiles).
2. **Floating pill is hidden about 70 % of the time** at phone widths, because the rule "never overlap any control or heading" is strict on a link-dense page. It reliably appears in the quiet stretches and the hero/Invitation/footer CTAs cover the rest. If conversion matters more than strictness, the rule can be relaxed (e.g. allow overlap with plain paragraphs) — your call.
3. **Photos are intentionally dim under the tile text** (strong plum scrim, needed to guarantee contrast on a 224 px tile); the photography reads mainly in the upper half of each tile. The single brightest pixel behind a line can still dip below 4.5:1 (flame highlights), though the line as a whole passes.
4. **Meet Lise image is not Lise** (dried botanicals on black cloth, decorative, `aria-hidden`). On desktop it is a large, very dark arch on the linen band — striking but heavy. A real portrait should replace it (set `site.lise.photo`; layout is ready).
5. **Reiki photo shows a stranger's hands** (cropped, no faces); **EFT photo is a steaming cup** (metaphor, may read as coffee) — alternates are in the shortlist.
6. **Hero:** composition and bloom unchanged, but at 390 px the hero content moved down 8 px (hero is now one exact screen).
7. **Desktop** keeps its structure (−7 % height); it gains the photographic tiles and arch rather than shrinking.
8. **Dividers:** only two; other section boundaries rely on the dark/light colour change.
9. **Not testable here (manual):** real iPhone/iPad Safari (regular + Private Browsing): pill safe-area spacing, scroll-linked divider unfold, AVIF/WebP delivery (AVIF needs iOS 16+, WebP fallback otherwise), landscape iPad, reduced-motion. Lab numbers are Chromium software-rendered, not field data.
10. **Repo:** originals (≈ 2.5 MB at 2,200 px) are in `brand-originals/photos/`; graded masters in `src/assets/photos/` (re-generate with `node scripts/build-photos.mjs`).
11. `main` (the production source branch) was deliberately **not** updated; it will need this change merged when you approve production.

## Image credits
See `docs/IMAGE-CREDITS.md` (photographer, Unsplash ID/URL, licence, usage). Unsplash's download-tracking endpoint was called for each downloaded photo. No visible attribution on the site (per your decision).

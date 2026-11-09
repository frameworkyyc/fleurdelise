# Mobile-first redesign — audit & proposal (Phase 1)

> **Status: approved and implemented on staging — see [MOBILE-REDESIGN-REPORT.md](./MOBILE-REDESIGN-REPORT.md).**

Scope: homepage first, with the shared components (arch, dividers, sticky bar, footer) that also affect About, Services and service pages. **Staging only when approved; production, DNS, Cloudflare and the production pipeline are untouched.**
Method: scripted scroll-through of the live build at iPhone widths (390 ≈ iPhone 14/15), measurements at 320 / 390 / 430 / 768 / 1440, pixel inspection of every divider, an Unsplash API search (read-only) with every candidate viewed.

## 1. Design thesis
Today the mobile page is the desktop page stacked: 8.8 screens of the same pattern (eyebrow → serif heading → grey paragraph → link) separated by six identical medallions, with three big empty "stages" (an arch, an orb, a lotus garden). Nothing on it shows a *place, a texture or an object* — so it reads as wellness-template rather than "modern botanical mysticism".
Proposal: a **short, cinematic scroll (~4.8 screens, −45 %)** that tells one story in five beats — *Arrive* (unchanged hero) → *Meet Lise* → *Three doorways* (photographic service tiles) → *Reassurance* → *Invitation* — using warm, low-key photography (candle-lit hands, tarot on dark textile, window light, dried botanicals, plum velvet) that matches the logo's Midnight/Plum/Gold palette. Line-art botanicals stay as small gold accents; they stop being content-free billboards.

## 2. What the audit found (iPhone 390 × 844)
| Page | Height | Notes |
|---|---|---|
| Home | **7,439 px = 8.8 screens** (desktop 6.2) | hero 872 · Meet Lise 1,072 · Services 1,576 · Values 1,035 · SIT 757 · Invitation 762 · Footer 1,365 |
| About | 8.3 screens | same arch again (428 px), Training 1,468, principles 4 stacked cards |
| Services | 6.1 screens | |
| Reiki / Tarot | 5.5 / 5.8 screens | fine; hero 580 |
| Book / Contact | 5.4 / 4.3 screens | form-driven, fine |
- **Decorative blocks that carry no content:** the Meet Lise arch **342 × 428 px (half a screen, empty apart from two grey leaf shadows and a tiny moon glyph)**, repeated on About; the SIT lunar orb **234 × 234**; the Invitation lotus garden **342 × 228**; three tall service cards that are ~60 % padding and a 96 px line icon.
- **Repetition:** "in person or virtually" appears in the hero lead, the Services header *and* the Services note; "Come as you are / welcome" tone repeats in Meet Lise, Values and Invitation; Values restates About; every section ends with an arrow link or button.
- **Spacing:** section padding 72 px top/bottom on phones (+96 px above the Invitation) — about 14 % of the page is padding.
- **Sticky booking bar:** **72 px full-width = 8.5 % of the viewport**, always on screen after the hero, even next to the page's own booking buttons and the footer.
- **Footer:** 1,365 px (1.6 screens): a single column of 8 links + contact + legal.

### Root cause of the clipped lotus divider (confirmed by inspecting all six)
1. **Clipping:** every divider is a 56 px medallion centred on a section's top edge, positioned *inside* the section and overhanging 28 px upward. The **SIT section has `overflow: hidden`** (to contain its star field), which cuts the medallion's top half off. (Seen at the Values → SIT boundary.)
2. **Dimming:** the hero → Meet Lise medallion looks washed out because the hero's vignette layer (a sibling stacking context) paints *over* the overhanging half.
3. **Over-use:** six identical medallions on one page (hero→welcome, welcome→services, services→values, values→SIT, SIT→invite, invite→footer) — decoration as punctuation rather than a signature.
All six are centred correctly horizontally (verified at 320–430 px); the problems are overflow, stacking and repetition, not position.

## 3. Proposed mobile structure (390 px)
| # | Section | Purpose | Target height | Key elements | Photo |
|---|---|---|---|---|---|
| 1 | **Hero** (approved — unchanged composition, logo, tagline, bloom) | Arrive | ~800 (trim bottom padding only) | logo → tagline → CTA | none (logo is the image) |
| 2 | **Meet Lise** | Human warmth + credibility | ~460 (was 1,072) | small arched photo (112 × 140) beside H2 + one lead paragraph; a one-line trust strip *"Certified Master Usui Reiki Practitioner · Tarot since 2003"* (verified facts); "More about Lise →" | botanical (Annie Spratt) in the small arch *or* real portrait of Lise when supplied |
| 3 | **Three doorways** (services) | Choose | ~930 (was 1,576) | 3 full-width photo tiles ≈ 390 × 210, title + one line + gold line-icon badge; the whole tile is the link; one compact "In person · Virtual" line | Reiki: candle-lit hands · EFT: window light & steaming cup · Tarot: cards on dark textile |
| 4 | **Safe · Nurturing · Authentic** | Reassure | ~200 (was 1,035) | slim ivory ribbon: three words with hairlines and one-line captions; full copy stays on About | none (velvet texture optional) |
| 5 | **SIT — coming May 1, 2027** | Announce (no claim of availability) | ~380 (was 757) | compact band over a dark candle photograph, "Ask to be notified" | candle flame (Huma Kabakci) |
| 6 | **Invitation** | Convert | ~440 (was 762) | smaller lotus (≈ 120 px) + H2 + CTA | none |
| 7 | **Footer** | Navigate/contact | ~800 (was 1,365) | two-column link grid, contact condensed, legal + credit unchanged | none |
Estimated total **≈ 4,000 px ≈ 4.8 screens** (from 8.8). Desktop keeps its current structure but gains the photography (see each section).

## 4. Section-by-section proposal
**1. Hero — preserve.** The approved logo, bloom, tagline and composition stay exactly. Only the bottom padding shrinks so the next section peeks in. *Photo: no.*

**2. Meet Lise.**
- *Wrong:* a half-screen empty arch pushes the actual content below the fold; two paragraphs of near-identical soft copy.
- *Change:* mobile = compact arched thumbnail beside the heading (keeps the brand's arch motif, loses the emptiness); keep the lead paragraph, move the second paragraph to About; add the verified credential strip (also strengthens E-E-A-T/SEO). Desktop = the full arch, now filled with a photograph.
- *Photography:* there is **no photo of Lise**, and stock people would misrepresent her. Use an atmospheric still life (dried gold botanicals on black cloth) inside the arch *until Lise supplies a real portrait* — the existing `site.lise.photo` hook swaps it in with no layout change. Strongly recommend a real portrait.
- *Decoration:* keep the arch shape and the moons glyph (small); remove the two oversized leaf shadows.

**3. Services (Reiki · EFT · Tarot).**
- *Wrong:* three tall plum boxes, each a 96 px line icon + blurb + link; 1,576 px; every service looks the same; the modes line is repeated.
- *Change:* photographic tiles with a plum/midnight scrim for contrast (≥ 4.5:1), the existing line illustration reduced to a 40 px gold badge in the corner so each service is visually distinct *and* on-brand; the full tile is a single, large tap target to its service page; CTA ("Book a first conversation") stays in the hero, sticky pill and Invitation. Tablet/desktop: 3 columns with taller tiles.
- *Photography:* yes — this is where it adds most (see §5): amber candle-lit hands for Reiki, a steaming cup in window light for EFT ("plain words, at your own pace" — no EFT-tapping photograph of acceptable quality was found), tarot cards on dark textile for Tarot.
- *SEO:* headings "Reiki", "Emotional Freedom Technique", "Tarot Readings" and their blurbs stay in the HTML as real text.

**4. Values.** *Wrong:* 1,035 px to say three words with one-liners, duplicated on About. *Change:* a slim ribbon (three words, hairline dividers, one short caption each on desktop); drop the three 48 px leaf icons. *Photo:* none (optional plum-velvet texture behind). *Decoration:* remove the leaf icons; keep the hairlines.

**5. SIT band.** *Wrong:* 757 px with a 234 px glossy orb that explains nothing. *Change:* compact band; the date is typographic ("May 1, 2027" in gold); wording stays "coming", "ask to be notified"; no certification claim. *Photo:* dark candle flame as the band's background (reads as anticipation, not as a service). *Decoration:* replace the orb with the photo; keep a few stars (clipped by an inner layer, not the section).

**6. Invitation.** *Wrong:* 762 px, lotus + two sprouts take 228 px. *Change:* keep one small lotus (it echoes the logo — the one botanical that earns its space), shorter spacing, same CTAs. *Photo:* none.

**7. Footer.** *Wrong:* 1.6 screens of single-column links. *Change:* two-column link grid, tighter contact block, same legal lines and "Built by Framework" credit. *Photo:* none.

## 5. Photography plan (Unsplash — read-only research; nothing downloaded yet)
Contact sheet: `docs/images/photo-shortlist.jpg`. Selection rules: warm, low-key, palette-matched (midnight/plum/amber/gold); **objects, hands and textures — no faces, no identifiable people**; nothing that implies a procedure or a claim (no "healing" glow effects on a body); no Windsor/Detroit skyline stock (bright blue, misrepresents the brand and the place).
| Use | Primary | Alternates | Why |
|---|---|---|---|
| **Reiki** tile | [Diego Céspedes Cabrera — qP12JMidR9c](https://unsplash.com/photos/qP12JMidR9c) (hands cupping a candle flame, black ground) | [Nazreen Banu — tFDo5PoKBtA](https://unsplash.com/photos/a-person-holding-a-lit-candle-in-their-hands-tFDo5PoKBtA), [Liana S — hZ2Y4UtmAV4](https://unsplash.com/photos/a-hand-reaching-towards-a-blurry-orange-light-hZ2Y4UtmAV4) | gentle, warm, intimate; hands/objects only; amber matches the gold |
| **EFT** tile | [Charmil Gandhi — MK60jE_6zXU](https://unsplash.com/photos/MK60jE_6zXU) (steaming cup, window light) | [Peter Herrmann — f9EcQ6berNU](https://unsplash.com/photos/a-coffee-cup-sitting-on-top-of-a-saucer-f9EcQ6berNU) | a calm, grounded moment; honest metaphor (no tapping photo found) |
| **Tarot** tile | [Airis Noyer — -Vykfrw_D-A](https://unsplash.com/photos/-Vykfrw_D-A) (tarot cards + candle on dark floral textile) | [Joanna Kosinska — WS6mBfVe3dQ](https://unsplash.com/photos/a-table-topped-with-cards-and-a-candle-WS6mBfVe3dQ) | real tarot imagery, jewel tones that sit with plum/gold |
| **Meet Lise** arch (placeholder until a real portrait) | [Annie Spratt — cc9o5b3CPU4](https://unsplash.com/photos/white-flowers-on-black-textile-cc9o5b3CPU4) (dried gold botanicals on black cloth) | [Annie Spratt — 9rTCfL5yGWI](https://unsplash.com/photos/green-leaves-with-white-flowers-9rTCfL5yGWI) | botanical + gold, echoes the logo's leaves |
| **SIT** band | [Huma Kabakci — bMLxl5Orl5s](https://unsplash.com/photos/bMLxl5Orl5s) (candle flame, bokeh) | — | anticipation without implying a service |
| Texture (optional, Values/Footer) | [Kássia Melo — MuUwn0geeec](https://unsplash.com/photos/MuUwn0geeec) (plum velvet) | [Dylann Hendricks — yVSfW1UrFwY](https://unsplash.com/photos/yVSfW1UrFwY), [Jasmin Egger — ssMZ2Hp3fdM](https://unsplash.com/photos/ssMZ2Hp3fdM) | on-palette depth, replaces flat colour |
| Lotus (optional, About) | [Nong — Hqa-Ymae0k0](https://unsplash.com/photos/Hqa-Ymae0k0) | [Heramb Savarkar — aTzP-TVUZVs](https://unsplash.com/photos/aTzP-TVUZVs) | only if a second lotus is wanted; the logo already carries one |
**Honesty notes:** the hands/people in the Reiki shots are real strangers (cropped to hands; none is Lise) — acceptable as atmosphere, not as a depiction of her practice; no photo shows a "Reiki session". Photo of Lise/her space from the client always outranks stock.
**Treatment & performance:** local copies via Astro `<Image>`/sharp: AVIF + WebP + JPEG fallback, widths 360/540/720/960, `sizes` per layout, explicit width/height (no layout shift), `loading="lazy"` + `decoding="async"` (hero untouched), a dominant-colour background as placeholder, and a build-time plum grade so every photo sits in the palette (static grade at build — no CSS filters/blend modes, per the Safari rules). Budget: **≤ 45 KB per mobile image, ≤ ~160 KB added to the home page**, no change to LCP (hero unchanged).
**Licensing:** [Unsplash License](https://unsplash.com/license) — free for commercial use, no permission or attribution required (attribution appreciated); not allowed: selling unaltered copies or compiling images into a competing service; no model/property releases for identifiable people or brands. Each photo's page is re-checked at download (and Unsplash's download-tracking endpoint is called as their API guidelines ask). Records go in `docs/IMAGE-CREDITS.md` (id, photographer, URL, licence, date, where used) with an optional discreet "Photography: Unsplash contributors" line on About/Privacy.

## 6. Sticky booking button
- *Now:* 72 px full-width bar (8.5 % of the viewport), always visible after the hero, backed by a solid strip.
- *Proposal:* a **floating pill** (44–48 px tall, ~270 px wide, centred, safe-area aware, soft plum shadow, no full-width backing) — ~40 % smaller footprint and content shows around it. It **hides** while the Invitation, Footer or any form is on screen (IntersectionObserver), and when the on-screen keyboard is open. Still ≥ 44 × 44 px, focusable, `aria-label` kept, reduced-motion respected.

## 7. Dividers
- One signature divider instead of six: a hairline gold rule with a small fleur-de-lis (no filled disc, 22–26 px) rendered in its **own zero-height element between sections** so no section's `overflow` can clip it and no sibling layer can dim it; scroll-unfold animation (opacity/transform only) retained.
- Use it at **2 transitions** (hero → Meet Lise, and Services → Reassurance); the others are separated by the colour change alone (dark ↔ light rhythm is already strong).
- SIT section: clip the stars in an inner container, not the whole section.
- Verified after build at 320/390/430/768/1440 that it is centred and fully visible at progress 0 → 1.

## 8. Rhythm of dark and light (mobile)
Plum hero → **ivory/linen** Meet Lise → **midnight** photographic services → **linen** ribbon → **midnight-photo** SIT band → **ivory** Invitation → midnight footer: alternating, each band 200–930 px, none a full screen of nothing. Mobile section padding 72 → 48–56 px; fluid scale for ≥ 768.

## 9. Responsive & other pages
- **320 / 390 / 430:** tiles stack; ribbon words wrap to 3 lines max; pill never exceeds 90 % width. **768 portrait:** 2-up tiles + wide tile; **iPad landscape (1024) / desktop 1440:** 3-column tiles, full photographic arch beside Meet Lise, current desktop spacing kept.
- **About** inherits the compact arch and gets a shorter principles list (2×2) — Training section stays (it is content). **Services** page reuses the tile component. **Service pages** keep their structure (already 5.5 screens).
- Out of scope unless you ask: Book/Contact layouts, copy rewrites beyond trimming repetition, new animations.

## 10. Guardrails (unchanged)
Approved logo/bloom/tagline/hero composition, brand colours and fonts, SEO (titles, descriptions, headings, JSON-LD, internal links), booking/contact behaviour, accessibility (axe 0 violations, contrast ≥ 4.5:1 on photo text, focus rings, reduced motion), Safari rules (no filters/blend modes in motion), performance (CLS 0, LCP unchanged), `check:seo`/`check:motion`/forms E2E must stay green.

## 11. Decisions I need from you
1. **Meet Lise image:** (a) botanical still-life in the arch until a real portrait exists *(recommended)*, (b) no photo (illustration only), or (c) ask Lise for a portrait now.
2. **Reiki photography:** OK to use cropped candle-lit hands (strangers, no faces)? Or prefer a candle/object-only image?
3. **EFT:** steaming cup in window light (recommended) vs keeping the line illustration only.
4. **Sticky button:** floating pill (recommended) vs a slimmer full-width bar (48 px).
5. **Dividers:** two signature dividers (recommended) vs none.
6. **Attribution line** for Unsplash photographers on the site (optional) — yes/no.
7. Anything in the shortlist you want swapped (see the contact sheet).

## 12. Implementation plan (after approval — staging only)
1. Components: `PhotoTile` (service tile), compact `Portrait`, `Divider`, slim `StickyBookBar`, 2-column footer; tokens for mobile spacing.
2. Download chosen photos → `src/assets/photos/`, graded + responsive via Astro Image; `docs/IMAGE-CREDITS.md`.
3. Trim copy duplication (SEO headings kept); restructure Home; apply to About/Services.
4. Verify: widths 320/390/430/768 (portrait + landscape)/1024/1440, axe, `check:seo` (staging + production modes), `check:motion`, forms E2E, bloom regression, before/after screens + page-height and CWV numbers; real-iPhone manual checklist.
5. Deploy to staging branch only; report before/after.

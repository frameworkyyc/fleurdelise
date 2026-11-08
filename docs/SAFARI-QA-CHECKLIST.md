# Safari QA checklist — regular AND Private Browsing

Why both: a confirmed bug (animated blur/drop-shadow keyframes → white rectangle) appeared **only in iPad Safari Private Browsing** ([SAFARI-LOGO.md](./SAFARI-LOGO.md)). WebKit is not available in our build sandbox, so everything below is a **manual on-device test** (iPad portrait + landscape, iPhone, macOS Safari). Run each item in a normal tab and a Private tab.

## Verified automatically (Chromium only) — NOT a substitute for Safari
Final logo pixel-identical; content visible with JS off / reduced motion / script failure / animations disabled; scroll-linked values monotonic; hover/focus/keyboard illustration states; axe 0 violations (11 pages × 3 viewports); no overflow/console errors; frame times (p95 16.8 ms desktop; throttled phone max 50 ms, none >50 ms); CLS ≈ 0; `check:motion` passes.

## Manual — cinematic bloom video (NEW — highest priority on Safari, regular AND Private)
Plays the **H.264 MP4** on a WebGL canvas (the test browser has no H.264, so this exact path is untested here).
- [ ] Bud opens into the lotus; crescent, moons, star and leaves emerge; **no white rectangle, no black box, no flashing** at any point
- [ ] The flower floats over the hero background (texture/glow visible around it) — **no visible rectangle/edge**
- [ ] Lettering fades in beneath the flower; hero text follows; CTA tappable
- [ ] Hand-off to the final logo is seamless: no jump, no doubled outlines, no re-fade after it settles
- [ ] Plays **once**; navigate away and back to Home in the same tab → no replay (static logo immediately); scroll up/down → no replay
- [ ] iPhone **Low Power Mode ON**: video refuses to autoplay → static logo + text appear within ~1.5 s (no blank hero)
- [ ] Reduce Motion ON: static logo + text immediately
- [ ] Private Browsing: same as above (sessionStorage may be unavailable → it may replay on each load; that's acceptable)
- [ ] Older iPad/iPhone (≤2 cores): static logo instead of video is expected
- [ ] Check smoothness on the slowest device you have; the page falls back automatically if it stutters

## Manual — hero
- [ ] Lotus line-art draws (arcs, petals open), then the **full-colour logo appears; no white rectangle** at any point
- [ ] Final state is the clean logo; no leftover gold lines
- [ ] Tagline, eyebrow, lead, CTA appear in sequence; CTA tappable
- [ ] Settings → Accessibility → Motion → Reduce Motion ON: static logo + text immediately, no overlay
- [ ] Reload mid-animation / back-forward cache (swipe back) still shows the logo

## Manual — scroll garden
- [ ] Seam medallions (fleur-de-lis) open on every section boundary — no flicker/white boxes
- [ ] Values sprouts and the booking lotus grow smoothly during **momentum scrolling** (iOS fires fewer scroll events — look for stutter)
- [ ] Booking section reaches full bloom when centred; headline + both buttons visible and tappable
- [ ] Page bottom: footer ornament + seam; no horizontal scroll
- [ ] macOS Safari ≥1440 px wide: edge vine grows up the left margin and blooms near the end

## Manual — interactive illustrations
- [ ] Service cards: illustration opens when scrolled into view; on iPad **tap** (hover) opens/keeps open and the card still navigates
- [ ] EFT dew/ripple animates; stops under Reduce Motion
- [ ] Keyboard (macOS Safari + external keyboard on iPad): Tab to a card link opens its illustration; focus ring visible

## Manual — header & cards (Stage 1 fixes)
- [ ] Header frosted glass fades in on scroll (no flash/white); inner pages show it immediately
- [ ] Card hover/tap glow appears behind the icon (no boxes); sticky mobile booking bar slides in cleanly (iPad portrait <900 px)

## Record
Device / iOS version / mode / pass-fail / screenshot for any failure. If something fails: isolate on a temporary unlinked noindexed page with one tile per suspect (method in ANIMATION-GUIDELINES.md), then delete it.

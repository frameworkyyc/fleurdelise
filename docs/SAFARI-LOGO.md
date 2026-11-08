# Safari (iPad, Private Browsing) hero-logo white rectangle — findings

**Status: root cause confirmed on device. Fixed and deployed to staging. Diagnostics page removed.**

## Symptom
Hero logo rendered correctly in Chrome. On iPad Safari a large white rectangle appeared in its place; the rest of the site loaded normally. Reloading with reduced privacy protections did not help.

## On-device test results (iPad Safari, Private Browsing, `/logo-test`)
| Tile | What it isolated | Result |
|---|---|---|
| A | Previous encoding (lossy WebP + alpha), no effects | ✅ works |
| B | Previous encoding + **static** `drop-shadow` filter | ✅ works |
| **C** | Previous encoding + **original entrance animation** (`blur()` → `blur(0)` + `drop-shadow()` keyframes, `fill-mode: both`) | ❌ **white rectangle** |
| D | New near-lossless WebP (VP8L), no effects | ✅ works |
| E | PNG fallback | ✅ works |
| F | New hero implementation (opacity/transform only) | ✅ works |

The original logo also worked in regular (non-private) Safari browsing.

## Root cause
The **animated `filter` keyframes** on the logo image — `filter: blur(8px) drop-shadow(…)` animating to `blur(0) drop-shadow(…)`, held with `animation-fill-mode: both` — render as an opaque white rectangle in iPad Safari **Private Browsing**.

Ruled out by the same test: the image file and its encoding (A works), the WebP lossy+alpha format (A), a static `drop-shadow` (B), the `<picture>`/PNG path (E, F).

**Unexplained:** why it only fails in Private Browsing (regular Safari was fine). We have not investigated further because the guidance is the same regardless: don't animate filters. Treat any Safari-specific rendering as needing a Private Browsing check too.

## Note on the encoding change
During investigation the logo was re-encoded from lossy+alpha WebP to near-lossless WebP (+~75 KB at 1024 px, visibly crisper) with a PNG `<picture>` fallback. Test A shows this was **not** needed to fix the bug. It is kept because it is verified working on device and the quality is better. If page weight ever matters more than crispness, the lighter lossy encoding is safe to restore (`scripts/build-brand-assets.mjs`).

## What is in place (the working implementation — preserve it)
- `src/components/Hero.astro`: `<picture>` (near-lossless WebP + PNG fallback); no CSS filter on the image; ambient shadow is a gradient pseudo-element; entrance animation is opacity/transform only; `fill-mode: backwards`; no `decoding="async"`.
- `src/scripts/site.ts`: 6-second safety net drops any unfinished hero entrance animation.
- `prefers-reduced-motion`: animations off, everything visible.
- `scripts/check-motion.mjs` (runs in every `npm run build`): **fails the build** if any `@keyframes` contains `filter`, `backdrop-filter`, `blur()` or `drop-shadow()`; warns on `transition`/`will-change` with filters.

## Verified automatically (Chromium)
Old vs new hero render identically in layout (desktop, iPad-size, phone-size at 2×/3×); logo visible with animations disabled, reduced motion, missing keyframes, JS disabled, and frozen animations (the old version stays invisible when frozen); PNG fallback loads when WebP is unrecognised; axe 0 violations.

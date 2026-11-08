# Safari / iPad hero-logo issue (white rectangle) — investigation notes

**Symptom:** hero logo renders in Chrome; on iPad Safari a white rectangle appears instead. Rest of site fine.

**Not reproducible here** (no WebKit in the build sandbox) — see "Still needs on-device confirmation".

## Evidence gathered
- Served logo bytes and headers were correct (verified before the staging domain was put behind Cloudflare Access); decodes cleanly in libwebp; alpha matches the original PNG (MAE 0.07).
- The hero logo was the **only** image on the site stored as *lossy WebP + separate alpha plane* (`VP8X+ALPH+VP8`). Every other WebP (sub-marks) is plain lossy with no alpha, and those render fine.
- The hero logo was also the **only** element animated with CSS `filter` (`blur()` + `drop-shadow()` keyframes, `fill-mode: both`) plus a permanent `drop-shadow` on the `<img>`, and used `decoding="async"`.

## Changes (defence in depth; logo artwork unchanged)
1. Re-encoded as **near-lossless WebP (VP8L, native alpha)** — 46.7 dB vs 29.1 dB before; `<picture>` with a **PNG fallback**.
2. **No CSS filter on the image**; ambient shadow is a gradient pseudo-element. Entrance animation is opacity/transform only.
3. Animation `fill-mode: backwards` (not `both`): base style is fully visible if an animation doesn't run or finish.
4. Removed `decoding="async"` from the LCP hero image.
5. JS safety net (6 s): any hero entrance animation still unfinished is dropped, leaving the element visible.
6. `/logo-test` (staging only, unlinked, noindex; stripped from production builds) isolates each suspect on-device.

## Still needs on-device confirmation (iPad Safari)
Open `/logo-test`, screenshot the full page, and note which tiles A–F show the logo, a blank area, or a white box.

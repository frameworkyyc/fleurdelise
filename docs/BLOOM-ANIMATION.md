# Cinematic hero bloom — Higgsfield + stacked-alpha playback

Replaces the earlier SVG line-art overlay (which could not align perfectly with the logo and doubled outlines). The lotus now genuinely blooms (AI-generated video), then hands off to the **exact approved logo**.

## How the animation was made (Higgsfield — no other provider used)
Higgsfield is reachable from the build environment through the connected integration (no API key is handled by the code). Image-to-video with **start + end frame** control is supported by several models; this account is on the **Starter** plan (Kling 3.0 requires Plus — not used, no plan changes made).

| Step | Detail |
|---|---|
| Reference split | `scripts/bloom/split-logo.py` splits the approved logo (C) into a pixel-exact **emblem** layer and **wordmark** layer (asserts emblem + wordmark == original). The AI animates only the emblem; the lettering is always original artwork. |
| End frame | exact emblem on flat Velvet Plum #4C1F31, 16:9 (`brand-originals/bloom-source/end-frame-emblem-1920x1080.png`). Canvas = logo space (0,0)–(1536,864), so video and logo register exactly. |
| Start frame | closed bud generated with **GPT Image 2.6** (high, 2K) using the emblem as the style reference, keyed onto exact plum, base placed at the lotus base. |
| Video model | **Wan 3.0** (`wan3_0`), 1080p, 4 s, no audio, 16:9, start_image + end_image. Chosen after comparing Gemini Omni Flash 1.2 (more particles/flare, ghosting) — MiniMax H3 failed (refunded); Kling 3.0 unavailable on Starter. |
| Cost | Wan 14 cr · Gemini comparison 13 cr · bud images 8.25 cr · MiniMax 8 cr refunded → **35.25 credits net** (145 → 109.75). |

**Prompt (Wan 3.0):** "Locked-off static camera, no zoom, no pan. A small closed lotus bud on a flat Velvet Plum background slowly and gracefully blooms. The petals physically unfold outward in organic layers, outer petals peeling open first, then the inner petals, until the lotus is fully open with its purple petals, fine gold edge lines and warm cream glow at the centre. As the flower finishes opening, green leaf sprigs gently extend outward from both sides of its base. Then a golden crescent moon arc, a gold orb, small crescent moons, an eight-pointed gold star and tiny gold sparkles softly appear around the flower. The final frame is exactly the reference end image, completely still. Elegant, calm, premium, natural botanical movement. The background stays perfectly flat plum the whole time. No text, no letters, no particles, no lens flares, no exaggerated glow, no camera motion, no melting or morphing artifacts."

Job IDs (Higgsfield): Wan `3d4083ce-142e-42b6-8026-b5a74715f5a3`, Gemini `60c157c0-4df2-4ea2-b6ad-550496f605b0`, bud image `ec3f6ce6-8d01-41d8-874a-b587b79d839d`. Source video kept in `brand-originals/bloom-source/`.

## Brand fidelity
AI output is never shown as the final state. `scripts/bloom/pack-bloom.py` **dissolves the last ~0.8 s toward the exact approved emblem** (baked into the video), so the clip ends on the approved artwork; the page then cross-fades to the real static logo over identical pixels. The lettering is the original pixels (`logo-wordmark-1024.webp`), faded in beneath the flower. Measured: decoded final frame vs approved emblem ≈ 6–8 levels/channel mean error (codec floor); hand-off is a 0.5 s cross-fade.

## Delivery pipeline
`wan.mp4` → `pack-bloom.py` → keys the flat plum to alpha (colour un-mixing, hole-filled matte) → **stacked-alpha** video (top = premultiplied colour, bottom = alpha matte) → `public/brand/bloom/bloom.mp4` (H.264 High@4.0, **720 KB**, Safari/iOS) and `bloom.webm` (VP9, **678 KB**, Chrome/Firefox/Android); plus a 720 px `lite/` variant for A/B. Colour 930×524 (stack 930×1048), **native 30 fps**, 3.37 s, cropped to the emblem footprint (logo-space 150,0,1240,700 — the page positions the canvas to match, see `Hero.astro` / `bloom.json`); a 0.47 s player-side still hold restores the original 3.83 s hand-off. Re-pack: `python3 scripts/bloom/pack-bloom.py brand-originals/bloom-source/wan3_0-source-1080p.mp4 public/brand/bloom --width 930 --crop 150,0,1240,700 --trim-start 0.15 --end-frame brand-originals/bloom-source/end-frame-emblem-1920x1080.png --blend-from 2.7 --blend-to 3.5 --end-at 3.5 --crf-h264 22 --crf-vp9 36` (lite: `--width 720` into `public/brand/bloom/lite`). **Never resample the frame rate** — see [BLOOM-PERFORMANCE.md](./BLOOM-PERFORMANCE.md).

Why stacked alpha: a normal video is an opaque rectangle and would show as a flat-plum patch over the hero's texture/glow (the brand kit also forbids texture over the logo). Stacked alpha gives true transparency in **every** browser with ordinary H.264/VP9 (no HEVC-alpha/WebM-alpha dependence, which Safari lacks), composited on a small WebGL canvas (`src/scripts/bloom.ts`). No CSS filters or blend modes (docs/SAFARI-LOGO.md).

## Playback behaviour
- Plays **once per tab session**, never on scroll; never replays from bfcache.
- Timeline: bud opens → hero text released at 1.3 s → lettering fades in at 1.8 s → clip ends 3.37 s → still hold → hand-off at ≈3.8 s. Ambient hero animations pause while it plays.
- The **static logo is always the fallback** and is shown immediately (or after ≤1.2 s) when: reduced motion, data-saver, 3G-or-slower, ≤2 cores / ≤2 GB, no WebGL, autoplay refused (iOS Low Power Mode), tab hidden, no first frame within 1.2 s, corrupt/404 file, WebGL context loss, or choppy playback (callback gaps > 66 ms, i.e. < 15 fps, for half of the first 24 frames). An independent inline failsafe (3.5 s) and a watchdog guarantee the logo is never left hidden.
- No layout shift (fixed-aspect frame); video is `preload="auto"` only when the bloom will run.

## Tuning knobs
`src/scripts/bloom.ts`: `GO`, `WORD`, `START_TIMEOUT`. `Hero.astro`: text delays (relative to the cue). `pack-bloom.py`: `--blend-from/--blend-to` (how late the dissolve to exact begins), `--crf-*`, `--width`.

## Known trade-offs
- **LCP ≈ 3.0 s** on desktop in bloom mode (the lettering layer is the largest paint and arrives at ≈2.1 s; the static/fallback path is ≈1.2 s). This is the cost of a choreographed reveal; shorten `WORD`/trim the clip if LCP matters more.
- Software-rendered test browsers log "GPU stall due to ReadPixels"; real GPUs do not.
- The H.264/Safari path could not be decoded in the test browser (no proprietary codecs) — see SAFARI-QA-CHECKLIST.md.

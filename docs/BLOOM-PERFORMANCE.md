# Bloom playback smoothness — investigation, fixes, measurements

Reported: playback of the hero lotus bloom felt slightly laggy on iPad Safari. This documents what was measured, the root causes, what changed, and how to verify on a real iPad.

> **Honesty note.** WebKit is not available in the build sandbox, so *all numbers below are from Chromium with software GL.* They are reliable for **relative** comparison and for attributing cost, **not** for predicting absolute iPad timings (an Apple GPU is far faster at uploads). The debug HUD (below) exists so the real iPad numbers can be captured in one visit.

## Root causes (ranked by confidence)
1. **Frame-rate conversion judder — a bug I introduced (certain).** Higgsfield delivered **30 fps (120 frames)**. `pack-bloom.py` resampled to **24 fps**, which drops every 5th source frame (a regular hitch) *and* puts 24 fps on an uneven 3:2 cadence on 60 Hz displays. 30 fps divides evenly into 60 and 120 Hz. **Fix: encode at the native 30 fps, no resampling** (`--fps 0` default; the packer now warns if you resample).
2. **Per-frame GPU texture re-allocation + full-size upload (measured).** The player called `texImage2D(video)` every frame (re-allocating the texture each time), cleared a buffer it immediately overwrote, and uploaded a 1152×1296 stacked frame (1.5 MP) of which ~40% was empty plum. **Fix:** allocate once + `texSubImage2D`; no clear/blend/dither; the video is **cropped to the emblem's footprint** (same pixel density, −35% pixels: 930×1048); canvas never larger than the video; rAF fallback only uploads on a new frame.
3. **WebGL upload/composite is the only cost that scales with device weakness (measured).** See attribution below. It is now ~⅓ cheaper per frame and no longer dominates at desktop speeds, but it still exists.
4. **Ambient hero animations competing (not measurable here; fixed defensively).** The copper `.glow` used the individual `scale`/`translate` CSS properties (not reliably GPU-accelerated in Safari) — converted to `transform`. Dust/twinkle/glow/scroll-cue are **paused while the bloom plays** and resume at hand-off.
5. **Possible WebKit invisibility throttling (unproven).** The decode video was `1px × 1px` at `opacity:0`; WebKit can treat such videos as not visible. Now `16px`, still invisible. Precautionary only.

## Attribution (where the lag does and does not come from)
| Test (Chromium, 4× CPU throttle, ≈ iPad-class) | video cadence | display (rAF) janky frames |
|---|---|---|
| **Decode only** (`?bloom-debug=nogl`: video plays, nothing uploaded/drawn) | perfect 30 fps (33.3 ms), even at **6×** | **0 / 201** |
| Ambient hero animations ON vs OFF | no measurable difference | — |
| **GL composite on** (shipped path) | collapses to ~15 fps | 51 / 85 |

→ **Video decoding, JavaScript logic, scheduling and the other page animations are not the bottleneck. The cost is the per-frame video→WebGL texture upload + composite.**

## Before vs after (same harness, 3 runs each, median; software GL)
| | Before (deployed 4274ef0) | After (shipped) |
|---|---|---|
| Video | 1152×1296 @ **24 fps** (resampled, frames dropped) | 930×1048 @ **30 fps** native |
| **CPU 1×** video-callback interval | mean 43.8 ms, p95 66.8, jitter SD 19.9 | mean 33.3, p95 50.1, SD 15.9 |
| CPU 1× GL upload / frame | 13.9 ms (total 1211 ms) | **9.5 ms** (total 954 ms) |
| **CPU 1× display frames > 25 ms** | **55 / 173 (32%)** | **2 / 196 (1%)** |
| CPU 4× GL upload / frame | 60.7 ms | 41.9 ms |
| CPU 4× display mean frame | 80.6 ms | 39.4 ms |
| CPU 4× long-task time | 3892 ms | 2592 ms |
| CPU 6× | static fallback | static fallback |
| File size (MP4 / WebM) | 598 / 489 KB | 720 / 678 KB (more frames: +25%) |
| Hand-off time | ≈ 4.55 s | ≈ 4.50 s (unchanged) |

At desktop speed the frame pacing is now essentially clean; on emulated weak hardware it is better but still not smooth — which is why the guard hands such devices the static logo (cb gaps > 66 ms for half of the first 24 frames → static).

## Resolution / frame-rate / encoding evaluation (WebM, crop fixed, 1× CPU)
| Colour width | Stacked px/frame | GL upload / frame | Display frames > 25 ms | WebM |
|---|---|---|---|---|
| 720 (**lite**, `?bloom-q=lite`) | 0.58 MP | 5.8 ms | 1 / 198 | 459 KB |
| **930 (default)** | 0.97 MP | 9.2 ms | 1 / 200 | 678 KB |
| 1152 | 1.50 MP | 13.7 ms | 15 / 185 | 939 KB |
Cost is ~linear in pixels. 930 keeps the same pixel density as before (0.75 video px per logo px); 720 is visibly softer. CRF 22 (H.264) / 36 (VP9) was chosen to match the previous encode's fidelity (final-frame error ≈ 8–9 levels/channel; unchanged). Frame rate: **keep 30 — do not raise it** (no new frames exist) **and do not lower to 24** (judder).

## Can real-time WebGL compositing be eliminated? (investigated)
| Option | Verdict |
|---|---|
| **HEVC-with-alpha MOV/MP4** (Safari-native, hardware, zero JS) | The ideal Safari path, but it **cannot be produced or verified here**: no VideoToolbox/avconvert (macOS only), no MP4Box/gpac, and ffmpeg's libx265 exposes no multilayer/alpha option. A wrongly-structured file shows as an opaque black box on Safari. **Best next step if you have a Mac:** export `bloom` as HEVC-with-alpha with Apple Compressor / `avconvert` (or ffmpeg `hevc_videotoolbox -alpha_quality`), pair with a VP9-alpha WebM for Chrome/Firefox, and play both in a plain `<video>` with no canvas. I can integrate it the moment such a file exists. |
| WebM VP9 alpha | Encodable here, but Safari does not render VP9 alpha. |
| Opaque `<video>` + CSS `mix-blend-mode`/`mask` | Breaks colour fidelity and/or relies on blend modes/masks on video — a known WebKit risk class (see SAFARI-LOGO.md). Not recommended. |
| Opaque video with baked background | Shows a visible patch over the hero's texture/glow unless the hero background is redesigned. |
| Animated WebP/AVIF/APNG | ~3–5 MB, CPU-decoded on iOS, no playback control. |
| WebCodecs → OffscreenCanvas in a worker | Moves upload off the main thread but needs an MP4 demuxer (~100 KB) and Safari ≥ 16.4; high complexity. |
| Half-resolution alpha plane (layout 1.5× instead of 2×) | −25% pixels; softens thin features (star spikes, dots). Not applied — would change visual quality. A candidate if iPad data shows more is needed. |

## Behaviour that did not change
Sequence, timing (GO 1.3 s, lettering 1.8 s, hand-off ≈ 3.83 s from video start), appearance, once-per-session, all static fallbacks, reduced-motion, accessibility, and the exact static logo as the final state.

## New switches (all optional, query-string)
- `?bloom-debug` — force the bloom (ignores once-per-session and low-core/slow-network gates; still honours Reduce Motion) and show a **HUD with playback stats** when it ends.
- `?bloom-debug=nogl` — decode only (video plays, nothing is uploaded/drawn: the screen stays blank until hand-off). Isolates decode cost from GL cost.
- `?bloom-q=lite` — 720 px variant (≈ 40% cheaper uploads) for A/B.
- `?bloom=off` — force the static logo.

## MANUAL iPad / Safari smoothness protocol (please run; regular **and** Private Browsing)
Use the iPad's actual orientation(s). After each run the HUD appears bottom-left (select-all to copy, or screenshot). Compare *feel* first, numbers second.
1. `…/?bloom-debug` — the shipped path. Does it feel smooth? Note HUD `cbMeanMs` (≈33 ideal), `cbMaxMs`, `skippedFrames` (0 ideal), `uploadMeanMs`, `displayOver25ms` (small is good).
2. `…/?bloom-debug&bloom-q=lite` — same, 720 px. If this is clearly smoother, the iPad is upload-bound → ask me to switch the default / add auto-selection.
3. `…/?bloom-debug=nogl` — decode only; read `cbMeanMs`/`skippedFrames`. If this is *not* ≈33 ms, the problem is decode/OS-level (tell me the iPad model + iOS version).
4. `…/?bloom=off` — baseline static logo for comparison.
5. Also try: Low Power Mode on/off; Safari with other tabs closed; both 60 Hz and (if ProMotion) 120 Hz iPads.
Please send: iPad model, iOS version, the HUD text for runs 1–3, and which one felt best.

# Animation guidelines — Safari-first (incl. Private Browsing)

Motivated by a confirmed bug: animated `blur()`/`drop-shadow()` keyframes rendered as a white rectangle on iPad Safari Private Browsing ([SAFARI-LOGO.md](./SAFARI-LOGO.md)). These rules apply to all new motion, including the upcoming botanical "blooming" animations. `npm run check:motion` enforces the hard rule.

## Hard rule (build fails)
No `filter`, `backdrop-filter`, `blur()` or `drop-shadow()` inside any `@keyframes`.

## Use
- **`opacity` and `transform`** (translate / scale / rotate) — compositor-friendly and Safari-safe.
- **SVG for botanicals**: animate SVG elements with CSS transforms (`transform-box: fill-box; transform-origin: …`) and opacity. For line-draw effects, `stroke-dashoffset` with `pathLength="1"`.
- **Soft glow without filters**: radial-gradient pseudo-elements animating opacity/transform (as the hero glow does), or soft edges baked into the artwork (semi-transparent layered shapes, gradients).
- **Visible base state**: write the CSS so the *final* look is the element's normal style, and use `animation-fill-mode: backwards` (not `both`). If an animation doesn't run or finish, the element is still fully visible.
- **Stagger with custom properties** (`animation-delay: calc(var(--i) * 90ms)`), a handful of animated elements at a time.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` → no animation, final state shown.
- **Safety net**: add new entrance-animation selectors to the list in `src/scripts/site.ts` so a stalled animation is dropped after 6 s.

## Avoid
- Animating or transitioning `filter` / `backdrop-filter` / SVG filter primitives (`feGaussianBlur`, `feDropShadow`).
- Putting a `filter` on an image that is also animating.
- Animating `mask-image`, `clip-path`, large `box-shadow`, or layout properties (`width`, `height`, `top`, `left`) — test on device first, prefer transforms.
- Heavy `will-change` use, or very large composited layers.
- `decoding="async"` on the LCP/hero image.

## Bloom recipe (sketch)
```css
.petal { transform-box: fill-box; transform-origin: 50% 100%;
         animation: bloom 1.4s var(--ease-slow) backwards; animation-delay: calc(var(--i) * 120ms); }
@keyframes bloom { from { opacity: 0; transform: scale(.2) rotate(-14deg); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .petal { animation: none; } }
```

## Testing checklist for every new animation
1. `npm run check:motion` passes (runs in every build).
2. Chromium automated: final state visible with `animation: none`, reduced motion, JS disabled, and paused animations (safety net).
3. **On device: iPad/iPhone Safari in regular AND Private Browsing.** If something looks wrong, isolate it on a temporary, unlinked, noindexed page with one tile per suspect (this is how the logo bug was found), then delete the page.

## Known advisory items (existing, not yet changed)
`check:motion` warns about two existing `transition`s that include a filter property: `.site-header` (`backdrop-filter`, on scroll) and the service-card icon hover glow (`filter: drop-shadow`). They have not caused a reported problem; verify on Private Browsing and consider replacing with opacity/transform equivalents.

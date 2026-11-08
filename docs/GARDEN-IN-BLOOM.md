# Garden in Bloom — design & implementation

> **Note on specs:** the "previously discussed" Garden in Bloom brief and "botanical motion-design specifications" were not available in this working session. This was built from the written brief (premium immersive botanical site; animated blooming lotus logo; flowers growing on scroll; subtle French-Canadian fleur-de-lis; interactive botanical service illustrations; fully blooming booking section; Safari-safe; exact logo as final state) plus Brand Kit v5. Please review against the original specs — timings and motifs are centralised so they are easy to retune.

## Concept
One continuous garden. The visitor arrives at a lotus that draws itself and *becomes* the brand mark; a vine roots at the bottom of the screen and climbs as they scroll; fleur-de-lis medallions open on every section seam; each service has a botanical that opens when touched; the page ends with a fully bloomed lotus around the booking call to action.

## What is where
| Moment | Component | Driver |
|---|---|---|
| **Hero: blooming lotus → exact logo** | `garden/HeroBloom.astro` + `Hero.astro` | CSS keyframes (≈3.2 s): stem & star, crescent draws, 9 line-art petals fan open, sprigs & celestial details, then the **exact logo fades in beneath** and the drawing dissolves. Overlay is `opacity: 0` at rest. |
| **Flowers growing on scroll** | `garden/GardenVine.astro` (≥1440 px), `garden/Sprout.astro` (values), `garden/Lotus.astro` | `garden.ts` writes `--p` (0→1); CSS maps to transform/opacity/stroke-dash |
| **Fleur-de-lis details** | `garden/FleurDeLis.astro`, `garden/SeamOrnament.astro` | Medallion unfolds (scale/rotate/opacity) on each section seam; footer ornament |
| **Interactive service illustrations** | `garden/ServiceIllustration.astro` (`reiki` lotus, `eft` fern + dew, `tarot` star-flower) | Open on hover, keyboard focus, and once scrolled into view (so touch devices bloom too). Rest = bud / young frond / lone star. |
| **Fully blooming booking section** | `Invitation.astro` (used on Home, About, Services) | Lotus + flanking flowers + star reach full bloom as the section centres; headline and CTAs rise in with it |

## Exact-logo guarantee
The approved logo is never redrawn, recoloured or altered. The bloom is a *separate, decorative* gold line drawing positioned in the logo's own 1536×1024 coordinate space (measured from the supplied artwork). The final frame is the unmodified logo: verified pixel-identical (0.000 diff) with the overlay present vs removed.

## Engine (`src/scripts/garden.ts`, `src/styles/garden.css`)
- `data-grow` → viewport-linked `--p` (eased). Tunables: `data-grow-start` / `data-grow-end` (fractions of viewport height).
- `data-grow-page` → whole-page progress (vine).
- `data-bloom` → adds `.is-bloomed` once ≥55 % visible.
- `.gl` + `--s` (start) / `--w` (window) → staggered local progress `--lp`.
- `.g-draw` paths get `--len` from `getTotalLength()`.
- **Fail-safes:** no JS / reduced motion / script failure (4 s timer adds `.garden-fail`) → `--p = 1`, everything fully bloomed. Hero animations use `fill-mode: backwards`; a 7.5 s safety net drops any unfinished hero animation.

## Safari-safe rules followed (see ANIMATION-GUIDELINES.md)
Transform + opacity + stroke-dashoffset only; no `filter`/`backdrop-filter`/blur anywhere in motion; no `vector-effect`; no animated masks/clip-paths; `check:motion` passes in every build.

## Retuning
Hero timing: `HeroBloom.astro` (delays/durations) and `Hero.astro` (logo `1.5 s` delay, text delays 2.0–3.1 s). Brand colour use: line art is gold on plum / bronze on linen per Brand Kit §05 (the lotus purples stay inside the logo artwork).

## Outstanding items for review
1. Compare with the original Garden in Bloom specs (not available to this session).
2. The botanical line art and the fleur-de-lis are **my own vector drawings** — design review for craft, brand fit and cultural/heritage fit.
3. Hero is now ≈4.5 s from first paint to CTA (was ≈3.5 s). Shorten if preferred.
4. Edge vine only appears ≥1440 px wide (needs free page margins). Mobile/tablet get seams, sprouts, illustrations, invitation bloom.
5. Real-Safari verification (regular **and** Private Browsing) — see SAFARI-QA-CHECKLIST.md.
6. Lise-supplied photography/illustration could replace or complement any of these.

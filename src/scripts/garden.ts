export {}; // module scope (avoids global name clashes between page scripts)
/**
 * Garden in Bloom — scroll engine (progressive enhancement; the page is complete without it).
 *
 *   [data-grow]       viewport-linked progress: --p goes 0→1 as the element's centre travels from `start` to `end`
 *                     (fractions of viewport height; defaults .92 → .5). Eased (smoothstep).
 *   [data-grow-page]  whole-page progress (scrollY / maxScroll) — used by the edge vine.
 *   [data-bloom]      adds .is-bloomed once ≥55% visible (for hover/touch-friendly illustrations).
 *   .g-draw           SVG paths: --len is measured with getTotalLength() so stroke-dash drawing is exact.
 *
 * Only unitless custom properties are written; CSS maps them to transform/opacity (garden.css).
 * Reduced motion: everything is set to fully bloomed immediately and nothing listens to scroll.
 */
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const smooth = (t: number) => t * t * (3 - 2 * t);

const setP = (el: HTMLElement, p: number) => {
  const v = p.toFixed(3);
  if (el.dataset.p !== v) { el.dataset.p = v; el.style.setProperty('--p', v); }
};

/* 1. measure stroke lengths for line-draw */
document.querySelectorAll<SVGGeometryElement>('.g-draw').forEach((path) => {
  try { path.style.setProperty('--len', String(Math.ceil(path.getTotalLength()) + 2)); } catch { /* ignore */ }
});

const grow = [...document.querySelectorAll<HTMLElement>('[data-grow]')];
const pageGrow = [...document.querySelectorAll<HTMLElement>('[data-grow-page]')];
const bloom = [...document.querySelectorAll<HTMLElement>('[data-bloom]')];

if (reduce) {
  [...grow, ...pageGrow].forEach((el) => setP(el, 1));
  bloom.forEach((el) => el.classList.add('is-bloomed'));
} else {
  /* 2. scroll-linked growth (single rAF-throttled passive listener) */
  let queued = false;
  let first = true;
  const update = () => {
    queued = false;
    const vh = innerHeight;
    for (const el of grow) {
      const r = el.getBoundingClientRect();
      // after the first full pass, skip elements far off-screen (their value is already 0 or 1)
      if (!first && (r.bottom < -300 || r.top > vh + 300)) continue;
      const start = parseFloat(el.dataset.growStart ?? '.92') * vh;
      const end = parseFloat(el.dataset.growEnd ?? '.5') * vh;
      const centre = r.top + r.height / 2;
      setP(el, smooth(clamp((start - centre) / (start - end))));
    }
    if (pageGrow.length) {
      const max = Math.max(1, root.scrollHeight - vh);
      const p = clamp(scrollY / max);
      pageGrow.forEach((el) => setP(el, p));
    }
    first = false;
  };
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  addEventListener('pageshow', request);
  update();

  /* 3. bloom-once (illustrations) */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-bloomed'); io.unobserve(e.target); }
    }, { threshold: 0.55 });
    bloom.forEach((el) => io.observe(el));
  } else bloom.forEach((el) => el.classList.add('is-bloomed'));
}

root.dataset.garden = 'ready';

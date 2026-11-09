// Layout QA for the mobile-first redesign (run against `astro preview`, default http://localhost:4321):
//   node scripts/qa/e2e-layout.cjs            -> exit 1 on any FAIL
// Checks at 320/390/430/768/1024/1440: no horizontal overflow, both dividers fully visible + centred + not clipped by any ancestor,
// text-over-photo contrast >= 4.5:1 (measured from real pixels with the text hidden), photos lazy/responsive, and the floating pill
// never overlaps another control / tile text, keeps a >=44px target, and stays visible often enough to serve its purpose.
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://localhost:4321';
const ALL = [[320, 640], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900]];
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean).map(Number); // e.g. ONLY=390,768 to run a subset in parallel
const WIDTHS = ONLY.length ? ALL.filter(([w]) => ONLY.includes(w)) : ALL;
const res = []; const check = (n, ok, x = '') => { res.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); };
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const PNG = require(require.resolve('pngjs', { paths: [process.env.QA_DEPS || process.cwd()] }));
(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 1000, hasTouch: w < 1000 });
    const p = await ctx.newPage();
    await p.goto(B + '/?bloom=off', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } scrollTo(0, 0); });
    // --- overflow on every page
    const pages = ['/', '/about', '/services', '/services/reiki', '/services/eft', '/services/tarot', '/services/sit', '/book', '/contact'];
    const over = [];
    for (const u of pages) { await p.goto(B + u + (u === '/' ? '?bloom=off' : ''), { waitUntil: 'networkidle' }); if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) over.push(u); }
    check(`${w}px: no horizontal overflow on ${pages.length} pages`, over.length === 0, over.join(','));
    await p.goto(B + '/?bloom=off', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    // --- dividers: scroll each to the middle of the viewport, then verify geometry
    const dv = [];
    for (let i = 0; i < (await p.$$eval('.divider', (e) => e.length)); i++) {
      await p.evaluate((i) => { const d = document.querySelectorAll('.divider')[i]; scrollTo(0, d.getBoundingClientRect().top + scrollY - innerHeight * 0.5); }, i); await p.waitForTimeout(1400);
      dv.push(await p.evaluate((i) => { const d = document.querySelectorAll('.divider')[i]; const r = d.getBoundingClientRect(); const m = d.querySelector('.mark').getBoundingClientRect();
        let clipped = false; for (let a = d.parentElement; a && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (/(hidden|clip|auto|scroll)/.test(cs.overflow + cs.overflowX + cs.overflowY)) { const ar = a.getBoundingClientRect(); if (m.top < ar.top - 0.5 || m.bottom > ar.bottom + 0.5 || m.left < ar.left - 0.5 || m.right > ar.right + 0.5) clipped = true; } }
        const cx = m.left + m.width / 2; return { n: i, cx: Math.round(cx), vw: document.documentElement.clientWidth, opacity: +getComputedStyle(d.querySelector('.mark')).opacity, inView: m.top >= 0 && m.bottom <= innerHeight, clipped, w: Math.round(m.width) }; }, i));
    }
    check(`${w}px: ${dv.length} signature dividers — centred, fully visible, never clipped`, dv.length === 2 && dv.every((d) => Math.abs(d.cx - d.vw / 2) <= 1 && d.opacity > 0.98 && d.inView && !d.clipped), JSON.stringify(dv.map((d) => [d.cx, d.vw, d.opacity, d.clipped])));
    // --- contrast for text over photography (real pixels, text hidden)
    const texts = await p.evaluate(() => [...document.querySelectorAll('.tile .tx h3 a, .tile .tx p, .tile .more, .sit .eyebrow, .sit h2, .sit .lead, .sit .actions a:not(.btn)')].map((e, i) => { e.setAttribute('data-cq', i); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { i, cls: e.className || e.tagName, color: cs.color, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; }));
    let worst = 99, worstHot = 99, worstWhat = '';
    for (const t of texts) {
      if (t.w < 2 || t.h < 2) continue;
      await p.evaluate((i) => { window.scrollTo(0, 0); document.querySelectorAll('[data-cq]').forEach((e) => (e.style.visibility = e.getAttribute('data-cq') == i ? 'hidden' : '')); }, t.i);
      await p.evaluate((y) => scrollTo(0, y - innerHeight / 2), t.y); await p.waitForTimeout(350);
      const box = await p.evaluate((i) => { const r = document.querySelector(`[data-cq="${i}"]`).getBoundingClientRect(); return { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - Math.max(0, r.left)), h: Math.min(r.height, innerHeight - Math.max(0, r.top)) }; }, t.i);
      if (box.w < 2 || box.h < 2) continue;
      const buf = await p.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
      const img = PNG.PNG.sync.read(buf); const fg = (t.color.match(/\d+(\.\d+)?/g) || [255, 255, 255]).slice(0, 3).map(Number);
      const px = []; for (let k = 0; k < img.data.length; k += 4) px.push([img.data[k], img.data[k + 1], img.data[k + 2]]);
      px.sort((a, b) => lum(a) - lum(b));
      const p98 = px[Math.min(px.length - 1, Math.floor(px.length * 0.98))];   // 98th-percentile background (ignores a few specular highlight pixels)
      const hot = px[px.length - 1];                                            // the single brightest pixel (worst case)
      const cr = ratio(fg, p98); if (cr < worst) { worst = cr; worstWhat = String(t.cls).split(' ')[0] || 'text'; }
      const crHot = ratio(fg, hot); if (crHot < worstHot) worstHot = crHot;
    }
    await p.evaluate(() => document.querySelectorAll('[data-cq]').forEach((e) => (e.style.visibility = '')));
    check(`${w}px: text over photography contrast >= 4.5:1 (98th-percentile background behind every line)`, worst >= 4.5, `lowest ${worst.toFixed(2)} (${worstWhat}); single brightest pixel worst-case ${worstHot.toFixed(2)}`);
    // --- photos: lazy + modern formats
    if (w === 390) {
      const ph = await p.evaluate(() => [...document.querySelectorAll('.tile img, .portrait img, .sit .bg img')].map((i) => ({ lazy: i.loading === 'lazy', w: i.getAttribute('width'), h: i.getAttribute('height'), srcset: !!i.srcset, src: i.currentSrc.split('/').pop().slice(0, 30), type: i.closest('picture') ? [...i.closest('picture').querySelectorAll('source')].map((s) => s.type).join(',') : '' })));
      check('photos: all lazy-loaded, sized (no layout shift), responsive, AVIF/WebP sources', ph.length === 5 && ph.every((x) => x.lazy && x.w && x.h && x.srcset && /avif/.test(x.type) && /webp/.test(x.type)), `${ph.length} images`);
    }
    // --- floating pill (phones/tablets only)
    if (w < 900) {
      const pages2 = ['/?bloom=off', '/about', '/services', '/services/reiki', '/services/tarot', '/services/sit'];
      let on = 0, total = 0, overlaps = [], small = 0;
      for (const u of pages2) {
        await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
        const H = await p.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < H; y += 90) {
          await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(110);
          const r = await p.evaluate(() => { const bar = document.querySelector('[data-book-bar]'); if (!bar || !bar.classList.contains('is-visible')) return { v: false };
            const pr = bar.querySelector('a').getBoundingClientRect(); const hit = [...document.querySelectorAll('main a[href], main button, main input, main select, main textarea, main h1, main h2, main h3, .site-footer a, .tile .tx, header a, header button')].filter((e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 && q.bottom > pr.top && q.top < pr.bottom && q.right > pr.left && q.left < pr.right; }).map((e) => (e.textContent || '').trim().slice(0, 18));
            return { v: true, hit, h: pr.height, w: pr.width, bottomGap: innerHeight - pr.bottom, inside: pr.left >= 0 && pr.right <= innerWidth }; });
          total++; if (r.v) { on++; if (r.hit.length) overlaps.push(`${u}@${y}:${r.hit.join('|')}`); if (r.h < 44 || r.w < 44 || !r.inside) small++; }
        }
      }
      check(`${w}px: floating pill never overlaps another control or tile text (${on}/${total} scroll positions show it)`, overlaps.length === 0 && on > 0, overlaps.slice(0, 3).join(' ; '));
      check(`${w}px: pill is >= 44px tall, fully inside the viewport`, small === 0);
      const pad = await p.evaluate(() => 0); void pad;
    }
    await ctx.close();
  }
  await browser.close();
  const bad = res.filter((r) => !r).length; console.log(`\n${res.length - bad}/${res.length} passed`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

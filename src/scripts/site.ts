export {}; // module scope
// Progressive enhancement only — the site is fully usable without this script.
const doc = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scroll reveals */
const reveals = document.querySelectorAll<HTMLElement>('.reveal');
if ('IntersectionObserver' in window && !reduce) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  reveals.forEach((el) => io.observe(el));
} else reveals.forEach((el) => el.classList.add('is-in'));

/* Header: solid after scroll; on the home page the sub-mark appears once the hero logo has left */
const header = document.querySelector<HTMLElement>('.site-header');
const heroLogo = document.querySelector<HTMLElement>('[data-hero-logo]');
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
onScroll();
addEventListener('scroll', onScroll, { passive: true });
if (header && heroLogo && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => header.classList.toggle('show-brand', !e.isIntersecting), { rootMargin: '-80px 0px 0px 0px' }).observe(heroLogo);
} else header?.classList.add('show-brand');

/* Mobile menu */
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.getElementById('mobile-menu');
const setMenu = (open: boolean) => {
  if (!toggle || !menu) return;
  toggle.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
  doc.style.overflow = open ? 'hidden' : '';
  header?.classList.toggle('is-scrolled', open || window.scrollY > 12);
  if (open) menu.querySelector<HTMLElement>('a')?.focus(); else if (document.activeElement && menu.contains(document.activeElement)) toggle.focus();
};
toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
menu?.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') setMenu(false); });
matchMedia('(min-width: 900px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

/* Sticky booking pill (phones/tablets): appears once the hero CTA has scrolled away, and steps aside whenever it would sit over another
   control (links, buttons, form fields, footer links), while the menu is open, or while the on-screen keyboard is up. */
const bar = document.querySelector<HTMLElement>('[data-book-bar]');
if (bar) {
  const heroCta = document.querySelector('[data-hero-cta]');
  const pill = bar.querySelector('a');
  let pastHero = !heroCta, kbOpen = false, frame = 0;
  const controls = () => [...document.querySelectorAll<HTMLElement>('main a[href], main button, main input, main select, main textarea, main h1, main h2, main h3, .site-footer a, .tile .tx')];
  const blocked = () => {
    // offsetTop/Height ignore the hide/show transform, so this is where the pill WILL be when shown (fixed → viewport coordinates)
    const w = bar.offsetWidth, h = bar.offsetHeight, top = bar.offsetTop, bottom = top + h;
    const left = (document.documentElement.clientWidth - w) / 2, right = left + w, pad = 18; // generous: reveal animations nudge elements ~14px as they settle
    return controls().some((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > top - pad && r.top < bottom + pad && r.right > left - pad && r.left < right + pad; });
  };
  const paint = () => {
    frame = 0;
    const menuOpen = document.getElementById('mobile-menu')?.hidden === false;
    const show = pastHero && !kbOpen && !menuOpen && !blocked();
    bar.classList.toggle('is-visible', show);
    bar.setAttribute('aria-hidden', String(!show));
    pill?.setAttribute('tabindex', show ? '0' : '-1');
  };
  const queue = () => { if (!frame) frame = requestAnimationFrame(paint); };
  if (heroCta && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; queue(); }).observe(heroCta);
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  addEventListener('focusin', queue);
  // layout can move without scrolling (reveal animations, fonts, images): re-check when those settle
  addEventListener('transitionend', queue, true); addEventListener('animationend', queue, true); addEventListener('load', queue);
  [400, 1000, 2200].forEach((ms) => setTimeout(queue, ms));
  visualViewport?.addEventListener('resize', () => { kbOpen = !!visualViewport && visualViewport.height < innerHeight - 120; queue(); });
  document.querySelector('[data-menu-toggle]')?.addEventListener('click', () => setTimeout(queue, 0));
  queue();
}

/* Safety net: hero entrance animations are an enhancement only. If one is still unfinished well after it should
   have ended (stalled/throttled compositor, etc.), drop it so the element shows its normal, fully visible state. */
setTimeout(() => {
  document.querySelectorAll<HTMLElement>('.hero-logo-media, .hero-eyebrow, .hero-tag .line, .hero-lead, .hero-cta').forEach((el) => {
    if (parseFloat(getComputedStyle(el).opacity) < 0.99) el.style.animation = 'none';
  });
}, 7500);

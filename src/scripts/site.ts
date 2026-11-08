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

/* Sticky booking bar (mobile): after the hero CTA leaves view, hidden near the footer */
const bar = document.querySelector<HTMLElement>('[data-book-bar]');
if (bar && 'IntersectionObserver' in window) {
  const heroCta = document.querySelector('[data-hero-cta]');
  const footer = document.querySelector('.site-footer');
  let pastHero = !heroCta, atFooter = false;
  const paint = () => {
    const show = pastHero && !atFooter;
    bar.classList.toggle('is-visible', show);
    bar.setAttribute('aria-hidden', String(!show));
    bar.querySelector('a')?.setAttribute('tabindex', show ? '0' : '-1');
  };
  if (heroCta) new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; paint(); }).observe(heroCta);
  if (footer) new IntersectionObserver(([e]) => { atFooter = e.isIntersecting; paint(); }).observe(footer);
  paint();
}

/* Safety net: hero entrance animations are an enhancement only. If one is still unfinished well after it should
   have ended (stalled/throttled compositor, etc.), drop it so the element shows its normal, fully visible state. */
setTimeout(() => {
  document.querySelectorAll<HTMLElement>('.hero-logo-media, .hero-eyebrow, .hero-tag .line, .hero-lead, .hero-cta').forEach((el) => {
    if (parseFloat(getComputedStyle(el).opacity) < 0.99) el.style.animation = 'none';
  });
}, 7500);

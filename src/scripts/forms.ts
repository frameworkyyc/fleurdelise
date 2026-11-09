import { submitInquiry, mailtoFallback, type Draft, type Outcome } from '../lib/delivery';

declare global {
  interface Window {
    turnstile?: { render(el: HTMLElement, o: Record<string, unknown>): string; reset(id?: string): void };
  }
}

const form = document.querySelector<HTMLFormElement>('form[data-inquiry]');
if (form) {
  const to = form.dataset.to!;
  const kind = form.dataset.inquiry as 'book' | 'contact';
  const sitekey = form.dataset.sitekey ?? '';
  const result = document.querySelector<HTMLElement>('[data-result]')!;
  const notice = form.querySelector<HTMLElement>('[data-notice]')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const tsBox = form.querySelector<HTMLElement>('[data-turnstile]')!;
  const q = new URLSearchParams(location.search);

  // Pre-select from links such as /book?service=reiki or /contact?interest=sit
  const svc = q.get('service');
  if (svc) form.querySelector<HTMLInputElement>(`input[name="service"][value="${CSS.escape(svc)}"]`)?.click();
  if (q.get('interest') === 'sit') {
    const topic = form.querySelector<HTMLSelectElement>('select[name="topic"]');
    if (topic) topic.value = 'sit';
    const msg = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
    if (msg && !msg.value) msg.value = 'I’d love to hear when Subconscious Imprinting Technique (SIT) sessions open.';
  }

  const val = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value.trim() ?? '';
  const radio = (n: string) => form.querySelector<HTMLInputElement>(`input[name="${n}"]:checked`);
  const label = (el: HTMLInputElement | null) => el?.closest('label')?.querySelector('span')?.textContent?.trim() ?? '';
  const errBox = (id: string) => document.getElementById(id);

  /* ---------- validation (instant feedback; the server validates again) ---------- */
  const setErr = (el: HTMLElement | null, msg: string) => {
    if (!el) return;
    const box = errBox(`${(el as HTMLInputElement).name}-err`);
    if (box) box.textContent = msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  const validate = () => {
    let first: HTMLElement | null = null;
    const bad = (el: HTMLElement | null, msg: string) => { setErr(el, msg); if (msg) first ??= el; };
    const name = form.elements.namedItem('name') as HTMLInputElement;
    const email = form.elements.namedItem('email') as HTMLInputElement;
    bad(name, val('name') ? '' : 'Please share your name.');
    bad(email, !val('email') ? 'Please share your email so Lise can reply.' : email.validity.typeMismatch ? 'That email address doesn’t look quite right.' : '');
    if (kind === 'book') {
      const ok = !!radio('service');
      const ge = errBox('service-err');
      if (ge) ge.textContent = ok ? '' : 'Please choose a service, or “Not sure yet”.';
      if (!ok) first ??= form.querySelector<HTMLElement>('[data-group="service"] input');
    }
    if (kind === 'contact') bad(form.elements.namedItem('message') as HTMLElement, val('message') ? '' : 'Please add a few words.');
    const consent = form.elements.namedItem('consent') as HTMLInputElement;
    const ce = errBox('consent-err');
    if (ce) ce.textContent = consent.checked ? '' : 'Please tick the box to continue.';
    if (!consent.checked) first ??= consent;
    (first as HTMLElement | null)?.focus();
    return !first;
  };
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t.getAttribute('aria-invalid') === 'true') setErr(t, '');
  });

  /* ---------- Cloudflare Turnstile (loaded only on these pages; invisible unless a challenge is needed) ---------- */
  let widgetId: string | undefined;
  let token = '';
  let scriptP: Promise<void> | null = null;
  let waiter: ((t: string) => void) | null = null;
  const loadScript = () => (scriptP ??= new Promise<void>((res, rej) => {
    if (window.turnstile) return res();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('turnstile-script'));
    document.head.appendChild(s);
    setTimeout(() => rej(new Error('turnstile-timeout')), 12000);
  }));
  const ensureWidget = async () => {
    if (!sitekey) throw new Error('no-sitekey');
    await loadScript();
    if (widgetId !== undefined) return;
    widgetId = window.turnstile!.render(tsBox, {
      sitekey, appearance: 'interaction-only', theme: 'light',
      callback: (t: string) => { token = t; waiter?.(t); waiter = null; },
      'expired-callback': () => { token = ''; },
      'error-callback': () => { token = ''; },
    });
  };
  const waitForToken = (ms: number) => new Promise<string>((res) => {
    if (token) return res(token);
    const timer = setTimeout(() => { waiter = null; res(''); }, ms);
    waiter = (t) => { clearTimeout(timer); res(t); };
  });
  const resetWidget = () => { token = ''; if (widgetId !== undefined) window.turnstile?.reset(widgetId); };
  // Start verifying quietly once the visitor engages with (or scrolls near) the form.
  const warm = () => { ensureWidget().catch(() => { /* surfaced on submit */ }); };
  form.addEventListener('focusin', warm, { once: true });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { warm(); io.disconnect(); } }, { rootMargin: '300px' });
    io.observe(form);
  }

  /* ---------- building the message ---------- */
  const draft = (): Draft => {
    if (kind === 'book') {
      const s = label(radio('service'));
      const f = label(radio('format'));
      return { subject: `Appointment inquiry — ${s}${f && f !== 'No preference' ? ` (${f.toLowerCase()})` : ''}`,
        lines: [['Name', val('name')], ['Email', val('email')], ['Phone', val('phone')], ['Service', s], ['Format', f], ['Preferred days / times', val('times')], ['Message', val('message')]] };
    }
    const topic = form.elements.namedItem('topic') as HTMLSelectElement;
    const t = topic.options[topic.selectedIndex].text;
    return { subject: `Website message — ${t}`, lines: [['Name', val('name')], ['Email', val('email')], ['Phone', val('phone')], ['Topic', t], ['Message', val('message')]] };
  };
  const payload = () => kind === 'book'
    ? { kind, name: val('name'), email: val('email'), phone: val('phone'), service: radio('service')?.value ?? '', format: radio('format')?.value ?? 'either', times: val('times'), message: val('message'), consent: true }
    : { kind, name: val('name'), email: val('email'), phone: val('phone'), topic: val('topic'), message: val('message'), consent: true };

  /* ---------- states ---------- */
  const sendLabel = submitBtn.textContent!;
  const setSending = (on: boolean) => {
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.textContent = on ? 'Sending…' : sendLabel;
  };
  const hideNotice = () => { notice.hidden = true; };
  const showNotice = (title: string, text: string, withFallback: boolean) => {
    notice.querySelector<HTMLElement>('[data-notice-title]')!.textContent = title;
    notice.querySelector<HTMLElement>('[data-notice-text]')!.textContent = text;
    const actions = notice.querySelector<HTMLElement>('[data-notice-actions]')!;
    actions.hidden = !withFallback;
    notice.querySelector<HTMLElement>('[data-copy-text]')!.hidden = true;
    if (withFallback) {
      const fb = mailtoFallback(to, draft());
      notice.querySelector<HTMLAnchorElement>('[data-fallback-mail]')!.href = fb.href;
      notice.querySelector<HTMLElement>('[data-copy-text]')!.textContent = `To: ${to}\nSubject: ${draft().subject}\n\n${fb.text}`;
    }
    notice.hidden = false;
    notice.focus();
    notice.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const FIELD_IDS: Record<string, string> = { name: 'name', email: 'email', phone: 'phone', message: 'message' };
  const showServerErrors = (errors: Record<string, string>) => {
    let first: HTMLElement | null = null;
    for (const [k, msg] of Object.entries(errors)) {
      if (FIELD_IDS[k]) { const el = document.getElementById(FIELD_IDS[k]); setErr(el, msg); first ??= el; }
      else { const box = errBox(`${k}-err`); if (box) box.textContent = msg; first ??= form.querySelector<HTMLElement>(k === 'service' ? '[data-group="service"] input' : k === 'consent' ? 'input[name="consent"]' : `[name="${k}"]`); }
    }
    first?.focus();
  };
  const showSuccess = (o: Extract<Outcome, { status: 'ok' }>) => {
    result.querySelector<HTMLElement>('[data-ref]')!.textContent = o.ref;
    result.querySelector<HTMLElement>('[data-ack-email]')!.textContent = val('email');
    result.querySelector<HTMLElement>('[data-ack-yes]')!.hidden = !o.ack;
    result.querySelector<HTMLElement>('[data-ack-no]')!.hidden = o.ack;
    result.querySelector<HTMLElement>('[data-mock]')!.hidden = o.mode !== 'mock';
    hideNotice();
    form.hidden = true;
    result.classList.add('is-shown');
    result.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    result.querySelector<HTMLElement>('h2')!.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return; // already sending
    if (!validate()) return;
    hideNotice();
    setSending(true);
    let outcome: Outcome | 'blocked' | 'no-check';
    try {
      await ensureWidget();
      const t = await waitForToken(15000);
      outcome = t ? await submitInquiry({ ...payload(), token: t, hp: val('hp_x7k2') }) : 'no-check';
    } catch {
      outcome = 'blocked'; // spam-protection script could not load (offline, ad/privacy blocker, or no site key)
    }
    setSending(false);
    if (typeof outcome !== 'string' && outcome.status === 'ok') { showSuccess(outcome); resetWidget(); return; }
    resetWidget(); // a Turnstile token is single-use
    if (outcome === 'blocked' || outcome === 'no-check') {
      showNotice('We couldn’t run the spam-protection check', 'This can happen with an ad or privacy blocker, or a weak connection. Nothing has been sent. You can try again, or email Lise directly — your message is ready below.', true);
    } else if (outcome.status === 'invalid') {
      showServerErrors(outcome.errors);
    } else if (outcome.status === 'verification') {
      showNotice('Please try once more', 'We couldn’t confirm you’re a person that time. Nothing has been sent — press the button again.', false);
    } else if (outcome.status === 'rate_limited') {
      showNotice('Lots of requests just now', 'Please wait a few minutes and try again. Nothing has been sent. You can also email or call Lise directly.', true);
    } else {
      showNotice('We couldn’t send your ' + (kind === 'book' ? 'request' : 'message'), 'Nothing has been lost — your details are still in the form. Please try again, or email Lise directly using the button below (your message is prefilled).', true);
    }
  });

  notice.querySelector('[data-copy]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const box = notice.querySelector<HTMLElement>('[data-copy-text]')!;
    try { await navigator.clipboard.writeText(box.textContent ?? ''); btn.textContent = 'Copied'; }
    catch { btn.textContent = 'Select the text below'; box.hidden = false; box.focus(); }
  });
  result.querySelector('[data-again]')?.addEventListener('click', () => {
    form.reset();
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.setAttribute('aria-invalid', 'false'));
    result.classList.remove('is-shown');
    form.hidden = false;
    form.querySelector<HTMLElement>('input:not([tabindex="-1"]),textarea')?.focus();
  });
}

import { deliver, type Inquiry } from '../lib/delivery';

const form = document.querySelector<HTMLFormElement>('form[data-inquiry]');
if (form) {
  const to = form.dataset.to!;
  const kind = form.dataset.inquiry!; // 'book' | 'contact'
  const result = document.querySelector<HTMLElement>('[data-result]')!;
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

  const setErr = (el: HTMLElement | null, msg: string) => {
    if (!el) return;
    const box = errBox(`${(el as HTMLInputElement).name}-err`);
    if (box) box.textContent = msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  const validate = () => {
    let first: HTMLElement | null = null;
    const bad = (el: HTMLElement | null, msg: string) => {
      setErr(el, msg);
      if (msg) first ??= el;
    };
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (val('website')) return; // honeypot
    if (!validate()) return;

    let inq: Inquiry;
    if (kind === 'book') {
      const s = label(radio('service'));
      const f = label(radio('format'));
      inq = {
        subject: `Appointment inquiry — ${s}${f && f !== 'No preference' ? ` (${f.toLowerCase()})` : ''}`,
        lines: [['Name', val('name')], ['Email', val('email')], ['Phone', val('phone')], ['Service', s], ['Format', f], ['Preferred days / times', val('times')], ['Message', val('message')]],
      };
    } else {
      const topic = form.elements.namedItem('topic') as HTMLSelectElement;
      const t = topic.options[topic.selectedIndex].text;
      inq = {
        subject: `Website message — ${t}`,
        lines: [['Name', val('name')], ['Email', val('email')], ['Phone', val('phone')], ['Topic', t], ['Message', val('message')]],
      };
    }

    const r = await deliver(to, inq);
    result.querySelector<HTMLElement>('[data-copy-text]')!.textContent = `To: ${to}\nSubject: ${inq.subject}\n\n${r.body}`;
    result.querySelector<HTMLAnchorElement>('[data-mailto]')!.href = r.href;
    form.hidden = true;
    result.classList.add('is-shown');
    result.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    result.querySelector<HTMLElement>('h2')!.focus();
    location.href = r.href; // opens the visitor's email app with the message ready to send
  });

  result.querySelector('[data-copy]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const text = result.querySelector<HTMLElement>('[data-copy-text]')!.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Select the text and copy';
    }
  });
  result.querySelector('[data-edit]')?.addEventListener('click', () => {
    result.classList.remove('is-shown');
    form.hidden = false;
    form.querySelector<HTMLElement>('input,textarea')?.focus();
  });
}

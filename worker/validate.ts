import { SERVICES, FORMATS, TOPICS, LIMITS, type InquiryKind } from '../src/lib/inquiry-options.ts';

export interface Inquiry {
  kind: InquiryKind;
  name: string; email: string; phone: string;
  service: keyof typeof SERVICES | ''; format: keyof typeof FORMATS | ''; times: string;
  topic: keyof typeof TOPICS | ''; message: string;
}
export type Validation = { ok: true; data: Inquiry } | { ok: false; errors: Record<string, string> };

// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;
/** Single-line text: no CR/LF/tabs/control characters (blocks header/subject injection). */
export const oneLine = (v: unknown, max: number) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(CTRL, '').replace(/\s{2,}/g, ' ').trim().slice(0, max);
/** Multi-line text: keeps line breaks, strips other control characters. */
export const multiLine = (v: unknown, max: number) => String(v ?? '').replace(/\r\n?/g, '\n').replace(CTRL, '').replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max);

const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function validate(raw: unknown): Validation {
  const errors: Record<string, string> = {};
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kind = r.kind === 'book' || r.kind === 'contact' ? r.kind : null;
  if (!kind) return { ok: false, errors: { form: 'Unknown form.' } };

  const name = oneLine(r.name, LIMITS.name);
  const email = oneLine(r.email, LIMITS.email + 1);
  const phone = oneLine(r.phone, LIMITS.phone);
  const times = multiLine(r.times, LIMITS.times);
  const message = multiLine(r.message, LIMITS.message);
  const service = String(r.service ?? '') as keyof typeof SERVICES | '';
  const format = String(r.format ?? '') as keyof typeof FORMATS | '';
  const topic = String(r.topic ?? '') as keyof typeof TOPICS | '';

  if (!name) errors.name = 'Please share your name.';
  if (!email) errors.email = 'Please share your email so Lise can reply.';
  else if (email.length > LIMITS.email || !EMAIL.test(email)) errors.email = 'That email address doesn’t look quite right.';
  if (phone && !/^[0-9+().\-\s]{5,40}$/.test(phone)) errors.phone = 'That phone number doesn’t look quite right.';
  if (String(r.message ?? '').length > LIMITS.message + 200) errors.message = `Please keep your message under ${LIMITS.message} characters.`;
  if (r.consent !== true) errors.consent = 'Please tick the box to continue.';
  if (kind === 'book') {
    if (!(service in SERVICES)) errors.service = 'Please choose a service, or “Not sure yet”.';
    if (format && !(format in FORMATS)) errors.format = 'Please choose one of the options.';
  } else {
    if (!message) errors.message = 'Please add a few words.';
    if (topic && !(topic in TOPICS)) errors.topic = 'Please choose one of the options.';
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { kind, name, email, phone, service, format: (format || 'either') as Inquiry['format'], times, topic: (topic || 'general') as Inquiry['topic'], message } };
}

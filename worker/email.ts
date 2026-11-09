import { SERVICES, FORMATS, TOPICS } from '../src/lib/inquiry-options.ts';
import { BUSINESS } from './config.ts';
import { oneLine, type Inquiry } from './validate.ts';
import type { Env } from './types.ts';

export interface Mail { to: string; from: string; replyTo?: string; subject: string; text: string; html: string; /** de-duplicates provider retries */ idempotencyKey?: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const when = () => new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Toronto' }).format(new Date());

function rows(d: Inquiry): [string, string][] {
  return d.kind === 'book'
    ? [['Name', d.name], ['Email', d.email], ['Phone', d.phone], ['Service', d.service ? SERVICES[d.service] : ''], ['Format', FORMATS[d.format as keyof typeof FORMATS] ?? ''], ['Preferred days / times', d.times], ['Message', d.message]]
    : [['Name', d.name], ['Email', d.email], ['Phone', d.phone], ['Topic', TOPICS[d.topic as keyof typeof TOPICS] ?? ''], ['Message', d.message]];
}
const shown = (d: Inquiry) => rows(d).filter(([, v]) => v);
const textRows = (d: Inquiry) => shown(d).map(([k, v]) => (v.includes('\n') ? `${k}:\n${v}` : `${k}: ${v}`)).join('\n\n');
const htmlRows = (d: Inquiry) => `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">${shown(d).map(([k, v]) => `<tr><td style="padding:8px 14px 8px 0;vertical-align:top;color:#975c2b;font-size:13px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap">${esc(k)}</td><td style="padding:8px 0;color:#1f0913;font-size:15px;line-height:1.55">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
const shell = (inner: string) => `<div style="background:#f2e4d9;padding:24px 12px"><div style="max-width:560px;margin:0 auto;background:#fffaf5;border-top:3px solid #c9944c;padding:28px 26px;font-family:Georgia,'Times New Roman',serif;color:#1f0913">${inner}</div></div>`;

const subjectService = (d: Inquiry) => (d.kind === 'book' ? `${d.service ? SERVICES[d.service] : 'Appointment'}${d.format && d.format !== 'either' ? ` (${FORMATS[d.format as keyof typeof FORMATS].toLowerCase()})` : ''}` : (TOPICS[d.topic as keyof typeof TOPICS] ?? 'Message'));

/** Notification to Lise. Reply-To is the visitor, so "Reply" goes straight to them. */
export function ownerEmail(d: Inquiry, ref: string, env: Env): Mail {
  const book = d.kind === 'book';
  const intro = book ? 'New appointment request from the website. The visitor has been told it is NOT confirmed until you reply.' : 'New message from the website contact form.';
  return {
    to: env.INQUIRY_TO!, from: env.MAIL_FROM!, replyTo: d.email, idempotencyKey: `${ref}-owner`,
    subject: oneLine(`${book ? 'Appointment request' : 'Website message'} — ${subjectService(d)} — ${d.name}`, 200),
    text: `${intro}\nReference: ${ref}\nReceived: ${when()}\n\n${textRows(d)}\n\n—\nReply to this email to answer ${d.name} directly.`,
    html: shell(`<p style="margin:0 0 6px;font-size:18px">${book ? 'New appointment request' : 'New website message'}</p><p style="margin:0 0 18px;color:#4c1f31;font-size:14px">${esc(intro)}<br>Reference <strong>${esc(ref)}</strong> · ${esc(when())}</p>${htmlRows(d)}<p style="margin:22px 0 0;color:#4c1f31;font-size:13px">Reply to this email to answer ${esc(d.name)} directly.</p>`),
  };
}

/** Automatic acknowledgement to the visitor. For appointment requests it states plainly that nothing is confirmed. */
export function ackEmail(d: Inquiry, ref: string, env: Env): Mail {
  const book = d.kind === 'book';
  const reply = env.INQUIRY_REPLY_TO || env.INQUIRY_TO!;
  const lead = book
    ? 'Thank you for your appointment request.'
    : 'Thank you for your message.';
  const warn = book
    ? 'Your appointment is NOT confirmed yet. Nothing is booked until Lise replies to confirm a time and format with you.'
    : 'Lise will reply to you when she can.';
  const change = book ? 'Need to change or withdraw your request? Reply to this email, or contact Lise directly' : 'Want to add something? Reply to this email, or contact Lise directly';
  const text = [
    `Hello ${d.name},`, '', `${lead} This is an automatic acknowledgement from ${BUSINESS.name}.`, '', warn, '',
    `${book ? 'Your request' : 'Your message'} (reference ${ref}):`, '', textRows(d), '',
    `${change} at ${reply} or ${BUSINESS.phone}.`, '',
    'Please keep health details out of email — there is plenty of time to share what feels right in your session.', '',
    'With care,', `${BUSINESS.name}`, BUSINESS.location, '', BUSINESS.disclaimer,
  ].join('\n');
  return {
    to: d.email, from: env.MAIL_FROM!, replyTo: reply, idempotencyKey: `${ref}-ack`,
    subject: book ? 'We’ve received your appointment request — not yet confirmed' : 'We’ve received your message',
    text,
    html: shell(`<p style="margin:0 0 14px;font-size:18px">Hello ${esc(d.name)},</p><p style="margin:0 0 14px;line-height:1.6">${esc(lead)} This is an automatic acknowledgement from ${esc(BUSINESS.name)}.</p><p style="margin:0 0 18px;padding:12px 14px;border-left:3px solid #c9944c;background:#f2e4d9;line-height:1.55"><strong>${esc(warn)}</strong></p><p style="margin:0 0 8px;color:#4c1f31;font-size:14px">${book ? 'Your request' : 'Your message'} · reference <strong>${esc(ref)}</strong></p>${htmlRows(d)}<p style="margin:22px 0 0;line-height:1.6;font-size:14px">${esc(change)} at <a href="mailto:${esc(reply)}" style="color:#4c1f31">${esc(reply)}</a> or ${esc(BUSINESS.phone)}.</p><p style="margin:14px 0 0;line-height:1.6;font-size:14px;color:#4c1f31">Please keep health details out of email — there is plenty of time to share what feels right in your session.</p><p style="margin:22px 0 0;font-size:15px">With care,<br>${esc(BUSINESS.name)}<br><span style="color:#975c2b">${esc(BUSINESS.location)}</span></p><p style="margin:18px 0 0;font-size:12px;color:#4c1f31;opacity:.8">${esc(BUSINESS.disclaimer)}</p>`),
  };
}

export class DeliveryError extends Error {}

export function providerOf(env: Env): 'mock' | 'resend' | 'unknown' {
  const p = (env.EMAIL_PROVIDER || 'mock').toLowerCase();
  return p === 'mock' || p === 'resend' ? p : 'unknown';
}

/** Sends one email through the configured provider. Throws DeliveryError (never includes message content). */
export async function sendMail(env: Env, mail: Mail, fetcher: typeof fetch = fetch): Promise<void> {
  const provider = providerOf(env);
  if (provider === 'mock') {
    // Test delivery: nothing leaves the Worker. Logs reference-free metadata only (no message content).
    console.log(`[mock-email] to-domain=${mail.to.split('@')[1] ?? '?'} subject-len=${mail.subject.length} text-len=${mail.text.length}`);
    return;
  }
  if (provider === 'resend') {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const url = env.ENVIRONMENT !== 'production' && env.RESEND_API_URL ? env.RESEND_API_URL : 'https://api.resend.com/emails'; // override honoured outside production only
      const res = await fetcher(url, {
        method: 'POST', signal: ctl.signal,
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...(mail.idempotencyKey ? { 'Idempotency-Key': mail.idempotencyKey } : {}) },
        body: JSON.stringify({ from: mail.from, to: [mail.to], reply_to: mail.replyTo, subject: mail.subject, text: mail.text, html: mail.html }),
      });
      if (!res.ok) throw new DeliveryError(`resend-http-${res.status}`);
    } catch (e) {
      throw e instanceof DeliveryError ? e : new DeliveryError('resend-unreachable');
    } finally {
      clearTimeout(timer);
    }
    return;
  }
  throw new DeliveryError('unknown-provider');
}

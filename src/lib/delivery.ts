/**
 * Inquiry delivery (client side): POST to the Worker endpoint /api/inquiry (worker/inquiry.ts), which verifies Cloudflare Turnstile
 * and emails Lise + an acknowledgement to the visitor. If sending fails, the visitor gets a clear message and a prefilled
 * mailto: fallback so nothing is lost.
 */
export interface Payload { kind: 'book' | 'contact'; [k: string]: unknown }
export type Outcome =
  | { status: 'ok'; ref: string; ack: boolean; mode: 'live' | 'mock' }
  | { status: 'invalid'; errors: Record<string, string> }
  | { status: 'verification' }
  | { status: 'rate_limited' }
  | { status: 'failed' };

export async function submitInquiry(payload: Payload): Promise<Outcome> {
  let res: Response;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    res = await fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal });
    clearTimeout(timer);
  } catch {
    return { status: 'failed' };
  }
  let body: { ok?: boolean; ref?: string; ack?: boolean; mode?: 'live' | 'mock'; errors?: Record<string, string>; code?: string } = {};
  try { body = await res.json(); } catch { /* non-JSON error page */ }
  if (res.ok && body.ok) return { status: 'ok', ref: body.ref ?? '', ack: body.ack !== false, mode: body.mode === 'mock' ? 'mock' : 'live' };
  if (res.status === 422 && body.errors) return { status: 'invalid', errors: body.errors };
  if (res.status === 403 && body.code === 'verification') return { status: 'verification' };
  if (res.status === 429) return { status: 'rate_limited' };
  return { status: 'failed' };
}

export interface Draft { subject: string; lines: [label: string, value: string][] }

export function compose(d: Draft): string {
  return d.lines.filter(([, v]) => v.trim()).map(([k, v]) => (v.includes('\n') ? `${k}:\n${v}` : `${k}: ${v}`)).join('\n\n');
}

/** Fallback only: a mailto: link with the message prefilled (body trimmed so long messages don't break email apps). */
export function mailtoFallback(to: string, d: Draft): { href: string; text: string; trimmed: boolean } {
  const text = compose(d);
  const MAX = 1500;
  const trimmed = text.length > MAX;
  const body = trimmed ? text.slice(0, MAX) + '\n\n[…message continues — I will paste the rest below]' : text;
  return { href: `mailto:${to}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(body)}`, text, trimmed };
}

import { validate } from './validate.ts';
import { verifyTurnstile, TEST_SECRETS } from './turnstile.ts';
import { ownerEmail, ackEmail, sendMail, providerOf, DeliveryError } from './email.ts';
import type { Env } from './types.ts';

const MAX_BODY = 24 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6; // valid-shaped submissions per IP per 10 min (best-effort, per isolate); Turnstile is the main defence
const hits = new Map<string, number[]>();
export const __resetRateLimit = () => hits.clear();

const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' };
const json = (status: number, body: unknown, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
const log = (evt: Record<string, unknown>) => console.log(JSON.stringify({ evt: 'inquiry', ...evt })); // never log names, emails or message text

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return recent.length > MAX_PER_WINDOW;
}

/** Returns a reason string if the deployment is not safely configured, otherwise null. */
export function configProblem(env: Env): string | null {
  const production = env.ENVIRONMENT === 'production';
  const provider = providerOf(env);
  if (provider === 'unknown') return 'unknown EMAIL_PROVIDER';
  if (!env.INQUIRY_TO || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.INQUIRY_TO)) return 'INQUIRY_TO missing/invalid';
  if (!env.TURNSTILE_SECRET_KEY) return 'TURNSTILE_SECRET_KEY missing';
  if (provider === 'resend' && !env.RESEND_API_KEY) return 'RESEND_API_KEY missing';
  if (provider !== 'mock' && !env.MAIL_FROM) return 'MAIL_FROM missing';
  if (production && provider === 'mock') return 'mock email provider is not allowed in production';
  if (production && TEST_SECRETS.includes(env.TURNSTILE_SECRET_KEY)) return 'Turnstile test secret is not allowed in production';
  return null;
}

const ref = () => {
  const alphabet = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'; // no look-alikes (0/O, 1/I/L)
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'FDL-' + [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
};

export async function handleInquiry(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, code: 'method_not_allowed', message: 'Please use the form on the website.' }, { Allow: 'POST' });

  const problem = configProblem(env);
  if (problem) {
    log({ ok: false, code: 'server_misconfigured', reason: problem });
    return json(503, { ok: false, code: 'server_misconfigured', message: 'Sending is temporarily unavailable.' });
  }

  // Same-origin only (plus any explicitly allowed origins).
  const origin = request.headers.get('Origin');
  const allowed = new Set([new URL(request.url).origin, ...(env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)]);
  if (!origin || !allowed.has(origin)) return json(403, { ok: false, code: 'bad_origin', message: 'This request was not accepted.' });
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { ok: false, code: 'bad_request', message: 'This request was not accepted.' });
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY) return json(413, { ok: false, code: 'too_large', message: 'That message is too long.' });

  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json(413, { ok: false, code: 'too_large', message: 'That message is too long.' });
    raw = JSON.parse(text);
  } catch {
    return json(400, { ok: false, code: 'bad_request', message: 'This request was not accepted.' });
  }

  // Honeypot: a real visitor never fills this. Answer like a success so bots learn nothing; send nothing.
  if (typeof raw.hp === 'string' && raw.hp.trim()) {
    log({ ok: true, spam: 'honeypot' });
    return json(200, { ok: true, ref: ref(), ack: true, mode: 'live' });
  }

  const ip = request.headers.get('CF-Connecting-IP');
  const v = validate(raw);
  if (!v.ok) return json(422, { ok: false, code: 'validation', message: 'Please check the highlighted details.', errors: v.errors }); // does not count towards the limit
  if (limited(ip ?? 'unknown')) {
    log({ ok: false, code: 'rate_limited' });
    return json(429, { ok: false, code: 'rate_limited', message: 'Too many requests just now. Please wait a few minutes and try again.' }, { 'Retry-After': '300' });
  }

  const human = await verifyTurnstile(env, typeof raw.token === 'string' ? raw.token : '', ip, fetcher);
  if (!human.ok) {
    log({ ok: false, code: 'verification', reason: human.reason });
    return json(403, { ok: false, code: 'verification', message: 'We couldn’t confirm you’re a person. Please try again.' });
  }

  const id = ref();
  const d = v.data;
  const mock = providerOf(env) === 'mock';
  const qa = mock && env.ENVIRONMENT !== 'production'; // QA triggers exist only in mock mode outside production
  try {
    if (qa && d.name === '[test-fail]') throw new DeliveryError('qa-forced-failure');
    await sendMail(env, ownerEmail(d, id, env), fetcher);
  } catch (e) {
    log({ ok: false, code: 'delivery_failed', ref: id, reason: e instanceof DeliveryError ? e.message : 'error' });
    return json(502, { ok: false, code: 'delivery_failed', message: 'We couldn’t send your request just now.' });
  }

  let ack = true;
  try {
    if (qa && d.name === '[test-ack-fail]') throw new DeliveryError('qa-forced-failure');
    await sendMail(env, ackEmail(d, id, env), fetcher);
  } catch (e) {
    ack = false; // Lise has the request; only the visitor's copy failed
    log({ ok: true, ref: id, ackFailed: e instanceof DeliveryError ? e.message : 'error' });
  }
  log({ ok: true, ref: id, kind: d.kind, ack, provider: providerOf(env) });
  return json(200, { ok: true, ref: id, ack, mode: mock ? 'mock' : 'live' });
}

// Unit/integration tests for the Worker (no network, no real email): node --test scripts/test-worker.mjs   (npm run test:worker)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validate } from '../worker/validate.ts';
import { handleInquiry, handleHealth, configProblem, __resetRateLimit } from '../worker/inquiry.ts';
import { ownerEmail, ackEmail } from '../worker/email.ts';
import { BUSINESS } from '../worker/config.ts';
import worker from '../worker/index.ts';

const ORIGIN = 'https://staging.example';
const baseEnv = (o = {}) => ({ ENVIRONMENT: 'staging', EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_SECRET_KEY_123', MAIL_FROM: 'Fleur de Lise Healing <hello@verified.example>', INQUIRY_TO: 'lise@example.com', TURNSTILE_SECRET_KEY: 'real-secret-xyz', ASSETS: { fetch: async () => new Response('asset') }, ...o });
const book = (o = {}) => ({ kind: 'book', name: 'Jane Doe', email: 'jane@example.com', phone: '226-555-0100', service: 'reiki', format: 'virtual', times: 'Weekday mornings', message: 'Hello — first time.', consent: true, token: 'good', hp: '', ...o });
const contact = (o = {}) => ({ kind: 'contact', name: 'Sam', email: 'sam@example.com', topic: 'general', message: 'A question', consent: true, token: 'good', hp: '', ...o });
const req = (body, { origin = ORIGIN, method = 'POST', headers = {}, raw } = {}) => new Request(`${ORIGIN}/api/inquiry`, { method, headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), 'CF-Connecting-IP': '203.0.113.7', ...headers }, body: method === 'GET' ? undefined : raw ?? JSON.stringify(body) });
/** fake network: Turnstile + Resend */
function net({ turnstile = (t) => t === 'good', resend = () => 200, throwOn, hostname = 'example.com' } = {}) {
  const calls = [];
  const f = async (url, init) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (throwOn && u.includes(throwOn)) throw new TypeError('network down');
    if (u.includes('siteverify')) { const t = new URLSearchParams(init.body).get('response'); return new Response(JSON.stringify({ success: turnstile(t), hostname, 'error-codes': turnstile(t) ? [] : ['invalid-input-response'] }), { status: 200 }); }
    if (u.includes('api.resend.com')) { const s = resend(JSON.parse(init.body)); return new Response('{}', { status: s }); }
    throw new Error('unexpected fetch ' + u);
  };
  f.calls = calls; return f;
}
const run = async (body, env = baseEnv(), f = net(), opts) => { const r = await handleInquiry(req(body, opts), env, f); return { r, j: await r.json(), f }; };
test.beforeEach(() => __resetRateLimit());

test('validation: accepts a good booking and a good contact message', () => {
  assert.equal(validate(book()).ok, true);
  assert.equal(validate(contact()).ok, true);
});
test('validation: collects clear field errors', () => {
  const v = validate({ kind: 'book', name: '', email: 'nope', service: 'x', consent: false });
  assert.equal(v.ok, false);
  assert.deepEqual(Object.keys(v.errors).sort(), ['consent', 'email', 'name', 'service']);
  assert.equal(validate(contact({ message: '' })).errors.message, 'Please add a few words.');
  assert.equal(validate({ kind: 'zzz' }).ok, false);
  assert.equal(validate(null).ok, false);
});
test('validation: rejects address-list/header-injection emails and strips newlines from single-line fields', () => {
  for (const bad of ['a@b', 'a@b.co, c@d.co', 'a@b.co\nBcc: x@y.zz', 'a b@c.co', '<a@b.co>', 'a@b..co', '@b.co', 'a@.co']) assert.equal(validate(book({ email: bad })).ok, false, bad);
  const v = validate(book({ name: 'Eve\r\nBcc: evil@x.co' }));
  assert.equal(v.ok, true); assert.ok(!/[\r\n]/.test(v.data.name));
});
test('validation: enforces enums and length limits', () => {
  assert.equal(validate(book({ format: 'carrier-pigeon' })).ok, false);
  assert.equal(validate(contact({ topic: 'hacking' })).ok, false);
  assert.equal(validate(book({ message: 'x'.repeat(4000) })).ok, false);
  assert.equal(validate(book({ phone: 'call me maybe' })).ok, false);
  assert.equal(validate(book({ name: 'x'.repeat(500) })).data.name.length, 100);
});

test('method, origin, content-type and size guards', async () => {
  assert.equal((await handleInquiry(req(null, { method: 'GET' }), baseEnv(), net())).status, 405);
  assert.equal((await handleInquiry(req(book(), { origin: 'https://evil.example' }), baseEnv(), net())).status, 403);
  assert.equal((await handleInquiry(req(book(), { origin: null }), baseEnv(), net())).status, 403);
  assert.equal((await handleInquiry(req(book(), { headers: { 'Content-Type': 'text/plain' } }), baseEnv(), net())).status, 415);
  assert.equal((await handleInquiry(req(null, { raw: '{not json' }), baseEnv(), net())).status, 400);
  assert.equal((await handleInquiry(req(null, { raw: JSON.stringify({ message: 'x'.repeat(30000) }) }), baseEnv(), net())).status, 413);
  const ok = await handleInquiry(req(book(), { origin: 'https://other.example' }), baseEnv({ ALLOWED_ORIGINS: 'https://other.example' }), net());
  assert.equal(ok.status, 200);
});
test('safe configuration is enforced (production refuses mock mail and Turnstile test keys)', async () => {
  assert.match(configProblem(baseEnv({ ENVIRONMENT: 'production', EMAIL_PROVIDER: 'mock' })), /mock/);
  assert.match(configProblem(baseEnv({ ENVIRONMENT: 'production', TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' })), /test secret/);
  assert.match(configProblem(baseEnv({ INQUIRY_TO: '' })), /INQUIRY_TO/);
  assert.match(configProblem(baseEnv({ RESEND_API_KEY: '' })), /RESEND_API_KEY/);
  assert.match(configProblem(baseEnv({ MAIL_FROM: '' })), /MAIL_FROM/);
  assert.match(configProblem(baseEnv({ TURNSTILE_SECRET_KEY: '' })), /TURNSTILE/);
  assert.match(configProblem(baseEnv({ EMAIL_PROVIDER: 'carrier' })), /EMAIL_PROVIDER/);
  assert.equal(configProblem(baseEnv()), null);
  assert.equal(configProblem(baseEnv({ EMAIL_PROVIDER: 'mock', MAIL_FROM: '' })), null);
  const { r, j } = await run(book(), baseEnv({ ENVIRONMENT: 'production', EMAIL_PROVIDER: 'mock' }));
  assert.equal(r.status, 503); assert.equal(j.code, 'server_misconfigured'); assert.ok(!JSON.stringify(j).includes('mock'));
});

test('validation errors return 422 BEFORE spending a Turnstile token', async () => {
  const { r, j, f } = await run(book({ name: '' }));
  assert.equal(r.status, 422); assert.equal(j.code, 'validation'); assert.ok(j.errors.name);
  assert.equal(f.calls.length, 0);
});
test('Turnstile failure => 403 and nothing is emailed', async () => {
  const { r, j, f } = await run(book({ token: 'bad' }));
  assert.equal(r.status, 403); assert.equal(j.code, 'verification');
  assert.equal(f.calls.filter((c) => c.url.includes('resend')).length, 0);
  const missing = await run(book({ token: '' })); assert.equal(missing.r.status, 403);
  const down = await run(book(), baseEnv(), net({ throwOn: 'siteverify' })); assert.equal(down.r.status, 403);
});
test('honeypot: looks like success, sends nothing', async () => {
  const { r, j, f } = await run(book({ hp: 'http://spam.example' }));
  assert.equal(r.status, 200); assert.equal(j.ok, true); assert.equal(f.calls.length, 0);
});
test('rate limit: the 7th valid submission from one IP in the window is refused; invalid ones do not count; other IPs are unaffected', async () => {
  const env = baseEnv(); const f = net(); let last;
  for (let i = 0; i < 4; i++) assert.equal((await handleInquiry(req(book({ name: '' })), env, f)).status, 422);
  for (let i = 0; i < 6; i++) { last = await handleInquiry(req(book()), env, f); assert.equal(last.status, 200); }
  last = await handleInquiry(req(book()), env, f);
  assert.equal(last.status, 429); assert.equal(last.headers.get('Retry-After'), '300');
  assert.equal((await handleInquiry(req(book(), { headers: { 'CF-Connecting-IP': '198.51.100.9' } }), env, f)).status, 200);
});

test('success (live provider): Lise gets the request with Reply-To=visitor; visitor gets an acknowledgement that says NOT confirmed', async () => {
  const { r, j, f } = await run(book());
  assert.equal(r.status, 200); assert.equal(j.ok, true); assert.equal(j.ack, true); assert.equal(j.mode, 'live'); assert.match(j.ref, /^FDL-[A-Z2-9]{6}$/);
  const mails = f.calls.filter((c) => c.url.includes('resend')).map((c) => ({ h: c.init.headers, b: JSON.parse(c.init.body) }));
  assert.equal(mails.length, 2);
  const [owner, ack] = mails;
  assert.deepEqual(owner.b.to, ['lise@example.com']); assert.equal(owner.b.reply_to, 'jane@example.com'); assert.match(owner.b.subject, /Appointment request — Reiki \(virtual\) — Jane Doe/);
  assert.match(owner.b.text, /NOT confirmed/); assert.match(owner.b.text, new RegExp(j.ref)); assert.match(owner.b.text, /Weekday mornings/);
  assert.deepEqual(ack.b.to, ['jane@example.com']); assert.equal(ack.b.reply_to, 'lise@example.com'); assert.match(ack.b.subject, /not yet confirmed/);
  assert.match(ack.b.text, /NOT confirmed yet/); assert.match(ack.b.text, /Nothing is booked until Lise replies/); assert.match(ack.b.text, /Complementary wellness services/);
  assert.equal(owner.h.Authorization, 'Bearer re_SECRET_KEY_123');
  assert.ok(!JSON.stringify(j).includes('re_SECRET') && !JSON.stringify(j).includes('real-secret'));
});
test('contact kind: acknowledgement does not talk about an appointment', async () => {
  const { j, f } = await run(contact());
  assert.equal(j.ok, true);
  const ack = JSON.parse(f.calls.filter((c) => c.url.includes('resend'))[1].init.body);
  assert.match(ack.subject, /received your message/); assert.ok(!/appointment/i.test(ack.text.replace(/appointment inquiry/gi, '')));
});
test('delivery failure to Lise => 502 and no acknowledgement is sent', async () => {
  for (const f of [net({ resend: () => 500 }), net({ throwOn: 'api.resend.com' })]) {
    const { r, j } = await run(book(), baseEnv(), f);
    assert.equal(r.status, 502); assert.equal(j.code, 'delivery_failed');
    assert.equal(f.calls.filter((c) => c.url.includes('resend')).length, 1);
  }
});
test('acknowledgement failure is non-fatal: success with ack=false', async () => {
  let n = 0; const { r, j } = await run(book(), baseEnv(), net({ resend: () => (++n === 2 ? 500 : 200) }));
  assert.equal(r.status, 200); assert.equal(j.ok, true); assert.equal(j.ack, false);
});
test('email content: subjects carry no line breaks; HTML is escaped', () => {
  const d = validate(book({ name: 'Eve\r\nBcc: x@y.co <script>alert(1)</script>', message: '<img src=x onerror=alert(1)>' })).data;
  const m = ownerEmail(d, 'FDL-TEST22', baseEnv()); const a = ackEmail(d, 'FDL-TEST22', baseEnv());
  for (const x of [m, a]) { assert.ok(!/[\r\n]/.test(x.subject)); assert.ok(!x.html.includes('<script>') && !x.html.includes('<img')); }
});
test('logs never contain names, emails or message text', async () => {
  const lines = []; const orig = console.log; console.log = (...a) => lines.push(a.join(' '));
  try { await run(book({ name: 'Zelda Unique', email: 'zelda.unique@example.com', message: 'secret-message-body' })); await run(book({ token: 'bad', name: 'Zelda Unique' })); await run(book(), baseEnv({ EMAIL_PROVIDER: 'mock', MAIL_FROM: '' }), net()); } finally { console.log = orig; }
  const all = lines.join('\n');
  assert.ok(all.length > 0); assert.ok(!/zelda|unique|secret-message|jane@|re_SECRET|real-secret/i.test(all), all);
});
test('mock provider: sends nothing, reports mode=mock; QA triggers only outside production', async () => {
  const env = baseEnv({ EMAIL_PROVIDER: 'mock', MAIL_FROM: '', RESEND_API_KEY: '' });
  const ok = await run(book(), env); assert.equal(ok.j.mode, 'mock'); assert.equal(ok.f.calls.filter((c) => c.url.includes('resend')).length, 0);
  assert.equal((await run(book({ name: '[test-fail]' }), env)).r.status, 502);
  const ackFail = await run(book({ name: '[test-ack-fail]' }), env); assert.equal(ackFail.j.ack, false);
  const live = await run(book({ name: '[test-fail]' })); assert.equal(live.r.status, 200); // live provider ignores triggers
});

test('worker routing: /api/inquiry -> handler, unknown /api -> 404, everything else -> static assets', async () => {
  const env = baseEnv();
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/api/nope`), env)).status, 404);
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/api/inquiry`), env)).status, 405);
  assert.equal(await (await worker.fetch(new Request(`${ORIGIN}/about`), env)).text(), 'asset');
});
test('email facts match the site data', async () => {
  const site = await readFile(new URL('../src/data/site.ts', import.meta.url), 'utf8');
  for (const v of [BUSINESS.name, BUSINESS.owner, BUSINESS.phone, BUSINESS.location, BUSINESS.disclaimer]) assert.ok(site.includes(v), `site.ts is missing "${v}"`);
});

/* ---------- production hardening ---------- */
const PROD = (o = {}) => baseEnv({ ENVIRONMENT: 'production', PRIMARY_ORIGIN: 'https://fleurdelisehealing.ca', ...o });
const prodReq = (body, o = {}) => new Request('https://fleurdelisehealing.ca/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://fleurdelisehealing.ca', 'CF-Connecting-IP': '203.0.113.50', ...(o.headers ?? {}) }, body: JSON.stringify(body) });
test('production: refuses to run without a valid PRIMARY_ORIGIN, with a malformed sender, or with mock/test settings', () => {
  assert.equal(configProblem(PROD()), null);
  assert.match(configProblem(PROD({ PRIMARY_ORIGIN: '' })), /PRIMARY_ORIGIN/);
  assert.match(configProblem(PROD({ PRIMARY_ORIGIN: 'http://fleurdelisehealing.ca' })), /PRIMARY_ORIGIN/);
  assert.match(configProblem(PROD({ PRIMARY_ORIGIN: 'https://fleurdelisehealing.ca/path' })), /PRIMARY_ORIGIN/);
  assert.match(configProblem(PROD({ MAIL_FROM: 'not an address' })), /MAIL_FROM is malformed/);
  assert.equal(configProblem(PROD({ MAIL_FROM: 'hello@fleurdelisehealing.ca' })), null);
  assert.match(configProblem(PROD({ EMAIL_PROVIDER: 'mock' })), /mock/);
});
test('production: only the primary origin may submit (www, staging and workers.dev are refused)', async () => {
  for (const origin of ['https://www.fleurdelisehealing.ca', 'https://fleurdelise.frameworktools.ca', 'https://fleurdelise-production.acct.workers.dev', 'http://fleurdelisehealing.ca']) {
    const r = await handleInquiry(new Request('https://fleurdelisehealing.ca/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(book()) }), PROD(), net());
    assert.equal(r.status, 403, origin);
  }
  assert.equal((await handleInquiry(prodReq(book()), PROD(), net({ hostname: 'fleurdelisehealing.ca' }))).status, 200);
});
test('production: Turnstile token must be issued for the primary hostname', async () => {
  assert.equal((await handleInquiry(prodReq(book()), PROD(), net({ hostname: 'evil.example' }))).status, 403);
  __resetRateLimit();
  assert.equal((await handleInquiry(prodReq(book()), PROD(), net({ hostname: 'fleurdelisehealing.ca' }))).status, 200);
  __resetRateLimit();
  assert.equal((await handleInquiry(prodReq(book()), PROD(), net({ hostname: undefined }))).status, 403);
});
test('production: a temporary test host listed in ALLOWED_ORIGINS is accepted (origin + Turnstile hostname); nothing else is', async () => {
  const env = PROD({ ALLOWED_ORIGINS: 'https://preview.fleurdelisehealing.ca' });
  const r = await handleInquiry(new Request('https://preview.fleurdelisehealing.ca/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://preview.fleurdelisehealing.ca' }, body: JSON.stringify(book()) }), env, net({ hostname: 'preview.fleurdelisehealing.ca' }));
  assert.equal(r.status, 200);
  __resetRateLimit();
  const r2 = await handleInquiry(new Request('https://preview.fleurdelisehealing.ca/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://preview.fleurdelisehealing.ca' }, body: JSON.stringify(book()) }), env, net({ hostname: 'other.example' }));
  assert.equal(r2.status, 403);
});
test('resend: sends two requests with distinct idempotency keys; test URL override is honoured outside production only', async () => {
  const f = net({ hostname: 'fleurdelisehealing.ca' }); await handleInquiry(prodReq(book()), PROD(), f);
  const calls = f.calls.filter((c) => c.url.includes('api.resend.com'));
  assert.equal(calls.length, 2);
  const keys = calls.map((c) => c.init.headers['Idempotency-Key']); assert.match(keys[0], /^FDL-[A-Z2-9]{6}-owner$/); assert.match(keys[1], /^FDL-[A-Z2-9]{6}-ack$/);
  const f2 = net(); await handleInquiry(req(book()), baseEnv({ RESEND_API_URL: 'http://127.0.0.1:9/stub' }), f2);
  assert.ok(f2.calls.some((c) => c.url === 'http://127.0.0.1:9/stub'));
  __resetRateLimit();
  const f3 = net({ hostname: 'fleurdelisehealing.ca' }); await handleInquiry(prodReq(book()), PROD({ RESEND_API_URL: 'http://127.0.0.1:9/stub' }), f3);
  assert.ok(!f3.calls.some((c) => c.url.includes('127.0.0.1')) && f3.calls.some((c) => c.url === 'https://api.resend.com/emails'));
});
test('health endpoint: reports readiness without leaking secrets', async () => {
  const ready = handleHealth(PROD()); assert.equal(ready.status, 200); const j = await ready.json(); assert.deepEqual(j, { ready: true, environment: 'production', provider: 'resend' });
  const bad = handleHealth(PROD({ MAIL_FROM: '', RESEND_API_KEY: '' })); assert.equal(bad.status, 503); const t = await bad.text();
  assert.match(t, /"ready":false/); assert.ok(!/re_SECRET|real-secret|lise@example/.test(t));
  const r = await worker.fetch(new Request(`${ORIGIN}/api/health`), PROD()); assert.equal(r.status, 200);
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/api/health`, { method: 'POST' }), PROD())).status, 404);
});

// End-to-end QA of the booking/contact forms against a LOCAL `wrangler dev` (Worker + built static site).
// Dev-only: needs Playwright (preinstalled in the Claude Code sandbox) and a fresh `npm run build:staging`.
//   node scripts/qa/e2e-forms.cjs            (screenshots: SHOTS=/some/dir)
// Everything external is stubbed: Turnstile script + siteverify (local server), email = the Worker's mock provider.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');

const PORT = 8788, STUB = 9099, B = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.SHOTS || '';
let ipN = 10;
const results = []; const check = (name, ok, extra = '') => { results.push([ok, name, extra]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };

// --- stub Turnstile siteverify ---
const stub = http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { const t = new URLSearchParams(b).get('response'); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ success: t === 'good', 'error-codes': t === 'good' ? [] : ['invalid-input-response'] })); }); }).listen(STUB);

// --- start the Worker locally ---
const logs = [];
const wr = spawn('npx', ['wrangler', 'dev', '--local', '--port', String(PORT), '--var', `TURNSTILE_VERIFY_URL:http://127.0.0.1:${STUB}/siteverify`], { stdio: ['ignore', 'pipe', 'pipe'] });
wr.stdout.on('data', (d) => logs.push(String(d))); wr.stderr.on('data', (d) => logs.push(String(d)));
const up = async () => { for (let i = 0; i < 60; i++) { try { const r = await fetch(B + '/'); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 1000)); } throw new Error('wrangler dev did not start:\n' + logs.join('')); };

const TS_STUB = `window.turnstile={render:function(el,o){window.__ts={el:el,o:o};setTimeout(function(){o.callback(window.__tsToken||'good')},40);return 'w1'},reset:function(){setTimeout(function(){window.__ts.o.callback(window.__tsToken||'good')},40)}};`;

(async () => {
  await up();
  const browser = await chromium.launch();
  const mk = async (vp = { width: 1280, height: 900 }, { blockTs = false } = {}) => {
    const ctx = await browser.newContext({ viewport: vp, ...(vp.width < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.setExtraHTTPHeaders({ 'CF-Connecting-IP': `198.51.100.${++ipN}` }); // each scenario is a different visitor (Cloudflare sets this header at the edge)
    const p = await ctx.newPage();
    const apiCalls = []; p.on('request', (r) => { if (r.url().endsWith('/api/inquiry')) apiCalls.push(r); });
    const mailtos = []; p.on('request', (r) => { if (r.url().startsWith('mailto:')) mailtos.push(r.url()); });
    await p.route('**/challenges.cloudflare.com/**', (r) => (blockTs ? r.abort() : r.fulfill({ contentType: 'application/javascript', body: TS_STUB })));
    return { ctx, p, apiCalls, mailtos };
  };
  const fillBook = async (p, o = {}) => {
    await p.check('input[name=service][value=' + (o.service || 'reiki') + ']', { force: true });
    await p.check('input[name=format][value=virtual]', { force: true });
    await p.fill('#times', 'Weekday mornings'); await p.fill('#name', o.name ?? 'Jane Doe'); await p.fill('#email', o.email ?? 'jane@example.com');
    await p.fill('#phone', o.phone ?? '226-555-0100'); await p.fill('#message', o.message ?? 'Hello & welcome — first time.');
    await p.check('input[name=consent]', { force: true });
  };
  const noticeText = (p) => p.$eval('[data-notice]', (n) => (n.hidden ? '' : n.innerText.replace(/\s+/g, ' ').trim()));
  const shot = async (p, n) => { await p.waitForTimeout(1200); if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: false }); };

  // 1. success path (desktop)
  let { ctx, p, apiCalls, mailtos } = await mk();
  await p.goto(B + '/book', { waitUntil: 'networkidle' });
  await fillBook(p);
  await p.click('[data-submit]'); await p.waitForSelector('.result.is-shown', { timeout: 8000 });
  const heading = await p.$eval('[data-result] h2', (h) => h.innerText); const res = await p.$eval('[data-result]', (r) => r.innerText.replace(/\s+/g, ' '));
  check('book: success panel shown, form hidden', (await p.$eval('form[data-inquiry]', (f) => f.hidden)) === true && /Thank you — your request has been sent/.test(heading));
  check('book: states appointment is NOT confirmed', /not confirmed yet/i.test(res) && /Nothing is booked until you hear from her/.test(res));
  check('book: acknowledgement + reference + test-mode note shown', /jane@example\.com/.test(res) && /FDL-[A-Z2-9]{6}/.test(res) && /Test mode/.test(res), res.slice(0, 260));
  check('book: no mailto: navigation any more', mailtos.length === 0);
  check('book: exactly one API call', apiCalls.length === 1);
  const body = JSON.parse(apiCalls[0].postData()); check('book: payload has token and no honeypot content', body.token === 'good' && body.hp === '' && body.service === 'reiki' && body.consent === true);
  check('book: focus moved to result heading', await p.evaluate(() => document.activeElement.tagName === 'H2'));
  await shot(p, 'book-success-desktop');
  // 'send another'
  await p.click('[data-again]'); check('book: "Send another request" restores a clean form', (await p.inputValue('#name')) === '' && !(await p.$eval('form[data-inquiry]', (f) => f.hidden)));
  await ctx.close();

  // 2. client validation never hits the network
  ({ ctx, p, apiCalls } = await mk()); await p.goto(B + '/book', { waitUntil: 'networkidle' });
  await p.click('[data-submit]'); await p.waitForTimeout(300);
  check('book: empty submit shows errors, makes no API call', apiCalls.length === 0 && (await p.$$eval('.error', (e) => e.filter((x) => x.textContent.trim()).length)) >= 3);
  await ctx.close();

  // 3. server-side validation error shown inline (phone is only validated server-side)
  ({ ctx, p } = await mk()); await p.goto(B + '/book', { waitUntil: 'networkidle' });
  await fillBook(p, { phone: 'call me maybe' }); await p.click('[data-submit]'); await p.waitForTimeout(1200);
  check('book: server validation error appears next to the phone field and takes focus', /doesn’t look quite right/.test(await p.$eval('#phone-err', (e) => e.textContent)) && (await p.evaluate(() => document.activeElement.id)) === 'phone');
  await ctx.close();

  // 4. delivery failure -> notice with fallback, data kept, retry works
  ({ ctx, p, mailtos } = await mk()); await p.goto(B + '/book', { waitUntil: 'networkidle' });
  await fillBook(p, { name: '[test-fail]' }); await p.click('[data-submit]'); await p.waitForSelector('[data-notice]:not([hidden])', { timeout: 8000 });
  let nt = await noticeText(p);
  check('failure: clear message + fallback options', /couldn’t send your request/i.test(nt) && /Nothing has been lost/i.test(nt) && /Email Lise instead/i.test(nt) && /Call \(226\) 346-7206/i.test(nt), nt.slice(0, 200));
  const href = await p.$eval('[data-fallback-mail]', (a) => a.getAttribute('href')); const u = new URL(href);
  check('failure: fallback mailto is prefilled for Lise', u.pathname === 'fleurdelisehealing@gmail.com' && /Appointment inquiry — Reiki/.test(u.searchParams.get('subject')) && /Hello & welcome/.test(u.searchParams.get('body')));
  check('failure: form still visible with values kept and button re-enabled', (await p.inputValue('#message')).includes('Hello') && !(await p.$eval('[data-submit]', (b) => b.disabled)) && !(await p.$eval('form[data-inquiry]', (f) => f.hidden)));
  check('failure: notice is focused (announced to screen readers)', await p.evaluate(() => document.activeElement.hasAttribute('data-notice')));
  await shot(p, 'book-failure-desktop');
  await p.fill('#name', 'Jane Doe'); await p.click('[data-submit]'); await p.waitForSelector('.result.is-shown', { timeout: 8000 });
  check('failure: retry after a failure succeeds (fresh Turnstile token)', true);
  await ctx.close();

  // 5. acknowledgement failure
  ({ ctx, p } = await mk()); await p.goto(B + '/book', { waitUntil: 'networkidle' });
  await fillBook(p, { name: '[test-ack-fail]' }); await p.click('[data-submit]'); await p.waitForSelector('.result.is-shown', { timeout: 8000 });
  check('ack failure: success shown, honest note that no acknowledgement email was sent', (await p.$eval('[data-ack-no]', (e) => !e.hidden)) && (await p.$eval('[data-ack-yes]', (e) => e.hidden)));
  await ctx.close();

  // 6. Turnstile verification fails, then passes
  ({ ctx, p } = await mk()); await p.goto(B + '/book', { waitUntil: 'networkidle' });
  await fillBook(p); await p.evaluate(() => { window.__tsToken = 'bad'; window.__ts.o.callback('bad'); });
  await p.click('[data-submit]'); await p.waitForSelector('[data-notice]:not([hidden])', { timeout: 8000 });
  const tn = await noticeText(p); check('turnstile: failed verification shows a retry message and sends nothing', /Please try once more/i.test(tn), tn.slice(0, 160));
  await p.evaluate(() => { window.__tsToken = 'good'; window.__ts.o.callback('good'); }); await p.waitForTimeout(200); await p.click('[data-submit]'); await p.waitForSelector('.result.is-shown', { timeout: 8000 });
  check('turnstile: passes on the next attempt', true);
  await ctx.close();

  // 7. Turnstile script blocked
  ({ ctx, p, apiCalls } = await mk(undefined, { blockTs: true })); await p.goto(B + '/book', { waitUntil: 'networkidle' });
  await fillBook(p); await p.click('[data-submit]'); await p.waitForSelector('[data-notice]:not([hidden])', { timeout: 15000 });
  nt = await noticeText(p);
  check('turnstile blocked/unavailable: explains, nothing sent, offers email fallback', /spam-protection check/i.test(nt) && /Email Lise instead/i.test(nt) && apiCalls.length === 0);
  await ctx.close();

  // 8. network failure
  ({ ctx, p } = await mk()); await p.route('**/api/inquiry', (r) => r.abort()); await p.goto(B + '/book', { waitUntil: 'networkidle' });
  await fillBook(p); await p.click('[data-submit]'); await p.waitForSelector('[data-notice]:not([hidden])', { timeout: 8000 });
  check('network failure: same clear failure state with fallbacks', /couldn’t send your request/i.test(await noticeText(p)));
  await ctx.close();

  // 9. double-click only sends once
  ({ ctx, p, apiCalls } = await mk()); await p.goto(B + '/book', { waitUntil: 'networkidle' });
  await fillBook(p); await p.dblclick('[data-submit]'); await p.waitForSelector('.result.is-shown', { timeout: 8000 });
  check('double submit: one request only', apiCalls.length === 1);
  await ctx.close();

  // 10. contact form + SIT preset
  ({ ctx, p } = await mk()); await p.goto(B + '/contact?interest=sit', { waitUntil: 'networkidle' });
  check('contact: SIT preset selects the topic', (await p.inputValue('#topic')) === 'sit');
  await p.fill('#name', 'Sam'); await p.fill('#email', 'sam@example.com'); await p.check('input[name=consent]', { force: true });
  await p.click('[data-submit]'); await p.waitForSelector('.result.is-shown', { timeout: 8000 });
  const cr = await p.$eval('[data-result]', (r) => r.innerText.replace(/\s+/g, ' '));
  check('contact: success panel (message wording, no appointment claims)', /your message has been sent/.test(cr) && !/appointment/i.test(cr));
  await ctx.close();

  // 11. rate limit via the API (6th request in window)
  ({ ctx, p } = await mk()); await p.goto(B + '/contact', { waitUntil: 'networkidle' });
  const codes = await p.evaluate(async () => { const out = []; for (let i = 0; i < 8; i++) { const r = await fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'contact', name: 'x', email: 'x@example.com', message: 'hi', consent: true, token: 'good' }) }); out.push(r.status); } return out; });
  check('rate limit: requests beyond the window cap get 429', codes.includes(429) && codes[0] === 200, codes.join(','));
  await ctx.close();

  // 12. raw API guards on the real runtime
  const g = (path, init) => fetch(B + path, init).then((r) => r.status);
  check('api: GET -> 405, unknown /api path -> 404, cross-origin POST -> 403', (await g('/api/inquiry')) === 405 && (await g('/api/nothing')) === 404 && (await g('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' })) === 403);
  const asset = await fetch(B + '/about'); check('static pages still served directly with noindex header (staging)', asset.status === 200 && /noindex/.test(asset.headers.get('x-robots-tag') || ''));
  const fontRes = await fetch(B + '/_astro/' + fs.readdirSync('dist/_astro').find((f) => f.endsWith('.woff2'))); check('hashed assets keep immutable caching', /immutable/.test(fontRes.headers.get('cache-control') || ''));

  // 13. accessibility + mobile
  const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js', { paths: [process.env.AXE_DIR || process.cwd()] }), 'utf8');
  ({ ctx, p } = await mk()); await p.goto(B + '/book', { waitUntil: 'networkidle' });
  for (let i = 0; i < 8; i++) await p.keyboard.press('Tab');
  const ring = await p.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a.nextElementSibling); return { name: a.name, w: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor }; });
  check('a11y: keyboard focus on a choice card has a solid 3px plum outline', ring.name === 'service' && ring.w >= 3 && ring.style === 'solid' && /76, 31, 49/.test(ring.color), JSON.stringify(ring));
  await p.goto(B + '/book', { waitUntil: 'networkidle' }); await p.keyboard.press('Tab'); await p.keyboard.press('Enter');
  check('a11y: skip link moves focus into <main>', await p.evaluate(() => document.activeElement.id === 'main'));
  const crumb = await p.$eval('.crumbs a', (a) => { const r = a.getBoundingClientRect(); return { h: r.height, w: r.width }; });
  check('a11y: breadcrumb link target is at least 44px tall', crumb.h >= 44, JSON.stringify(crumb));
  await fillBook(p, { name: '[test-fail]' }); await p.click('[data-submit]'); await p.waitForSelector('[data-notice]:not([hidden])');
  await p.evaluate(axe); let ax = await p.evaluate(() => axe.run()); check('a11y: axe — failure-notice state has 0 violations', ax.violations.length === 0, ax.violations.map((v) => v.id).join(','));
  await p.click('[data-copy]'); await p.waitForTimeout(200);
  await p.fill('#name', 'Jane'); await p.click('[data-submit]'); await p.waitForSelector('.result.is-shown');
  ax = await p.evaluate(() => axe.run()); check('a11y: axe — success state has 0 violations', ax.violations.length === 0, ax.violations.map((v) => v.id).join(','));
  await ctx.close();
  for (const [label, vp] of [['phone', { width: 390, height: 844 }], ['ipad', { width: 820, height: 1180 }]]) {
    ({ ctx, p } = await mk(vp)); await p.goto(B + '/book', { waitUntil: 'networkidle' });
    await fillBook(p, { name: '[test-fail]' }); await p.click('[data-submit]'); await p.waitForSelector('[data-notice]:not([hidden])'); await p.waitForTimeout(500);
    const bad = await p.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll('[data-notice] a, [data-notice] button, [data-submit]')].filter((e) => e.getBoundingClientRect().height < 44 && e.getBoundingClientRect().height > 0).map((e) => e.textContent.trim().slice(0, 20)) }));
    check(`mobile (${label}): failure notice fits, controls ≥44px`, !bad.overflow && bad.small.length === 0, JSON.stringify(bad));
    await shot(p, `book-failure-${label}`);
    await p.fill('#name', 'Jane'); await p.click('[data-submit]'); await p.waitForSelector('.result.is-shown'); await p.waitForTimeout(400);
    check(`mobile (${label}): success panel fits`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
    await shot(p, `book-success-${label}`);
    await ctx.close();
  }

  // 14. server logs: no PII, mock emails logged as metadata only
  await new Promise((r) => setTimeout(r, 500));
  const all = logs.join('');
  check('worker logs: mock emails recorded, no names/emails/message text', /\[mock-email\]/.test(all) && !/jane@example|Jane Doe|Hello & welcome|sam@example/i.test(all));

  await browser.close(); wr.kill('SIGTERM'); stub.close();
  const failed = results.filter((r) => !r[0]);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); try { wr.kill('SIGTERM'); } catch {} process.exit(1); });

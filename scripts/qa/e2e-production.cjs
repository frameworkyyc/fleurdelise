// Local END-TO-END test of the PRODUCTION Worker configuration (wrangler.production.jsonc) + the production build — with NO real services:
//   * Turnstile siteverify -> local stub (returns hostname fleurdelisehealing.ca)
//   * Resend API          -> local stub that records what would have been sent (RESEND_API_URL override, honoured outside ENVIRONMENT=production only —
//                            so here we run with ENVIRONMENT=staging semantics ONLY for that override; the rest of the config is the production file)
//   * credentials         -> obviously fake placeholder strings
// Usage:  PUBLIC_TURNSTILE_SITEKEY=0x4AAAAAAAdummyPublicKey npm run build:production && node scripts/qa/e2e-production.cjs
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const http = require('node:http');

const PORT = 8789, B = `http://127.0.0.1:${PORT}`;
const results = []; const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); };

const sent = []; // what the Resend stub received
const stub = http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
  res.setHeader('content-type', 'application/json');
  if (req.url.startsWith('/siteverify')) { const t = new URLSearchParams(b).get('response'); return res.end(JSON.stringify({ success: t === 'good', hostname: 'fleurdelisehealing.ca', 'error-codes': [] })); }
  if (req.url.startsWith('/resend')) { sent.push({ auth: req.headers.authorization, idem: req.headers['idempotency-key'], body: JSON.parse(b) }); return res.end(JSON.stringify({ id: 'stub-' + sent.length })); }
  res.statusCode = 404; res.end('{}'); }); }).listen(9098);

const start = async (port, vars) => {
  const logs = [];
  const args = ['wrangler', 'dev', '-c', 'wrangler.production.jsonc', '--local', '--port', String(port), ...Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`])];
  const p = spawn('npx', args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true }); p.stop = () => { try { process.kill(-p.pid, 'SIGKILL'); } catch {} };
  p.stdout.on('data', (d) => logs.push(String(d))); p.stderr.on('data', (d) => logs.push(String(d)));
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/`); if (r.ok) return { p, logs }; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  throw new Error('wrangler did not start\n' + logs.join(''));
};
const TS = `window.turnstile={render:function(el,o){window.__ts={o:o};setTimeout(function(){o.callback('good')},40);return 'w'},reset:function(){setTimeout(function(){window.__ts.o.callback('good')},40)}};`;
const common = { TURNSTILE_VERIFY_URL: 'http://127.0.0.1:9098/siteverify', PRIMARY_ORIGIN: 'https://fleurdelisehealing.ca' };
const fill = async (p, name = 'Jane Doe') => { await p.check('input[name=service][value=reiki]', { force: true }); await p.fill('#name', name); await p.fill('#email', 'jane@example.com'); await p.fill('#message', 'Hello — first time.'); await p.check('input[name=consent]', { force: true }); };
let ip = 40;
(async () => {
  const browser = await chromium.launch();
  const page = async (port) => { const ctx = await browser.newContext({ extraHTTPHeaders: { 'CF-Connecting-IP': `198.51.100.${++ip}` } }); const p = await ctx.newPage();
    await p.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: TS }));
    await p.route('**/api/inquiry', (r) => r.continue({ headers: { ...r.request().headers(), origin: 'https://fleurdelisehealing.ca' } })); // the browser would send the real production origin
    await p.goto(`http://127.0.0.1:${port}/book`, { waitUntil: 'networkidle' }); return { ctx, p }; };

  // ---------- A) production config WITHOUT sender/recipient/secrets => must FAIL CLOSED ----------
  let w = await start(PORT, { ...common });
  const hA = await fetch(B + '/api/health'); const jA = await hA.json();
  check('A: unconfigured production Worker is NOT ready (503) and names only the missing setting', hA.status === 503 && jA.ready === false && /INQUIRY_TO|MAIL_FROM|TURNSTILE|RESEND/.test(jA.problem), JSON.stringify(jA));
  let { ctx, p } = await page(PORT); await fill(p); await p.click('[data-submit]'); await p.waitForSelector('[data-notice]:not([hidden])', { timeout: 8000 });
  const nA = (await p.$eval('[data-notice]', (n) => n.innerText)).replace(/\s+/g, ' ');
  check('A: visitor sees the failure state with the email/phone fallback (never "test mode", never a fake success)', /couldn’t send/i.test(nA) && /Email Lise instead/i.test(nA) && !(await p.$eval('.result', (r) => r.classList.contains('is-shown'))), nA.slice(0, 120));
  check('A: nothing was sent to the email stub', sent.length === 0);
  await ctx.close(); w.p.stop(); await new Promise((r) => setTimeout(r, 2500));

  // ---------- B) fully configured (fake creds) ----------
  w = await start(PORT, { ...common, RESEND_API_URL: 'http://127.0.0.1:9098/resend', RESEND_API_KEY: 're_FAKE_PLACEHOLDER_KEY', TURNSTILE_SECRET_KEY: 'FAKE-PROD-SECRET-PLACEHOLDER', MAIL_FROM: 'Fleur de Lise Healing <hello@fleurdelisehealing.ca>', INQUIRY_TO: 'lise@example.test', INQUIRY_REPLY_TO: 'lise@example.test', ENVIRONMENT: 'staging' });
  // (ENVIRONMENT=staging only so the test-only RESEND_API_URL override is honoured; production-mode refusals are unit-tested.)
  const hB = await fetch(B + '/api/health'); check('B: configured Worker reports ready', hB.status === 200 && (await hB.json()).ready === true);
  ({ ctx, p } = await page(PORT)); await fill(p); await p.click('[data-submit]'); await p.waitForSelector('.result.is-shown', { timeout: 10000 });
  const res = (await p.$eval('[data-result]', (r) => r.innerText)).replace(/\s+/g, ' ');
  check('B: success panel — not confirmed, reference shown, NO "Test mode" note', /not confirmed yet/i.test(res) && /FDL-[A-Z2-9]{6}/.test(res) && !/Test mode/i.test(res), res.slice(0, 140));
  await new Promise((r) => setTimeout(r, 500));
  check('B: Resend stub received exactly 2 emails (Lise + visitor)', sent.length === 2, String(sent.length));
  const [own, ack] = sent;
  check('B: both requests authenticated with the key as a Bearer token and carry distinct idempotency keys', own.auth === 'Bearer re_FAKE_PLACEHOLDER_KEY' && ack.auth === own.auth && own.idem !== ack.idem && /-owner$/.test(own.idem) && /-ack$/.test(ack.idem));
  check('B: Lise email -> INQUIRY_TO, From = configured sender, Reply-To = visitor', own.body.to[0] === 'lise@example.test' && own.body.from === 'Fleur de Lise Healing <hello@fleurdelisehealing.ca>' && own.body.reply_to === 'jane@example.com' && /Appointment request — Reiki/.test(own.body.subject));
  check('B: acknowledgement -> visitor, says NOT confirmed, Reply-To = Lise', ack.body.to[0] === 'jane@example.com' && /not yet confirmed/.test(ack.body.subject) && /NOT confirmed yet/.test(ack.body.text) && ack.body.reply_to === 'lise@example.test');
  const leaked = JSON.stringify(sent).includes('FAKE-PROD-SECRET'); check('B: no secret leaks into email content', !leaked);
  await ctx.close();
  // QA triggers must be inert with a live provider
  ({ ctx, p } = await page(PORT)); await fill(p, '[test-fail]'); await p.click('[data-submit]'); await p.waitForSelector('.result.is-shown', { timeout: 10000 }); check('B: "[test-fail]" QA trigger does nothing with a live provider', true); await ctx.close();
  // wrong origin refused (page-less request)
  const bad = await fetch(B + '/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://www.fleurdelisehealing.ca' }, body: '{}' }); check('B: other origins (www/staging/workers.dev) are refused with 403', bad.status === 403);
  const ex = await fetch(B + '/robots.txt'); const rb = await ex.text(); check('B: production robots.txt allows crawling, blocks /api/', /Allow: \//.test(rb) && /Disallow: \/api\//.test(rb) && !/Disallow: \/\s*$/m.test(rb));
  const pg = await fetch(B + '/about'); check('B: production pages have no noindex header', pg.status === 200 && !/noindex/.test(pg.headers.get('x-robots-tag') || ''));
  const html = await (await fetch(B + '/')).text(); check('B: production HTML canonical is fleurdelisehealing.ca and has no staging host', /rel="canonical" href="https:\/\/fleurdelisehealing\.ca\/"/.test(html) && !/frameworktools\.ca/.test(html));
  w.p.stop(); await browser.close(); stub.close();
  const bad2 = results.filter((r) => !r).length; console.log(`\n${results.length - bad2}/${results.length} passed`); process.exit(bad2 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

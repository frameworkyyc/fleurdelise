# Production environment & cutover runbook — fleurdelisehealing.ca

Status: **prepared in code and tested locally; nothing in Cloudflare, Resend, DNS or Wix has been changed.** The live domain is **still served by the staging Worker** until Part D (which needs your separate approval).

## What exists now
| | Staging | Production (prepared) |
|---|---|---|
| Worker | `fleurdelise` (unchanged) | `fleurdelise-production` (**to be created** by the pipeline in Part C) |
| Config file | `wrangler.jsonc` | `wrangler.production.jsonc` (no routes, no secrets, `keep_vars`) |
| Branch / build | `staging` · `npm run build:staging` | `main` · `npm run build:production` (fixes `PUBLIC_SITE_URL=https://fleurdelisehealing.ca`) |
| Hostname | fleurdelise.frameworktools.ca (**and, temporarily, fleurdelisehealing.ca until cutover**) | fleurdelisehealing.ca (after cutover) |
| Email | `mock` (test only) | `resend` — **mock is impossible**: the Worker refuses to run in production with mock mail, a Turnstile test key, a missing `PRIMARY_ORIGIN`, or a malformed sender |
| SEO | noindex everywhere | indexable, canonicals/sitemap/JSON-LD = `.ca`, `Disallow: /api/` |

Safeguards added (all tested):
- Production **build fails** if canonicals aren't `fleurdelisehealing.ca`, if the Turnstile site key is missing/looks like a Cloudflare test key; a non-production build can never claim the `.ca` host. `check:seo` fails if a build mentions the other environment's host or the old `.com`.
- Production Worker **fails closed**: until `INQUIRY_TO`, `MAIL_FROM`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY` are set, `/api/inquiry` returns 503 and visitors see the "couldn't send" state with the email/phone fallback (never a fake success).
- Only `PRIMARY_ORIGIN` may submit; Turnstile tokens must be issued for that hostname; each Resend send carries an idempotency key; `GET /api/health` reports readiness (names a missing setting, never values).
- Tests: 25 Worker unit tests; `scripts/qa/e2e-production.cjs` — 15 checks of the production config on the real workerd runtime with stubbed Turnstile/Resend (fails closed when unconfigured; two correct emails when configured; no "Test mode"; origin pinning; robots/canonical/headers); `scripts/qa/production-build-check.sh` offline pre-flight.

---
## Part A — Resend (manual)
1. Create/sign in to a Resend account (decide who owns it: Framework or Lise).
2. **Domains → Add domain** `fleurdelisehealing.ca` (nearest available region). Resend shows the DNS records it needs (DKIM, SPF, a return-path MX/TXT on a sending subdomain). **Adding them in Cloudflare DNS is a DNS change — send me/confirm approval first (or add them yourself).** Create them as **DNS only (grey cloud)**. Also add a DMARC TXT record at `_dmarc` (start with `p=none` and your reporting address, tighten later).
3. Wait until the domain shows **Verified**.
4. **API Keys → Create API key**: permission **Sending access**, restricted to the `fleurdelisehealing.ca` domain. Copy it once. **Never paste it in chat or commit it** — it goes only into the Cloudflare secret in Part C-7.
5. Decide the sender: recommended `Fleur de Lise Healing <hello@fleurdelisehealing.ca>` (any address on the verified domain works; replies go to Lise through Reply-To).
6. (Optional) Cloudflare **Email Routing** for `hello@fleurdelisehealing.ca` → Lise's Gmail so replies to the sender address also arrive. Another DNS change (MX at the apex) — separate approval.

## Part B — Cloudflare Turnstile (manual)
1. Cloudflare dashboard → **Turnstile → Add widget**. Name: "Fleur de Lise Healing — production". Hostname: `fleurdelisehealing.ca` (add `preview.fleurdelisehealing.ca` too **only if** you do the pre-cutover test in Part C-9). Mode **Managed**.
2. Copy the **Site key** (public, starts `0x4…`) and the **Secret key**. Keep the secret out of chat/git.

## Part C — Create the production Worker + pipeline (manual, no domain changes)
1. Dashboard → **Workers & Pages → Create → Import a repository** (Workers Builds) → GitHub → `frameworkyyc/fleurdelise`.
2. **Worker name:** `fleurdelise-production` (must match `name` in `wrangler.production.jsonc`).
3. **Production branch:** `main`. **Builds for non-production branches:** off.
4. **Build command:** `npm run build:production` · **Deploy command:** `npx wrangler deploy -c wrangler.production.jsonc` · root `/`.
5. **Build variables** (Settings → Build → *Variables and secrets* for the **build**): `PUBLIC_TURNSTILE_SITEKEY` = the **site key** from Part B; `NODE_VERSION` = `22`. (Do not set `PUBLIC_SITE_URL` — `build:production` sets it. The build refuses a missing or test key.)
6. Save and run the first build. Expected log: `post-build: production build` and a successful `wrangler deploy` of `fleurdelise-production`. The Worker has **no URL and no domain** at this point (workers.dev and previews are off) — that is intentional; the live site is untouched.
7. **Worker → Settings → Variables and secrets (runtime)** — add:
   | Name | Type | Value |
   |---|---|---|
   | `RESEND_API_KEY` | **Secret** | the key from Part A-4 |
   | `TURNSTILE_SECRET_KEY` | **Secret** | the secret key from Part B-2 |
   | `INQUIRY_TO` | Text | Lise's confirmed receiving address |
   | `MAIL_FROM` | Text | `Fleur de Lise Healing <hello@fleurdelisehealing.ca>` (or your chosen sender) |
   | `INQUIRY_REPLY_TO` | Text (optional) | defaults to `INQUIRY_TO` |
   `ENVIRONMENT=production`, `EMAIL_PROVIDER=resend`, `PRIMARY_ORIGIN=https://fleurdelisehealing.ca` come from the config file. `keep_vars` makes your dashboard values survive deploys. (If you'd rather keep the non-secret ones in git, tell me and I'll commit them.)
8. Do **not** add routes/custom domains yet.
9. **Recommended real-world test before cutover (needs your approval — it adds a hostname and an Access policy):** attach a temporary custom domain `preview.fleurdelisehealing.ca` to `fleurdelise-production`, protect it with a Cloudflare Access policy (your email only), add `ALLOWED_ORIGINS=https://preview.fleurdelisehealing.ca` as a runtime variable and the hostname to the Turnstile widget. Then: open `/api/health` (must show `{"ready":true,"environment":"production","provider":"resend"}`) and, **only with your explicit go-ahead**, do one supervised submission. Confirm: Lise's inbox gets the request (Reply-To = you), your test address gets the acknowledgement saying "not yet confirmed", neither is in spam, headers show SPF/DKIM = pass, and **no "Test mode" note appears**. Afterwards delete the preview hostname, the Access policy, `ALLOWED_ORIGINS`, and the extra Turnstile hostname.

## Part D — Cutover (**do not start without a separate go-ahead**)
Pre-flight: Part A verified · Part C-9 test passed · `main` deploy is green · Lise informed · Wix `.com` untouched.
1. **www redirect:** DNS → add `www` as a **proxied** record (e.g. `A www 192.0.2.1`, orange cloud) and a **Redirect Rule**: *hostname equals `www.fleurdelisehealing.ca`* → **Dynamic** `concat("https://fleurdelisehealing.ca", http.request.uri.path)`, status **301**, **preserve query string**.
2. **Move the apex:** Workers → `fleurdelise` → Settings → Domains & Routes → **remove** `fleurdelisehealing.ca` (keep `fleurdelise.frameworktools.ca`); then Workers → `fleurdelise-production` → Domains & Routes → **Add custom domain** `fleurdelisehealing.ca`. Expect a short gap (minutes) while the certificate/route attaches — do it off-peak.
3. **SSL/TLS & edge:** SSL mode **Full (strict)**; **Always Use HTTPS**; Automatic HTTPS Rewrites; Minimum TLS **1.2**; TLS 1.3 on; **DNSSEC** on (registrar is Cloudflare). After verifying everything loads over HTTPS for a few days, enable **HSTS** (6 months, no preload yet).
4. **WAF rate-limit rule** (free plan allows one): `URI Path equals /api/inquiry` and `Method equals POST` → block ~10 s after ~10 requests / 10 s per IP.
5. **Verify:** run `bash scripts/qa/verify-live.sh` and send me the output. Expect: valid cert, `http→https` 301, `www → apex` 301, **no** `X-Robots-Tag: noindex`, `index, follow`, canonicals/og:url/JSON-LD `.ca`, `robots.txt` Allow + `Disallow: /api/`, sitemap with 11 `.ca` URLs, `/api/health` ready, no Turnstile *test* key in `/book`.
6. **Search:** Google Search Console (Domain property `fleurdelisehealing.ca`) → submit `https://fleurdelisehealing.ca/sitemap-index.xml`; Bing Webmaster Tools; update the Google Business Profile website to `.ca` with Lise.
7. **Staging afterwards:** `fleurdelise` keeps only `fleurdelise.frameworktools.ca` (mock mail, noindex). Adding a Cloudflare Access policy there is a separate approval.
8. **Rollback (fast):** remove the apex from `fleurdelise-production`, re-attach it to `fleurdelise` (this restores today's state: the staging build, noindex, mock forms), then investigate.

## Part E — Review of submissions received while mock delivery was active (manual; I cannot read Workers Logs with the available token)
Mock mode **discarded** every request after validation, so those visitors were told "sent" but nothing was delivered and no contact details were stored (logs deliberately contain no names/emails). Count them:
1. Dashboard → **Workers & Pages → `fleurdelise` → Observability → Logs** (Events view).
2. Time range: from **2026-11-08 23:00 UTC** (first deploy containing the forms) to now.
3. Filter: message **contains** `"evt":"inquiry"` **and** `"ok":true` (add `"provider":"mock"`). Each such line = one submission accepted but not delivered (`"kind"` shows `book` or `contact`). Lines containing `[mock-email]` come in pairs per submission. Ignore your own tests (filter by request host if the log shows it; test submissions used staging or names like Jane/Sam).
4. Also look for `"code":"rate_limited"`, `"verification"`, `"server_misconfigured"` to see failures.
5. Tell me the count and date range. Since contact details weren't kept, follow-up is only possible through other channels (e.g. Lise's phone/social messages); do **not** assume zero just because Gmail is empty.
6. Until cutover, consider asking Lise to mention the phone/email on any social posts that link the site — the live forms currently show "Test mode … no email was sent".

## Manual checklist (summary)
- [ ] Resend account, domain verified (DNS records), API key (Sending access)
- [ ] DMARC record; optional Email Routing for `hello@`
- [ ] Turnstile widget for `fleurdelisehealing.ca`; site key + secret key saved
- [ ] Workers Builds: `fleurdelise-production` from `main`, build/deploy commands, build variables `PUBLIC_TURNSTILE_SITEKEY` + `NODE_VERSION`
- [ ] Runtime secrets `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`; text vars `INQUIRY_TO`, `MAIL_FROM` (+ optional `INQUIRY_REPLY_TO`)
- [ ] First build green; `/api/health` ready on the preview host; one supervised live test
- [ ] Logs review (Part E) and count reported
- [ ] **Approval for Part D**, then the cutover steps and verification

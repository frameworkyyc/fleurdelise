# Production configuration & launch audit — fleurdelisehealing.ca (Phase 1: audit only)

Date: 2026-11-09. **Nothing was modified** — no production, staging, DNS, Cloudflare, Resend or Wix changes; no form submissions; no emails sent; no secret values were read or are shown here.

## 0. How this was verified (and what could not be)
| Evidence level | Sources |
|---|---|
| **Verified** | Cloudflare API (read-only): zones, Worker custom domains, Worker bindings (names/types; only non-secret vars read), deployments/versions, Turnstile widget list (no secrets), invocation counts. The repository + docs. **Local builds** of the exact code that is deployed, and of a correct production build. Local lab tests (unit 19/19, accessibility, bloom, performance). |
| **Derived (high confidence, deterministic)** | What the live site returns: the deployed Worker serves a static build; the build output is fixed, so its canonicals/robots/headers/forms are known exactly from a local rebuild with the same command. |
| **NOT verified (blocked)** | Any live HTTP response (status, redirects, TLS certificate), DNS records, zone SSL/HSTS/redirect-rule settings, Resend account/domain, SPF/DKIM/DMARC, Access protection on staging, Workers Logs, real-user Core Web Vitals. Reasons: the sandbox network blocks `fleurdelisehealing.ca`, `www.`, the `.com`, and staging (the web-fetch agents failed with DNS errors); the available Cloudflare token has no DNS / zone-settings / rulesets / certificates / Access / Builds / Logs permissions. **`scripts/qa/verify-live.sh`** (GET-only) closes these gaps when run from your computer. |

## 1. CRITICAL — needs immediate attention
### C1. The production domain is served by the **staging** deployment
- Worker custom domains: **both** `fleurdelisehealing.ca` and `fleurdelise.frameworktools.ca` point to the **same** Worker `fleurdelise`. That Worker is built from the `staging` branch with `npm run build:staging` (docs/DEPLOYMENT.md; Worker last deployed 2026-11-09 00:22 UTC from the staging branch). There is no `main` branch on GitHub and no separate production pipeline.
- A local rebuild with that exact command shows what **https://fleurdelisehealing.ca currently serves**:
  - `<meta robots="noindex, nofollow">` on every page and `X-Robots-Tag: noindex, nofollow, noarchive` on every response → **Google will not index the site**;
  - `robots.txt` = `Disallow: /`; **no sitemap**;
  - canonical, `og:url` and all JSON-LD URLs = `https://fleurdelise.frameworktools.ca/…` (the staging host).
- Impact: zero organic visibility, wrong canonical signals, and search engines are told the staging host is the real site.

### C2. Contact/booking forms on the live site are in **test mode** — requests are silently lost
Worker `fleurdelise` bindings: `ENVIRONMENT=staging`, `EMAIL_PROVIDER=mock`, `INQUIRY_TO` set, `TURNSTILE_SECRET_KEY` = Cloudflare's public **test** secret (as a plain-text var). **No** `RESEND_API_KEY`, **no** `MAIL_FROM`.
- Pages carry Turnstile's always-pass **test site key** (`1x00000000000000000000AA`) → **no real spam protection**.
- A visitor who submits sees "Thank you — your request has been sent" **plus** "Test mode — this is a test environment — no email was actually sent". **Nothing reaches Lise and no acknowledgement is sent.**
- Action for you now: Cloudflare → Workers & Pages → `fleurdelise` → **Logs** and search `"evt":"inquiry"`; each `"ok":true` line since the domain went live is a submission that was **lost** (logs contain no names/emails by design, so follow up with visitors only via other channels). I could not read logs (token lacks permission). If the site has been shared publicly, consider a temporary notice or pausing the forms until C1/C2 are fixed.

### C3. No production build configuration; fallback URL is the old `.com`
`astro.config.mjs` and `src/data/site.ts` fall back to `https://fleurdelisehealing.com` when `PUBLIC_SITE_URL` is unset. A production build **without** that variable emits `.com` canonicals and a `.com` sitemap (reproduced locally). With `PUBLIC_SITE_URL=https://fleurdelisehealing.ca`, the same build is clean (see §2).

## 2. What is working correctly
- **Zone:** `fleurdelisehealing.ca` is **active** on Cloudflare (Free plan, Cloudflare nameservers) and registered/hosted in the same account. The apex is attached as a Worker custom domain (Cloudflare manages the certificate for custom domains).
- **A correct `.ca` production build passes everything locally:** `check:seo` 0 FAIL / 0 WARN in production mode; canonicals/OG/JSON-LD/sitemap all `https://fleurdelisehealing.ca/…`; **no** `.com` or `frameworktools.ca` strings in any HTML/XML/TXT; `robots.txt` = `Allow: /`, `Disallow: /api/`, `Sitemap: …ca/sitemap-index.xml`; 12 pages indexable; sitemap lists all 11 public URLs; SIT stays a coming-soon page with no Service schema; no broken internal links; no duplicate titles/descriptions.
- **Forms code:** 19/19 Worker unit tests; 37/37 browser E2E checks earlier; production Worker refuses to run with mock mail or Turnstile test keys when `ENVIRONMENT=production`; a production **build** fails without `PUBLIC_TURNSTILE_SITEKEY`; logs contain no PII.
- **Worker hygiene:** `workers_dev` and preview URLs are off; only `/api/*` runs Worker code, static files are served directly; Workers Logs enabled; last 3 days: 350 invocations, **0 errors**.
- **Accessibility / responsive:** axe-core 0 violations on all 11 pages × desktop/mobile; focus, skip-link and tap-target fixes in place; no horizontal overflow at phone/iPad widths.
- **Bloom:** plays on the default path, the lite variant loads for weaker devices (4 cores), static logo always ends fully visible; no console errors (lab, Chromium).
- **Performance (lab, mobile 390×844):** CLS 0.000 everywhere; inner pages LCP 0.1 s fast / 0.4 s throttled; home repeat view LCP 1.5 s fast / 2.6 s on 4× CPU + slow 4G; first visit with bloom 2.9 s / 5.0 s (known trade-off, timeline-bound). Real-user data does not exist yet.
- **Caching/headers (in the build):** `/_astro/*` immutable 1 year; `/brand/*` 7 days + SWR; nosniff, referrer-policy, permissions-policy; custom 404 page (noindex).

## 3. Not verified — please confirm (run `bash scripts/qa/verify-live.sh` and send me the output)
1. HTTPS certificate on apex and **www**; http→https redirect.
2. **www**: there is **no Worker custom domain for `www.fleurdelisehealing.ca`**, and DNS/redirect rules were unreadable → www most likely does not resolve or does not redirect. Needs a proxied DNS record + a 301 redirect rule to the apex.
3. DNS records for `.ca` (A/AAAA/CNAME for apex, www, MX/SPF/DKIM/DMARC, CAA, DNSSEC).
4. Zone settings: SSL/TLS mode (Full strict), Always Use HTTPS, Min TLS, HSTS, Automatic HTTPS Rewrites, HTTP/3, WAF/rate limiting, Bot settings.
5. **Staging protection:** the staging hostname is noindex (meta + header + robots), but **I could not confirm a Cloudflare Access policy** — the token shows 0 Access applications. If Access is meant to protect staging, check it exists and covers `fleurdelise.frameworktools.ca`. (Once production moves to its own Worker, staging stays noindex by construction.)
6. Resend: account, API key, verified sending domain, SPF/DKIM/DMARC — **not configured on the Worker (no secret, no `MAIL_FROM`)**; domain verification status unknown.
7. Turnstile: **no widget exists for `fleurdelisehealing.ca`** (the account's only widget is "Framework Assessment" for frameworkco.ca hostnames).
8. Live `/book` and `/contact` behaviour, live bloom and real-device Safari/iPad checks.

## 4. Recommended improvements, ranked
| # | Pri | Change | Needs |
|---|---|---|---|
| 1 | **P0** | **Create a real production deployment** — separate Worker (e.g. `fleurdelise-production`) or a Wrangler `env.production`, with its own Workers Builds connection from a `main` branch, build `npm run build:production`, build variables `PUBLIC_SITE_URL=https://fleurdelisehealing.ca` + `PUBLIC_TURNSTILE_SITEKEY`, vars `ENVIRONMENT=production`, `EMAIL_PROVIDER=resend`, `MAIL_FROM`, `INQUIRY_TO`, `INQUIRY_REPLY_TO`. Move the `.ca` custom domain from the staging Worker to it (deploy first, then switch, to avoid downtime). Keep `fleurdelise` as staging only. | Your approval; creates a Worker + build trigger |
| 2 | **P0** | **Activate real email** (docs/FORMS-DELIVERY.md): Resend account + API key (secret), verify the sending domain, `RESEND_API_KEY` and a **real** `TURNSTILE_SECRET_KEY` as **secrets** (not plain vars), Turnstile widget for `fleurdelisehealing.ca` + `www`, then one supervised live test (needs your explicit go-ahead; I will not submit anything without it). | Resend account/key, Lise's receiving address, DNS records for the sending domain |
| 3 | **P0** | Change the code defaults from `.com` to `.ca` (`astro.config.mjs`, `src/data/site.ts`, wrangler comment, README, DEPLOYMENT/SEO docs); make a production build **fail** if `PUBLIC_SITE_URL` is missing or not the expected host. | Approval (small code change) |
| 4 | P1 | **www → apex** 301 (proxied DNS record + Redirect Rule preserving path/query); decide apex as canonical (recommended). | Cloudflare DNS/rules change |
| 5 | P1 | **Zone hardening:** SSL Full (strict), Always Use HTTPS, Automatic HTTPS Rewrites, Min TLS 1.2, enable **DNSSEC** (registrar is Cloudflare), HSTS after confirming HTTPS everywhere, CAA if desired, WAF rate-limit rule for `POST /api/inquiry`. | Cloudflare settings changes |
| 6 | P1 | **Email DNS** on `.ca`: SPF/DKIM/DMARC for Resend; optionally Cloudflare Email Routing for a branded `hello@fleurdelisehealing.ca` forwarding to Lise's Gmail. | DNS changes |
| 7 | P1 | **Search setup after launch fix:** Google Search Console (Domain property) + Bing Webmaster for `.ca`, submit `sitemap-index.xml`; set Google Business Profile website to `.ca` (with Lise). | Lise/Google accounts |
| 8 | P1 | **Staging protection:** confirm/restore a Cloudflare Access policy on `fleurdelise.frameworktools.ca`; keep triple noindex. | Cloudflare Zero Trust |
| 9 | P2 | Security headers: add a Content-Security-Policy (report-only first), `frame-ancestors`, COOP; HSTS at the edge. | Approval |
| 10 | P2 | Wix `.com`: leave untouched. Note the `.com` zone sits in this Cloudflare account as **pending** (not active) — do not change its nameservers until the redirect plan exists. Plan a future `.com → .ca` 301 (needs the Wix URL inventory → `redirects/redirects.txt`, still empty). Until then both sites are live (duplicate-brand risk; the `.ca` site is brand new). | Your decision |
| 11 | P2 | Privacy page: name the email provider once chosen; update "Last updated". | Lise review |
| 12 | P2 | Analytics (Cloudflare Web Analytics is cookieless) + form/phone-click events; field monitoring: alert if `/api/inquiry` returns 5xx. | Your choice |
| 13 | P3 | Real-user monitoring: review Search Console CWV/CrUX after ~28 days; first-visit bloom LCP stays a known trade-off. | Time |

## 5. Cloudflare configuration changes needed (for the approval phase)
1. **Workers:** new production Worker/env + Workers Builds trigger (branch `main`, `npm run build:production`, build vars above); attach `fleurdelisehealing.ca` (+ `www`) to it; detach from `fleurdelise`; remove the `.ca` domain from the staging Worker's list.
2. **Secrets/vars (production Worker):** secrets `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`; vars as in P0-1. Remove the plain-text test secret from staging only when staging gets its own test keys.
3. **Turnstile:** Managed widget, hostnames `fleurdelisehealing.ca`, `www.fleurdelisehealing.ca` (+ staging host for a separate staging widget).
4. **DNS / Rules:** proxied `www` record + Redirect Rule `www → https://fleurdelisehealing.ca${uri}` (301); Resend SPF/DKIM/DMARC (and Email Routing MX if used).
5. **SSL/TLS & security:** items in P1-5; DNSSEC.
6. **Zero Trust:** Access policy for staging (confirm).

## 6. Credentials / decisions needed from you
- Approval to build the production pipeline (P0-1) and the small code/config changes (P0-3).
- Lise's **confirmed receiving address** and reply-to; preferred sender (e.g. `hello@fleurdelisehealing.ca`).
- A **Resend account/API key** (you/Lise create it; set it as a Worker secret yourself or approve me doing it via an API token with Workers-secrets permission — never paste keys in chat) and the DNS records Resend gives you.
- Confirmation that **`.ca` is the primary domain**, and `www` → apex.
- The `.com`/Wix plan and the Wix URL inventory (sitemap, Search Console exports) when ready.
- To finish verification: run `bash scripts/qa/verify-live.sh` and send the output, **and/or** provide a Cloudflare API token with read access to Zone DNS, Zone Settings, Rulesets, Certificates, Access, Workers Builds and Workers Observability (or paste the dashboard values), **and/or** approve adding the four hostnames to this sandbox's network allowlist so I can re-run the live checks myself.
- Whether any real visitor submissions arrived since launch (see C2 logs check) and how to follow up.

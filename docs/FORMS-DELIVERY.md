# Booking-request & contact forms — server-side delivery (Phase 2A)

Model: **Request & Confirm.** A visitor sends an appointment *request*; Lise replies to confirm. No instant booking, calendar, payments or scheduler integrations exist or are planned in this phase.

## How it works
```
Browser (form + invisible Cloudflare Turnstile)
   │  POST /api/inquiry  (JSON, same-origin)
   ▼
Cloudflare Worker  worker/index.ts  ── only /api/* runs the Worker; everything else is static assets
   ├─ guards: method, same Origin, JSON, ≤24 KB, honeypot, best-effort rate limit
   ├─ server-side validation (never trusts the browser)         worker/validate.ts
   ├─ Turnstile token verification (siteverify)                  worker/turnstile.ts
   ├─ email #1 → Lise  (Reply-To = visitor)                      worker/email.ts
   └─ email #2 → visitor: acknowledgement — "NOT confirmed yet"
```
- **Success state:** "Thank you — your request has been sent", states plainly that *the appointment is not confirmed*, shows the visitor's email, a reference (e.g. `FDL-Z62HPN`, also in both emails) and the fallback contact options. If only the visitor's acknowledgement failed, the page says so honestly (Lise still has the request).
- **Failure states** (inline, details kept, button re-enabled, notice focused for screen readers): send failed / network down; spam-check unavailable (blocker/offline); verification failed (retry); rate-limited; server-side field errors next to the field. Every failure offers **Email Lise instead** (mailto prefilled), **Copy my message**, and the phone number. The static "Trouble sending? Email … or call …" line is always under the button.
- Nothing is stored by the site. Logs contain reference ids and status codes only — never names, emails or message text (unit-tested).

## Files
`worker/` (index, inquiry, validate, turnstile, email, config, types) · `src/lib/inquiry-options.ts` (shared option lists/limits) · `src/lib/delivery.ts` + `src/scripts/forms.ts` (client) · `src/components/InquiryForm.astro` + `src/styles/forms.css` (UI) · `wrangler.jsonc` (Worker + vars) · `scripts/test-worker.mjs` (unit tests) · `scripts/qa/e2e-forms.cjs` (browser E2E) · `.dev.vars.example`.

## Configuration reference
| Name | Kind | Where it is set | Staging today | Needed for real delivery |
|---|---|---|---|---|
| `ENVIRONMENT` | var | `wrangler.jsonc` | `staging` | `production` (turns on safeguards: refuses mock mail and Turnstile test keys) |
| `EMAIL_PROVIDER` | var | `wrangler.jsonc` | `mock` (sends nothing) | `resend` (adapter built; others are a ~20-line addition in `worker/email.ts`) |
| `RESEND_API_KEY` | **secret** | `wrangler secret put` / dashboard | — | Resend API key (restricted "sending" key) |
| `MAIL_FROM` | var | `wrangler.jsonc` | — | Verified sender, e.g. `Fleur de Lise Healing <hello@verified-domain>` |
| `INQUIRY_TO` | var | `wrangler.jsonc` | `fleurdelisehealing@gmail.com` (**to be confirmed by Lise**; unused while mocking) | Lise's confirmed receiving address |
| `INQUIRY_REPLY_TO` | var (optional) | `wrangler.jsonc` | — | Reply-To for the acknowledgement (defaults to `INQUIRY_TO`) |
| `TURNSTILE_SECRET_KEY` | **secret** | staging: Cloudflare's public always-pass *test* secret in `wrangler.jsonc`; live: `wrangler secret put` | test secret | Real Turnstile secret key |
| `PUBLIC_TURNSTILE_SITEKEY` | build variable (public) | Workers Builds → Settings → Variables (build), or shell | defaults to Cloudflare's always-pass *test* key (`1x00000000000000000000AA`) | Real Turnstile **site key** — a production build **fails** without it |
| `ALLOWED_ORIGINS` | var (optional) | `wrangler.jsonc` | — | Only if the form must also work from another origin (same-origin always allowed) |

## Activating real email delivery — checklist
1. **Lise confirms** the receiving address (→ `INQUIRY_TO`) and any Reply-To for acknowledgements.
2. **Choose the provider.** Built and tested: **Resend** (check current free-tier limits and pricing). Create the account, add a sending domain, create an API key restricted to sending.
3. **Sender domain + DNS.** `MAIL_FROM` must be on a domain verified with the provider (SPF + DKIM records, plus a DMARC record recommended). Options: *(a)* `frameworktools.ca` (Framework's Cloudflare zone) — can be verified without touching the client's DNS, fine for staging/interim; *(b)* `fleurdelisehealing.com` — best for branding/deliverability, but its DNS currently sits with the Wix setup, so adding records is a **DNS change that needs your explicit approval and coordination** at go-live.
4. **Secrets** (never in git): `npx wrangler secret put RESEND_API_KEY` and `npx wrangler secret put TURNSTILE_SECRET_KEY` (or Dashboard → Worker `fleurdelise` → Settings → Variables and Secrets). Before adding the real Turnstile secret, **delete the `TURNSTILE_SECRET_KEY` test entry from `vars` in `wrangler.jsonc`** (a var and a secret can't share a name).
5. **Turnstile widget:** Dashboard → Turnstile → Add widget (Managed). Hostnames: `fleurdelise.frameworktools.ca` (and `fleurdelisehealing.com` at go-live). Copy the **site key** into the build variable `PUBLIC_TURNSTILE_SITEKEY` (Workers Builds → Settings → Build → Variables) and redeploy so it is baked into the pages; the **secret key** goes in step 4.
6. **Vars:** in `wrangler.jsonc` set `EMAIL_PROVIDER: "resend"`, `MAIL_FROM`, `INQUIRY_TO` (and optionally `INQUIRY_REPLY_TO`). Note: values in `wrangler.jsonc` overwrite dashboard values on every deploy, so change them in the file (committed), not only in the dashboard. For production use a separate Wrangler environment (`env.production`) with `ENVIRONMENT: "production"` so staging and production can't share settings.
7. **Test on staging with real mail:** submit a booking request and a contact message; confirm (a) Lise receives both, Reply-To = visitor; (b) the visitor address receives the acknowledgement with "not yet confirmed"; (c) neither lands in spam (check SPF/DKIM = pass in the headers); (d) the "Test mode" note no longer appears.
8. **Optional hardening:** a Cloudflare WAF rate-limiting rule on `POST /api/inquiry` (the in-Worker limiter is per-isolate, best-effort); Turnstile hostname check; a monitoring email if sending starts failing.
9. **Go-live** (separate approval): production Worker config + site key, privacy page naming the email provider, DNS records for the sending domain, then repeat step 7 on production.

## How to test
- Unit/integration (no network): `npm run test:worker` — 19 tests: validation, injection, guards, Turnstile, both emails' content, failure handling, config safeguards, log privacy.
- Browser E2E (local Worker + built site, stubbed Turnstile, mock email): `npm run build:staging && node scripts/qa/e2e-forms.cjs` — 37 checks: success/failure/retry states, fallbacks, spinner/double-submit, rate limit, keyboard + axe, phone/iPad widths.
- **QA triggers (mock provider outside production only):** a name of `[test-fail]` forces the "couldn't send" state; `[test-ack-fail]` forces "acknowledgement not sent". They do nothing with a live provider or in production.
- **Staging manual test (Cloudflare Access login required):** the forms work end to end using the always-pass test Turnstile key and the mock provider; a green "Test mode — no email was sent" note appears on success. The real Turnstile widget script can only load from a normal browser (it is blocked in this build sandbox), so please click through once on your iPad and desktop.

## Known limits
- No copy of a submission is stored: if the email provider is down the visitor sees the failure state and fallback (nothing is silently lost, but nothing is queued). A KV/D1 outbox is a possible later addition.
- In-Worker rate limiting is per isolate (best-effort); rely on Turnstile + an optional WAF rule.
- Email deliverability depends on the verified sending domain (step 3).

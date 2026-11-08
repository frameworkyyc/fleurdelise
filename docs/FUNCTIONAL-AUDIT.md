# Functional audit — booking, contact, UX, accessibility (Phase 1: audit only)

Scope: how visitors book and contact, whether it works, what is missing. **No booking/contact changes were made.** The only change shipped with this audit is the SIT wording correction (§7).
Method: code review (`src/components/InquiryForm.astro`, `src/scripts/forms.ts`, `src/lib/delivery.ts`, `src/data/booking.ts`, pages) plus scripted browser tests in Chromium (desktop 1280, iPad-width, iPhone-width 390): link/CTA crawl of all 12 pages, form validation/submission/encoding, query-string presets, keyboard navigation, tap-target and font-size checks, axe-core in error and result states, screenshots.
**Not testable here (manual, on real devices):** what happens when the visitor's phone/iPad opens a `mailto:` link (Mail configured / not configured / Gmail or Outlook app default / Private Browsing), real screen-reader behaviour, and real-world deliverability.

## 1. How it works today
- **There is no booking system.** `booking.provider = 'inquiry'` (`src/data/booking.ts`): "Book" buttons lead to `/book`, an **appointment-inquiry form** (service → in person/virtual → preferred times → name/email/phone → message → consent). Copy is honest: "Nothing is booked until Lise replies."
- **Nothing is submitted to a server.** On submit, `forms.ts` builds a `mailto:` URL and sets `location.href` so the *visitor's own email app* opens with the message pre-filled to fleurdelisehealing@gmail.com. The visitor must then press Send themselves. The page also shows a "ready to send" screen with Copy / Open-email-again / Edit.
- No confirmation email, no calendar, no reminders, no cancel/reschedule — all of it would be manual replies from Lise.
- Contact form (`/contact`) works the same way; the topic "SIT — let me know when sessions open" is the only SIT waitlist (manual, by email).

## 2. What works (verified)
| Area | Result |
|---|---|
| Links | All internal links on all 12 pages return 200; no broken anchors; `tel:+12263467206` and `mailto:` links well-formed. |
| CTAs | Header "Book", hero, every page's closing CTA and the mobile sticky bar all lead to `/book`; service pages deep-link `/book?service=reiki|eft|tarot` and the form **preselects correctly**; `/contact?interest=sit` preselects the SIT topic + message. Unknown values (`?service=sit`, junk) are ignored safely. |
| Validation | Empty submit shows 4 clear inline errors (service, name, email, consent / message on contact), focus moves to the first problem, `aria-invalid` + `role="alert"` used; invalid email message is friendly; errors clear as the visitor types. |
| Encoding | `&`, `#`, `?`, `%`, quotes, em dash, `<b>`, accents and line breaks round-trip correctly into subject/body. Subject is useful: "Appointment inquiry — Reiki (virtual)". |
| Recovery | "Edit my message" restores the form with values intact; "Copy message" fallback exists for visitors with no email app. |
| Mobile | No horizontal overflow; all text inputs ≥ 16 px (no iOS zoom-on-focus); form controls ≥ 44 px; sticky "Book a first conversation" bar appears after the hero and is keyboard reachable; mobile menu opens/closes with keyboard and Escape, focus returns to the button. |
| Keyboard | Logical tab order through header → form → submit; radio groups arrow-key correctly; text inputs show a clear focus state (plum border + gold glow). |
| Privacy | The privacy page accurately describes the current mailto behaviour; nothing is stored by the site; no trackers. |
| Accessibility | axe-core: 0 violations on all 11 pages (desktop + mobile) and on both forms' **error** state. |

## 3. What is broken or risky (findings, prioritised)
Severity: **High** = visitors/Lise can silently lose enquiries; **Med** = real friction or accessibility gap; **Low** = polish.

| # | Sev | Finding | Why it matters |
|---|---|---|---|
| F1 | **High** | **Inquiries are not delivered by the site.** Nothing reaches Lise unless the visitor's device has a configured mail app *and* they press Send. Desktop browsers with no mail handler do nothing (only the copy-box fallback); iPad/iPhone without Mail prompt or open an empty app; Gmail-in-browser users get nothing; closing the draft loses the message. | There is **no way to know** how many inquiries are lost. Biggest conversion risk on the site. |
| F2 | **High** | **No real booking, confirmation, reminder, cancellation or rescheduling.** Everything depends on manual email back-and-forth; visitors see no availability. | Friction for clients, admin burden for Lise, no calendar protection against double-booking. |
| F3 | Med | **Long messages break `mailto:`.** No `maxlength`; a 3,000-character message makes a 3,316-char URL (some clients/Outlook truncate around 2,000). | Silent truncation of the visitor's message. |
| F4 | Med | **The result screen ("Your message is ready to send") can be mistaken for "sent".** The copy is accurate but the flow ends in an unconfirmed state. | Visitors may assume Lise has the message. |
| F5 | Med | **CTA/expectation mismatch:** buttons say "Book a first conversation" but lead to "Request an appointment" with a service picker; whether a first conversation is free/different is unknown (tracker: awaiting Lise). | Mild confusion about what is being requested. |
| F6 | Med | **In person / virtual is asked for every service**, but which services offer which is not confirmed (copy says "depending on the service"). Visitors can request an option that isn't offered. | Needless back-and-forth. |
| F7 | Med | **Choice (radio) controls have a weak keyboard focus indicator**: the gold glow (≈ 58 % opacity) on linen is well under 3:1 contrast (WCAG 2.2 non-text contrast / focus). Text inputs are fine (border turns plum). | Keyboard/low-vision users can lose their place on the main booking control. |
| F8 | Med | **Result "copy box" `<pre>` is a scrollable region that cannot receive keyboard focus** (axe `scrollable-region-focusable`, result state, both forms). | Keyboard users can't scroll long messages. |
| F9 | Low | **Skip link lands on `<main id="main">` which isn't focusable** (`tabindex="-1"` missing); focus stays on `<body>` in some browsers. | Skip link works visually, not for focus/screen readers everywhere. |
| F10 | Low | **Breadcrumb links are 18 px tall** (added in SEO phase 3a) — below comfortable touch size on phones. | Easy to mis-tap. (Mine to fix.) |
| F11 | Low | **Honeypot field silently swallows a submission** (no feedback) if a browser autofills the hidden "website" field. With mailto there is no server to protect, so it only adds risk. | A legitimate visitor could press Send and see nothing happen. |
| F12 | Low | **No response-time promise** ("Lise will reply when she can"), no hours, no analytics on form submits / phone / email clicks. | Can't set expectations or measure results. |
| F13 | Low | Email address is plain text in the HTML (harvestable), and a Gmail address is shown. | Spam exposure; looks less established than a domain address. |

## 4. Security, privacy and spam
- **Security:** no server code today, so no injection/XSS/CSRF surface; inputs are never rendered as HTML (copy box uses `textContent`); `rel="noopener noreferrer"` on the external link; headers added in SEO phase 3a (nosniff, referrer policy).
- **Spam:** with mailto there is no site-side spam channel (spam can't be submitted *through* the site). The moment a server endpoint is added, it will need protection: **Cloudflare Turnstile** (free, privacy-friendly), server-side validation, rate limiting, honeypot, and a length cap.
- **Privacy:** nothing stored today, which is a strength. A server endpoint changes that: processor disclosure, retention (don't store health details; the form already asks visitors not to include them), and a privacy-page update are needed.
- **Accessibility:** see F7–F10; otherwise strong.

## 5. Recommended simplest reliable solutions
**Contact + inquiry delivery (fixes F1, F3, F4, F11, F12):** keep the current form and design, replace the mailto step with a **server-side submit** to a small endpoint on the existing Cloudflare Worker:
1. Validates + length-caps; **Turnstile** verification; honeypot/rate limit.
2. Sends the email to Lise via a transactional email service (or Cloudflare Email Routing `send_email` once Email Routing is enabled on a zone and Lise's Gmail is verified as the destination) with `reply-to` = visitor.
3. Shows an honest on-page confirmation ("Thanks — Lise has your message") and sends the visitor an **automatic acknowledgement email**; keeps `mailto:`/phone as the visible fallback if the send fails.
4. No inquiry text stored by us (email only). Privacy page updated.
Needs approval (new code, an email provider account, possible small cost, Turnstile keys).

**Booking (fixes F2, F5, F6):** recommend a **hosted scheduler linked from `/book`** (a button/redirect — fastest and most private; the `booking.ts` seam already supports `redirect` and `embed`), with the server-side inquiry form kept as the "I have a question first" path. A scheduler provides availability, confirmation emails, reminders and cancel/reschedule links, and syncs with Lise's calendar. Candidates to compare once Lise decides what she needs (check current pricing/limits before choosing): **Cal.com**, **Square Appointments** (note: a Square connection is present in this workspace, so Lise may already use Square — worth asking; payments/deposits come built-in), **Calendly**, **Acuity**, **Jane App**. Choose on: multiple service types, in-person vs virtual locations/video links, deposits/payments, intake questions (no health details), calendar sync, cost.
Alternative if Lise prefers to stay hands-on: keep **request-and-confirm** (the current model) but with F1 fixed — simplest, no new accounts beyond email.

## 6. Decisions and information needed from Lise
1. **Booking model:** instant online booking with a scheduler, or request-and-confirm by email/phone? Which tools does she already use (Google Calendar, Square, anything else)?
2. **Services setup:** length, price and format of Reiki / EFT / tarot sessions; which are in person, virtual, or both; where in-person sessions happen (and whether the address may be public); which video platform for virtual.
3. **Availability rules:** working days/hours, advance notice, buffer time between sessions, same-day policy.
4. **Policies:** cancellation/rescheduling window, no-show policy, deposits/payments (and accepted methods), whether a "first conversation" is free or a distinct short session (drives the CTA wording).
5. **Response promise:** how quickly does she reply (e.g. within 1–2 business days)? Preferred contact channel (email vs phone/text)?
6. **Notifications:** which email should receive inquiries (Gmail today); does she want a domain address later; OK to send visitors an automatic acknowledgement?
7. **SIT interest list:** keep manual (email), or a simple list/tool for people who ask to be notified?
8. **Privacy sign-off:** review/approve updated privacy wording once a delivery service is chosen.
9. **Content already requested** (still pending, see `docs/CONTENT-TRACKER.md`): photo/bio, social links, testimonials with consent.

## 7. SIT wording correction (done, staging only)
- Credential now reads **"Certification expected April 2027"** (About, SIT page). "Certified SIT Practitioner" no longer appears anywhere; the row is titled "Subconscious Imprinting Technique (SIT)" with the label "Upcoming".
- About intro: "Reiki, EFT and tarot readings are the services I offer today. SIT is not yet offered — certification expected April 2027."
- SIT page: "Certification expected April 2027, ahead of the May 1, 2027 launch." Home/Services SIT sections already say "Coming May 1, 2027"/"Ask to be notified"; the booking form has no SIT option; structured data still treats SIT as a coming-soon WebPage and lists no SIT credential.
- `scripts/check-seo.mjs` now **fails the build** on wording like "certified SIT"/"SIT practitioner", on any SIT-certification mention not marked "expected", and on wording implying SIT sessions are currently offered (negative-tested).

## 8. Action plan
**A. Fixable now without Lise's input (low risk; will bundle into Phase 2 on your go-ahead):** F7 stronger radio focus ring; F8 make the copy box focusable; F9 `tabindex="-1"` on `<main>`; F10 breadcrumb tap targets; F11 remove/replace honeypot behaviour; F3 length cap with graceful fallback.
**B. Needs your approval (not started):** server-side inquiry endpoint + Turnstile + email provider + visitor acknowledgement (F1/F3/F4/F12); privacy-page update; analytics for form submits/phone/email clicks.
**C. Needs Lise's decisions (§6):** booking provider and rules, session facts, CTA wording (F5/F6), response promise.
**D. Manual device tests to run once changes land:** iPad Safari (regular + Private) and iPhone: submit → confirmation → email arrives; Mail-not-configured behaviour today; VoiceOver pass through `/book` and `/contact`; desktop Chrome/Safari/Firefox submit.

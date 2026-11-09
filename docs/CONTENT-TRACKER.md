# Content tracker — internal only

Nothing here is rendered to visitors. Sections are built so each item below can be added later by editing
`src/data/site.ts` or the relevant component; no layout work should be needed.

## Needed from Lise
| Item | Where it lands | Status |
|---|---|---|
| Professional bio, photo | `site.lise.photo` / About page. The Home "Meet Lise" arch shows the photo automatically once set; until then it shows a botanical illustration. | Awaiting (certifications received — see docs/CREDENTIALS.md) |
| Reiki / EFT / Tarot descriptions, "what to expect", session format | `/services/*` pages (next phase) | Awaiting |
| Duration + pricing per service | Service pages + booking | Awaiting |
| Which services are in-person, virtual or both | Service cards + booking form | Awaiting (Home only says "depending on the service") |
| Instagram / Facebook URLs | `site.social` — footer + Contact render links automatically | Awaiting |
| Booking provider + requirements (payments, deposits, intake) | Booking integration seam (next phase) | Awaiting |
| Whether a "free first conversation" is a real offer | CTA copy currently says "first conversation" only | Awaiting |
| SIT: logo permission, service description, interest-list tool | `/services/sit` (no SIT logo used) | Awaiting |

## Copy awaiting Lise's approval (drafted from Brand Kit v5 language — not invented facts)
- Home "Meet Lise" paragraphs (first person; based on the kit's positioning statement).
- Service one-liners on Home cards (Reiki line is the kit's approved sentence; EFT/Tarot lines are neutral drafts).
- Values one-liners (Safe / Nurturing / Authentic).
- SIT announcement paragraph.

## Added with the inner pages (all drafted from Brand Kit v5 language; awaiting Lise's approval)
- About page: "How I hold space" principles and "A welcoming space" copy. Bio / credentials render automatically from `site.lise.bio` / `site.lise.credentials`.
- Service pages (`src/data/service-content.ts`): overviews, "what to expect" (shared by all three), EFT "Notice / Tap / Pause" steps, tarot "78 cards" line. Duration, price, format, availability render from `details` when supplied.
- SIT page: launch date + "I'll share more closer to launch" only. No SIT logo, no description of the technique.
- Privacy page: plain-language notice written for the current mailto-based forms — **needs Lise's review (and ideally legal review) before launch**, and an update when a delivery service or booking provider is added.
- Disclaimer page includes the 9-8-8 / 911 crisis line wording — confirm Lise is happy with it.

## Received — to confirm with Lise
- Training & certifications (docs/CREDENTIALS.md): confirm EFT may be called "certified"; confirm which additional courses (if any) she wants to offer as services later; dates/providers for the additional courses only if she wants them shown.

## Decisions pending
- Inquiry delivery: **built** (Worker + Turnstile + email adapter, mock mode on staging). To go live: Lise confirms the receiving address; choose/activate the email provider and sending domain; set secrets + Turnstile keys — see docs/FORMS-DELIVERY.md. Privacy page should name the provider once chosen.
- Booking provider (see `src/data/booking.ts` — one-line switch to embed/redirect).

## Assets
- `brand-originals/E_submark-transparent_DAMAGED-do-not-use.png` — alpha matte is corrupted (red/yellow artefacts). Replace with a clean export. Until then the textured plum sub-mark (D) is used in the header, footer and favicon.

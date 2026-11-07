# Content tracker — internal only

Nothing here is rendered to visitors. Sections are built so each item below can be added later by editing
`src/data/site.ts` or the relevant component; no layout work should be needed.

## Needed from Lise
| Item | Where it lands | Status |
|---|---|---|
| Professional bio, photo, certifications | `site.lise.photo` / About page. The Home "Meet Lise" arch shows the photo automatically once set; until then it shows a botanical illustration. | Awaiting |
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

## Assets
- `brand-originals/E_submark-transparent_DAMAGED-do-not-use.png` — alpha matte is corrupted (red/yellow artefacts). Replace with a clean export. Until then the textured plum sub-mark (D) is used in the header, footer and favicon.

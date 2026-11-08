# Lise's training & certifications — source of truth and wording rules

Supplied by Lise (Nov 2026). Data lives in `src/data/site.ts` (`training`, `completedCredentials`); pages and structured data read from it.

| Item | Date | Status | Where it appears |
|---|---|---|---|
| Practicing tarot | Since 2003 | Experience (not a certificate) | About, Tarot page, tarot meta description |
| Certified Master Usui Reiki Practitioner | December 10, 2023 | Completed | About, Reiki page, Reiki meta description, Person JSON-LD |
| Emotional Freedom Technique | December 27, 2025 | Completed (source did not say "certified") | About, EFT page, Person JSON-LD |
| Certified SIT Practitioner | Expected April 2027 | **Upcoming — not yet completed** | About, SIT page only; never in structured data |
| 10 additional courses/certifications | no dates supplied | Completed | About ("Additional training & certifications"); the 4 tarot courses also on the Tarot page |

## Rules
- Titles are exactly as supplied (no corrections were needed; "Tarot Reading Masterclass Certified Beginner to Pro" is kept as given). No providers, accreditation, hours or dates are stated beyond what Lise supplied — **do not add any without her confirmation.**
- EFT is described as "training" / "Emotional Freedom Technique", not "certified", because the source didn't use that word. Confirm if "certified" is correct.
- SIT stays flagged "Upcoming — not yet completed" until April 2027 certification is done; then set `upcoming` false, update the date, and follow `docs/SIT-LAUNCH-CHECKLIST.md`.
- Sound bath / singing bowl / crystal / pendulum / intuition training is listed on **About only**, with the line "Reiki, EFT and tarot readings are the services I offer today". These are not offered services unless Lise confirms; `scripts/check-seo.mjs` fails if they appear on any other page.
- Person JSON-LD lists completed qualifications only (not SIT, not the additional course list) plus `knowsAbout`: Reiki, Emotional Freedom Technique, Tarot.

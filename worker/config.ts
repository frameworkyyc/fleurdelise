/** Public business facts used in emails (same values as src/data/site.ts — kept in sync by scripts/test-worker.mjs). */
export const BUSINESS = {
  name: 'Fleur de Lise Healing',
  owner: 'Lise Pinard-Wolf',
  phone: '(226) 346-7206',
  location: 'Windsor, Ontario',
  disclaimer: 'Complementary wellness services, not a substitute for medical or mental-health care.',
} as const;

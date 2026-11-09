/**
 * Single source of truth for client facts.
 * Optional fields (social, photo, prices…) render nothing until they are filled in —
 * visitors never see placeholders. Outstanding items are tracked in docs/CONTENT-TRACKER.md.
 */
export const site = {
  name: 'Fleur de Lise Healing',
  owner: 'Lise Pinard-Wolf',
  url: (import.meta.env.PUBLIC_SITE_URL as string | undefined) || 'https://fleurdelisehealing.ca',
  tagline: ['Come as you are.', 'Bloom at your own pace.'],
  email: 'fleurdelisehealing@gmail.com',
  phone: '(226) 346-7206',
  phoneHref: 'tel:+12263467206',
  location: 'Windsor, Ontario',
  disclaimer: 'Complementary wellness services, not a substitute for medical or mental-health care.',
  isProduction: import.meta.env.PUBLIC_SITE_ENV === 'production',

  /** Fill in when supplied — footer/contact render links only when present. */
  social: {
    instagram: undefined as string | undefined,
    facebook: undefined as string | undefined,
  },

  /** Add a photo (import from src/assets) and the About/intro portrait appears automatically. */
  lise: {
    photo: undefined as ImageMetadata | undefined,
    photoAlt: undefined as string | undefined,
    /** Paragraphs of Lise's own bio — About page shows them when supplied. */
    bio: undefined as string[] | undefined,
  },

  nav: [
    { label: 'About', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Contact', href: '/contact' },
  ],
  book: { label: 'Book', href: '/book', cta: 'Book a first conversation' },
} as const;

/**
 * Lise's training — supplied by Lise (Nov 2026). Titles are kept exactly as supplied. NOTHING here is inferred:
 * no providers, accreditation, dates or hours are stated beyond what she gave us. The SIT certification is upcoming
 * (expected April 2027) and must stay flagged `upcoming` until she has completed it.
 * The "additional" courses are listed for completeness; they do NOT mean those practices are offered as services.
 */
export interface TrainingItem { title: string; when: string; whenISO?: string; upcoming?: boolean; note?: string }
export const training: { primary: TrainingItem[]; additional: string[]; tarotCourses: string[] } = {
  primary: [
    { title: 'Practicing tarot', when: 'Since 2003' },
    { title: 'Certified Master Usui Reiki Practitioner', when: 'December 10, 2023', whenISO: '2023-12-10' },
    { title: 'Emotional Freedom Technique', when: 'December 27, 2025', whenISO: '2025-12-27' },
    { title: 'Subconscious Imprinting Technique (SIT)', when: 'Upcoming', upcoming: true, note: 'Certification expected April 2027' },
  ],
  additional: [
    'Awakening & Understanding Your Intuition',
    'Crystal Singing Bowls Sound Therapy & Sound Healing Training',
    'Tibetan Singing Bowls Sound Therapy & Sound Healing Training',
    'Tarot Reading Masterclass Certified Beginner to Pro',
    'Tibetan Singing Bowls Group Sound Bath Training',
    'Advanced Tarot Spreads Certified: 12 Powerful Layouts',
    'Tarot Card Success: The Complete Tarot Reading Course',
    'Pendulum Dowsing for Healers & Energy Practitioners',
    'Major Arcana Mastery Certified: Card Combinations',
    'Crystal Practitioner Certification: Beginner Level',
  ],
  /** The subset of `additional` that is tarot study (shown on the tarot page). */
  tarotCourses: [
    'Tarot Reading Masterclass Certified Beginner to Pro',
    'Advanced Tarot Spreads Certified: 12 Powerful Layouts',
    'Tarot Card Success: The Complete Tarot Reading Course',
    'Major Arcana Mastery Certified: Card Combinations',
  ],
};
/** Completed qualifications only (no upcoming SIT, no tarot-experience line) — used for structured data. */
export const completedCredentials = training.primary.filter((t) => !t.upcoming && !/^Practicing/.test(t.title)).map((t) => t.title);

export type IconName = 'reiki' | 'eft' | 'tarot' | 'sit' | 'inperson' | 'virtual' | 'mail' | 'phone' | 'pin' | 'heart' | 'calendar';

export const services: {
  slug: string; name: string; icon: IconName; blurb: string; href: string;
}[] = [
  {
    slug: 'reiki', name: 'Reiki', icon: 'reiki', href: '/services/reiki',
    blurb: 'A gentle practice many people find calming — offered alongside care from your doctor.',
  },
  {
    slug: 'eft', name: 'Emotional Freedom Technique', icon: 'eft', href: '/services/eft',
    blurb: 'Gentle tapping, explained in plain words, with space to go at your own pace.',
  },
  {
    slug: 'tarot', name: 'Tarot Readings', icon: 'tarot', href: '/services/tarot',
    blurb: 'Card readings for reflection and perspective, in a calm and unhurried setting.',
  },
];

export const sit = {
  name: 'Subconscious Imprinting Technique',
  short: 'SIT',
  launch: 'May 1, 2027',
  launchISO: '2027-05-01',
  href: '/services/sit',
};

/**
 * Single source of truth for client facts.
 * Optional fields (social, photo, prices…) render nothing until they are filled in —
 * visitors never see placeholders. Outstanding items are tracked in docs/CONTENT-TRACKER.md.
 */
export const site = {
  name: 'Fleur de Lise Healing',
  owner: 'Lise Pinard-Wolf',
  url: (import.meta.env.PUBLIC_SITE_URL as string | undefined) || 'https://fleurdelisehealing.com',
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
  },

  nav: [
    { label: 'About', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Contact', href: '/contact' },
  ],
  book: { label: 'Book', href: '/book', cta: 'Book a first conversation' },
} as const;

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

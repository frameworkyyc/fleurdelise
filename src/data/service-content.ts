/**
 * Per-service page content. Optional fields (modes, duration, price, format) render NOTHING until supplied —
 * visitors never see placeholders. Copy here is drafted from Brand Kit v5 language and awaits Lise's approval
 * (tracked in docs/CONTENT-TRACKER.md). No outcome claims.
 */
import { training, type IconName } from './site';

export interface ServiceContent {
  slug: 'reiki' | 'eft' | 'tarot' | 'sit';
  name: string;
  icon: IconName;
  eyebrow: string;
  title: string;
  lead: string;
  metaTitle: string;
  metaDescription: string;
  overviewTitle: string;
  overview: string[];
  expect?: { title: string; text: string }[];
  how?: { title: string; intro?: string; steps: { title: string; text: string }[] };
  /** Supply when confirmed — rendered in "Session details". */
  details?: { format?: string; duration?: string; price?: string; availability?: string };
  /** Lise's relevant training for this service — from `training` in site.ts (supplied by Lise; nothing inferred). */
  credentials?: { items: { label: string; detail: string; upcoming?: boolean; note?: string }[]; courses?: { heading: string; items: string[] } };
  upcoming?: boolean;
}

const commonExpect = [
  { title: 'A conversation first', text: 'Every session begins with a conversation. You decide what you’d like to share.' },
  { title: 'Your pace, your choice', text: 'Ask questions, pause, or change anything at any time. Nothing is rushed.' },
  { title: 'Come as you are', text: 'There’s nothing to prepare and nothing to get right.' },
];

export const serviceContent: Record<ServiceContent['slug'], ServiceContent> = {
  reiki: {
    slug: 'reiki', name: 'Reiki', icon: 'reiki',
    eyebrow: 'Reiki', title: 'Reiki, gently',
    lead: 'A gentle practice many people find calming — offered alongside care from your doctor.',
    metaTitle: 'Reiki in Windsor, Ontario | Fleur de Lise Healing',
    metaDescription: 'Reiki in Windsor, Ontario with Lise Pinard-Wolf, a Certified Master Usui Reiki Practitioner — gentle complementary support, never instead of medical care.',
    overviewTitle: 'What is Reiki?',
    overview: [
      'Reiki is a quiet, unhurried practice centred on rest and relaxation. Sessions are gentle, and you stay in charge of the pace.',
      'Sessions are with Lise Pinard-Wolf, a Certified Master Usui Reiki Practitioner in Windsor, Ontario.',
      'It is offered as complementary support — never as a replacement for medical or mental-health care.',
    ],
    expect: commonExpect,
    credentials: { items: [{ label: 'Certified Master Usui Reiki Practitioner', detail: 'December 10, 2023' }] },
  },
  eft: {
    slug: 'eft', name: 'Emotional Freedom Technique', icon: 'eft',
    eyebrow: 'EFT · Tapping', title: 'Emotional Freedom Technique',
    lead: 'Gentle tapping, explained in plain words, with space to go at your own pace.',
    metaTitle: 'EFT Tapping in Windsor, Ontario | Fleur de Lise Healing',
    metaDescription: 'Emotional Freedom Technique (EFT) tapping with Lise Pinard-Wolf in Windsor, Ontario — gentle, plain-spoken complementary support, in person or virtually.',
    overviewTitle: 'What is EFT?',
    overview: [
      'Emotional Freedom Technique (EFT) — often called tapping — is a gentle self-care practice. It pairs light fingertip tapping on a series of points on the face and upper body with bringing a thought or feeling to mind.',
      'Lise completed Emotional Freedom Technique training in December 2025.',
      'It is offered as complementary support alongside, not instead of, medical or mental-health care.',
    ],
    how: {
      title: 'How tapping works',
      intro: 'Each step is explained in plain words, so you always know what’s happening.',
      steps: [
        { title: 'Notice', text: 'Choose what you’d like to focus on. You decide how much to share.' },
        { title: 'Tap', text: 'Gently tap with your fingertips on each point in turn.' },
        { title: 'Pause', text: 'Take a breath and notice how you feel, at your own pace.' },
      ],
    },
    expect: commonExpect,
    credentials: { items: [{ label: 'Emotional Freedom Technique', detail: 'December 27, 2025' }] },
  },
  tarot: {
    slug: 'tarot', name: 'Tarot Readings', icon: 'tarot',
    eyebrow: 'Tarot', title: 'Tarot readings',
    lead: 'Card readings for reflection and perspective, in a calm and unhurried setting.',
    metaTitle: 'Tarot Readings in Windsor, Ontario | Fleur de Lise Healing',
    metaDescription: 'Reflective tarot readings in Windsor, Ontario with Lise Pinard-Wolf, who has practiced tarot since 2003 — a calm space for perspective, in person or virtually.',
    overviewTitle: 'What is a tarot reading?',
    overview: [
      'Tarot is a deck of 78 illustrated cards. In a reading, the cards become a starting point for reflection, perspective and conversation.',
      'Lise has been practicing tarot since 2003, and has continued to study the cards through further tarot courses.',
      'Readings are for reflection — not predictions or guarantees, and not a substitute for professional advice.',
    ],
    expect: commonExpect,
    credentials: { items: [{ label: 'Practicing tarot', detail: 'Since 2003' }], courses: { heading: 'Tarot courses completed', items: training.tarotCourses } },
  },
  sit: {
    slug: 'sit', name: 'Subconscious Imprinting Technique', icon: 'sit', upcoming: true,
    eyebrow: 'Coming May 1, 2027', title: 'Subconscious Imprinting Technique (SIT)',
    lead: 'SIT joins the services at Fleur de Lise Healing on May 1, 2027.',
    metaTitle: 'Subconscious Imprinting Technique — Coming May 2027',
    metaDescription: 'Subconscious Imprinting Technique (SIT) launches at Fleur de Lise Healing in Windsor, Ontario on May 1, 2027. Ask to be notified when sessions open.',
    overviewTitle: 'What to know',
    overview: [
      'I’ll share more about SIT here as the launch gets closer.',
      'Certification as an SIT practitioner is expected in April 2027, ahead of the May 1, 2027 launch.',
      'If you’d like to be among the first to hear when sessions open, send a note and I’ll be in touch.',
    ],
    credentials: { items: [{ label: 'Certified SIT Practitioner', detail: 'Expected April 2027', upcoming: true, note: 'Upcoming — not yet completed' }] },
  },
};

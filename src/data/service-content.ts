/**
 * Per-service page content. Optional fields (modes, duration, price, format) render NOTHING until supplied —
 * visitors never see placeholders. Copy here is drafted from Brand Kit v5 language and awaits Lise's approval
 * (tracked in docs/CONTENT-TRACKER.md). No outcome claims.
 */
import type { IconName } from './site';

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
    metaDescription: 'Gentle, unhurried Reiki sessions with Lise Pinard-Wolf in Windsor, Ontario — complementary support offered alongside, never instead of, medical care.',
    overviewTitle: 'What is Reiki?',
    overview: [
      'Reiki is a quiet, unhurried practice centred on rest and relaxation. Sessions are gentle, and you stay in charge of the pace.',
      'It is offered as complementary support — never as a replacement for medical or mental-health care.',
    ],
    expect: commonExpect,
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
  },
  tarot: {
    slug: 'tarot', name: 'Tarot Readings', icon: 'tarot',
    eyebrow: 'Tarot', title: 'Tarot readings',
    lead: 'Card readings for reflection and perspective, in a calm and unhurried setting.',
    metaTitle: 'Tarot Readings in Windsor, Ontario | Fleur de Lise Healing',
    metaDescription: 'Calm, reflective tarot readings with Lise Pinard-Wolf in Windsor, Ontario — a space for perspective and conversation, in person or virtually.',
    overviewTitle: 'What is a tarot reading?',
    overview: [
      'Tarot is a deck of 78 illustrated cards. In a reading, the cards become a starting point for reflection, perspective and conversation.',
      'Readings are for reflection — not predictions or guarantees, and not a substitute for professional advice.',
    ],
    expect: commonExpect,
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
      'If you’d like to be among the first to hear when sessions open, send a note and I’ll be in touch.',
    ],
  },
};

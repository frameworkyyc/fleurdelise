/** Shared by the form (client) and the Worker (server): the only values an inquiry may contain. */
export const SERVICES = { reiki: 'Reiki', eft: 'Emotional Freedom Technique (EFT)', tarot: 'Tarot reading', unsure: 'Not sure yet' } as const;
export const FORMATS = { 'in-person': 'In person', virtual: 'Virtual', either: 'No preference' } as const;
export const TOPICS = { general: 'A general question', appointment: 'An appointment inquiry', sit: 'SIT — let me know when sessions open' } as const;
export const LIMITS = { name: 100, email: 254, phone: 40, times: 500, message: 3000 } as const;
export type InquiryKind = 'book' | 'contact';

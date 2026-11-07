/**
 * Booking provider seam. The provider has NOT been chosen yet, so the site runs an honest
 * appointment-INQUIRY flow. When Lise confirms her requirements, change this one object —
 * no page rebuild needed:
 *   { provider: 'embed',    url: 'https://…' }   // provider's embeddable scheduler (iframe)
 *   { provider: 'redirect', url: 'https://…', label: 'Choose a time' }   // hosted booking page
 * Service durations/prices live in service-content.ts (`details`) and appear once supplied.
 */
export type BookingConfig =
  | { provider: 'inquiry' }
  | { provider: 'embed'; url: string; title: string }
  | { provider: 'redirect'; url: string; label: string };

export const booking: BookingConfig = { provider: 'inquiry' };

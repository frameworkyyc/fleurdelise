/**
 * Inquiry delivery seam.
 *
 * TODAY: "mailto" — the visitor's own email app opens with the message pre-filled to the business address.
 *        Free, reliable, no data stored anywhere, no third-party service.
 * LATER: swap `deliver()` for a POST to a Worker endpoint (e.g. a Cloudflare Email Routing `send_email`
 *        binding or a transactional provider) once the delivery service is approved — forms need no changes.
 */
export interface Inquiry {
  subject: string;
  lines: [label: string, value: string][];
}

export function compose(inq: Inquiry): string {
  return inq.lines
    .filter(([, v]) => v.trim())
    .map(([k, v]) => (v.includes('\n') ? `${k}:\n${v}` : `${k}: ${v}`))
    .join('\n\n');
}

export async function deliver(to: string, inq: Inquiry): Promise<{ mode: 'mailto'; body: string; href: string }> {
  const body = compose(inq);
  const href = `mailto:${to}?subject=${encodeURIComponent(inq.subject)}&body=${encodeURIComponent(body)}`;
  return { mode: 'mailto', body, href };
}

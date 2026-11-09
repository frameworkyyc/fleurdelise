/**
 * Fleur de Lise Healing — Worker entry.
 * Static site assets are served by the platform; ONLY /api/* runs this code first (wrangler.jsonc: run_worker_first).
 * /api/inquiry receives the booking-request and contact forms (docs/FORMS-DELIVERY.md).
 */
import { handleInquiry } from './inquiry.ts';
import type { Env } from './types.ts';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/inquiry') return handleInquiry(request, env);
    if (pathname.startsWith('/api/')) return new Response(JSON.stringify({ ok: false, code: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    return env.ASSETS.fetch(request);
  },
};

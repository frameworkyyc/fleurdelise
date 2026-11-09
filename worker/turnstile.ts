import type { Env } from './types.ts';

const OFFICIAL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Cloudflare's published always-pass/always-fail TEST secrets — fine for staging, refused in production. */
export const TEST_SECRETS = ['1x0000000000000000000000000000000AA', '2x0000000000000000000000000000000AA', '3x0000000000000000000000000000000AA'];

export async function verifyTurnstile(env: Env, token: string, ip: string | null, fetcher: typeof fetch = fetch): Promise<{ ok: boolean; reason?: string }> {
  if (!token || token.length > 2048) return { ok: false, reason: 'missing-token' };
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY ?? '', response: token });
  if (ip) body.set('remoteip', ip);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const res = await fetcher(env.TURNSTILE_VERIFY_URL || OFFICIAL, { method: 'POST', body, signal: ctl.signal });
    if (!res.ok) return { ok: false, reason: `verify-http-${res.status}` };
    const out = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    return out.success === true ? { ok: true } : { ok: false, reason: (out['error-codes'] ?? ['failed']).join(',') };
  } catch {
    return { ok: false, reason: 'verify-unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

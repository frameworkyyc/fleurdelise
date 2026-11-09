/** Minimal Worker types (no @cloudflare/workers-types dependency). */
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** 'staging' | 'production'. Production refuses mock email and Turnstile test keys. */
  ENVIRONMENT?: string;
  /** 'mock' (default, sends nothing) | 'resend'. See docs/FORMS-DELIVERY.md for adding others. */
  EMAIL_PROVIDER?: string;
  /** SECRET — email provider API key (Resend). Never commit. */
  RESEND_API_KEY?: string;
  /** Verified sender, e.g. "Fleur de Lise Healing <hello@your-verified-domain>". */
  MAIL_FROM?: string;
  /** Where appointment requests / messages are delivered (Lise's designated address). */
  INQUIRY_TO?: string;
  /** Reply-To on the visitor acknowledgement (defaults to INQUIRY_TO). */
  INQUIRY_REPLY_TO?: string;
  /** SECRET — Cloudflare Turnstile secret key. */
  TURNSTILE_SECRET_KEY?: string;
  /** Override for tests only. */
  TURNSTILE_VERIFY_URL?: string;
  /** Comma-separated extra allowed Origins (same-origin is always allowed). */
  ALLOWED_ORIGINS?: string;
}

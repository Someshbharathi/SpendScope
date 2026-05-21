/** Default sender for Resend (verified domain). Override with RESEND_FROM_EMAIL on the server. */
export const DEFAULT_RESEND_FROM = "SpendScope <noreply@spendscope.site>";

/**
 * Resend `from` address — server-only (RESEND_FROM_EMAIL / RESEND_API_KEY).
 * Never import from client components.
 */
export function getResendFrom(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_RESEND_FROM;
}

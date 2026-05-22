/**
 * Resend sender configuration (server-only).
 *
 * While Resend is in test mode or spendscope.site DNS is not fully verified,
 * keep USE_RESEND_TEST_SENDER true so all transactional mail uses onboarding@resend.dev.
 * After domain verification, set USE_RESEND_TEST_SENDER to false and configure
 * RESEND_FROM_EMAIL on Vercel (e.g. SpendScope <noreply@spendscope.site>).
 */

/** Flip to false after spendscope.site is verified in Resend. */
const USE_RESEND_TEST_SENDER = true;

export const RESEND_TEST_FROM = "SpendScope <onboarding@resend.dev>";

export const RESEND_VERIFIED_FROM = "SpendScope <noreply@spendscope.site>";

/**
 * Resend `from` address — server-only (RESEND_FROM_EMAIL / RESEND_API_KEY).
 * Never import from client components.
 */
export function getResendFrom(): string {
  if (USE_RESEND_TEST_SENDER) {
    return RESEND_TEST_FROM;
  }
  return process.env.RESEND_FROM_EMAIL?.trim() || RESEND_VERIFIED_FROM;
}

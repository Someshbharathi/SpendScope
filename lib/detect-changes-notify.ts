import { isValidShareIdFormat } from "@/lib/audit-share-fetch";
import { getPublicAppOrigin, getPublicOriginFromRequest } from "@/lib/email/site-url";
import { isResendConfigured, sendConsolidatedPricingChangeEmail } from "@/lib/email/send-pricing-change-notification-email";
import type { DetectChangesWithReauditItem } from "@/lib/audit-rerun-diff";
import type { PricingChangeNotificationAudit } from "@/lib/pricing-change-summary";

export type DetectChangesNotificationResult = {
  emails_sent: number;
  emails_failed: number;
  emails_skipped: number;
  details: Array<
    | { email: string; status: "sent"; audit_count: number; resend_id?: string }
    | { email: string; status: "failed"; audit_count: number; error: string }
    | { status: "skipped"; reason: string }
  >;
};

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

function buildReauditUrl(origin: string, shareId: string): string {
  return `${origin.replace(/\/$/, "")}/re-audit/${encodeURIComponent(shareId)}`;
}

export function groupAuditsByEmail(
  items: Array<
    DetectChangesWithReauditItem & { email: string; company_name: string; share_id: string }
  >,
  origin: string,
): Map<string, PricingChangeNotificationAudit[]> {
  const map = new Map<string, PricingChangeNotificationAudit[]>();

  for (const item of items) {
    const email = normalizeEmail(item.email);
    if (!email) continue;

    const shareId = item.share_id.trim();
    if (!shareId || !isValidShareIdFormat(shareId)) continue;

    const entry: PricingChangeNotificationAudit = {
      audit_id: item.audit_id,
      changes: item.changes,
      old_result: item.old_result,
      new_result: item.new_result,
      diff: item.diff,
      company_name: item.company_name.trim() || "Your audit",
      reaudit_url: buildReauditUrl(origin, shareId),
    };

    const list = map.get(email) ?? [];
    list.push(entry);
    map.set(email, list);
  }

  for (const [, audits] of map) {
    audits.sort((a, b) => a.company_name.localeCompare(b.company_name));
  }

  return map;
}

/**
 * Sends at most one consolidated email per distinct user email. Failures are isolated per recipient.
 */
export async function sendPricingChangeNotifications(
  items: Array<
    DetectChangesWithReauditItem & { email: string; company_name: string; share_id: string }
  >,
  req: Request,
): Promise<DetectChangesNotificationResult> {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim()
    ? getPublicAppOrigin()
    : getPublicOriginFromRequest(req);

  const result: DetectChangesNotificationResult = {
    emails_sent: 0,
    emails_failed: 0,
    emails_skipped: 0,
    details: [],
  };

  if (items.length === 0) {
    result.details.push({ status: "skipped", reason: "no_affected_audits" });
    result.emails_skipped = 1;
    return result;
  }

  if (!isResendConfigured()) {
    result.details.push({ status: "skipped", reason: "resend_not_configured" });
    result.emails_skipped = 1;
    return result;
  }

  const byEmail = groupAuditsByEmail(items, origin);
  if (byEmail.size === 0) {
    result.details.push({ status: "skipped", reason: "no_valid_recipient_emails" });
    result.emails_skipped = 1;
    return result;
  }

  const sentThisRequest = new Set<string>();

  for (const [email, audits] of byEmail) {
    if (sentThisRequest.has(email)) continue;
    sentThisRequest.add(email);

    try {
      const data = await sendConsolidatedPricingChangeEmail({ to: email, audits });
      result.emails_sent += 1;
      result.details.push({
        email,
        status: "sent",
        audit_count: audits.length,
        resend_id: data?.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown email error";
      console.error("[detect-changes] email failed", { email, audit_count: audits.length, error: message });
      result.emails_failed += 1;
      result.details.push({
        email,
        status: "failed",
        audit_count: audits.length,
        error: message,
      });
    }
  }

  return result;
}

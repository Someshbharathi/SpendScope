import { Resend } from "resend";

import {
  buildConsolidatedPricingChangeEmailHtml,
  PRICING_CHANGE_EMAIL_SUBJECT,
} from "@/lib/email/pricing-change-notification-email";
import { getResendFrom } from "@/lib/email/resend-from";
import { isResendConfigured } from "@/lib/email/send-audit-report-email";
import {
  buildConsolidatedPricingChangeEmailText,
  type PricingChangeNotificationAudit,
} from "@/lib/pricing-change-summary";

export type SendConsolidatedPricingChangeEmailParams = {
  to: string;
  audits: PricingChangeNotificationAudit[];
};

/**
 * One consolidated notification per user (all affected audits in a single message).
 */
export async function sendConsolidatedPricingChangeEmail(
  params: SendConsolidatedPricingChangeEmailParams,
): Promise<{ id: string } | undefined> {
  if (params.audits.length === 0) {
    throw new Error("No audits to include in pricing change notification");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(apiKey);
  const text = buildConsolidatedPricingChangeEmailText(params.audits);
  const html = buildConsolidatedPricingChangeEmailHtml(params.audits);

  const { data, error } = await resend.emails.send({
    from: getResendFrom(),
    to: params.to,
    subject: PRICING_CHANGE_EMAIL_SUBJECT,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? undefined;
}

export { isResendConfigured };

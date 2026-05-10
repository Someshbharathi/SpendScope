import { Resend } from "resend";

import { buildAuditReportEmailHtml, type AuditReportEmailContent } from "@/lib/email/report-email-html";

export type SendAuditReportEmailParams = AuditReportEmailContent & {
  to: string;
};

function getResendFrom(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() || "SpendScope <onboarding@resend.dev>"
  );
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Sends the audit summary email via Resend. Throws on configuration or API errors.
 */
export async function sendAuditReportEmail(params: SendAuditReportEmailParams): Promise<{ id: string } | undefined> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(apiKey);
  const html = buildAuditReportEmailHtml({
    shareUrl: params.shareUrl,
    executiveSummary: params.executiveSummary,
    monthlySavings: params.monthlySavings,
    annualSavings: params.annualSavings,
    topRecommendations: params.topRecommendations,
  });

  const { data, error } = await resend.emails.send({
    from: getResendFrom(),
    to: params.to,
    subject: "Your SpendScope AI Audit Report",
    html,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? undefined;
}

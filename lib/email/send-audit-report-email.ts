import { Resend } from "resend";

import { getResendFrom } from "@/lib/email/resend-from";
import {
  buildAuditReportEmailHtml,
  buildAuditReportPlainText,
  type AuditReportEmailContent,
} from "@/lib/email/report-email-html";

export type SendAuditReportEmailParams = AuditReportEmailContent & {
  to: string;
};

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
  const emailContent: AuditReportEmailContent = {
    shareUrl: params.shareUrl,
    executiveSummary: params.executiveSummary,
    monthlySavings: params.monthlySavings,
    annualSavings: params.annualSavings,
    topRecommendations: params.topRecommendations,
  };

  const html = buildAuditReportEmailHtml(emailContent);
  const text = buildAuditReportPlainText(emailContent);

  const { data, error } = await resend.emails.send({
    from: getResendFrom(),
    to: params.to,
    subject: "Your SpendScope AI Audit Report",
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? undefined;
}

import { escapeHtml } from "@/lib/email/escape-html";
import { formatCurrency } from "@/lib/format-currency";

export type AuditReportEmailContent = {
  shareUrl: string;
  /** Personalized executive narrative (same text as on-page AI brief). */
  executiveSummary: string;
  monthlySavings: number;
  annualSavings: number;
  topRecommendations: string[];
};

function renderBullets(items: string[]): string {
  if (items.length === 0) {
    return `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#64748b;">No specific recommendations were highlighted on this pass.</p>`;
  }
  const lis = items
    .map((line) => `<li style="margin:0 0 8px;font-size:14px;line-height:1.55;color:#334155;">${escapeHtml(line)}</li>`)
    .join("");
  return `<ul style="margin:0 0 16px;padding-left:20px;color:#334155;">${lis}</ul>`;
}

export function buildAuditReportPlainText(content: AuditReportEmailContent): string {
  const summary = content.executiveSummary.trim();
  const monthly = formatCurrency(content.monthlySavings);
  const annual = formatCurrency(content.annualSavings);
  const lines = [
    "SpendScope — Your AI Audit Report",
    "",
    "PERSONALIZED EXECUTIVE SUMMARY",
    summary,
    "",
    `Modeled monthly savings opportunity: ${monthly}`,
    `Modeled annual savings opportunity: ${annual}`,
    "",
    "Top recommendations:",
    ...(content.topRecommendations.length > 0
      ? content.topRecommendations.map((r) => `• ${r}`)
      : ["• No specific recommendations were highlighted on this pass."]),
    "",
    `View full report: ${content.shareUrl}`,
    "",
    "This summary uses published retail benchmarks and the inputs from your audit—validate against contracts before renewal decisions.",
  ];
  return lines.join("\n");
}

export function buildAuditReportEmailHtml(content: AuditReportEmailContent): string {
  const summary = escapeHtml(content.executiveSummary.trim());
  const monthly = formatCurrency(content.monthlySavings);
  const annual = formatCurrency(content.annualSavings);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>Your SpendScope audit report</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1419;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1419;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#151b24;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 20px;background:linear-gradient(135deg,rgba(139,92,246,0.22) 0%,rgba(56,189,248,0.12) 100%);border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#a5b4fc;">SpendScope</p>
              <h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25;color:#f8fafc;">Your SpendScope AI Audit Report</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#94a3b8;">Personalized executive summary</p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#e2e8f0;">${summary}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-radius:10px;background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);">
                <tr>
                  <td style="padding:18px 20px;width:50%;vertical-align:top;border-right:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Monthly savings</p>
                    <p style="margin:0;font-size:20px;font-weight:600;color:#34d399;letter-spacing:-0.02em;">${escapeHtml(monthly)}</p>
                  </td>
                  <td style="padding:18px 20px;width:50%;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Annual savings</p>
                    <p style="margin:0;font-size:20px;font-weight:600;color:#f1f5f9;letter-spacing:-0.02em;">${escapeHtml(annual)}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;">Top recommendations</p>
              ${renderBullets(content.topRecommendations)}

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                <tr>
                  <td align="center" style="padding:8px 0 4px;">
                    <a href="${escapeHtml(content.shareUrl)}" style="display:inline-block;padding:12px 28px;background-color:#f8fafc;color:#0f1419;font-size:14px;font-weight:600;text-decoration:none;border-radius:9999px;">View full audit report</a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;line-height:1.55;color:#64748b;">
                This summary uses published retail benchmarks and the inputs from your audit—validate against contracts before renewal decisions.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#475569;">© ${new Date().getFullYear()} SpendScope · AI spend intelligence</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

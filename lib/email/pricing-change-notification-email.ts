import { escapeHtml } from "@/lib/email/escape-html";
import { formatCurrency } from "@/lib/format-currency";
import {
  buildConsolidatedPricingChangeEmailText,
  formatPlanPriceChangeBullet,
  type PricingChangeNotificationAudit,
} from "@/lib/pricing-change-summary";

export const PRICING_CHANGE_EMAIL_SUBJECT = "Your AI spend audits have changed";

const INTRO =
  "We detected benchmark pricing changes affecting your stored AI spend audits.";

const CLOSING =
  "This notification was generated because benchmark pricing changes affected your previously stored audit recommendations.";

function renderPriceChangeBullets(audit: PricingChangeNotificationAudit): string {
  if (audit.changes.length === 0) {
    return `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#64748b;">No specific plan price changes were listed for this audit.</p>`;
  }
  const lis = audit.changes
    .map(
      (c) =>
        `<li style="margin:0 0 8px;font-size:14px;line-height:1.55;color:#e2e8f0;">${escapeHtml(formatPlanPriceChangeBullet(c))}</li>`,
    )
    .join("");
  return `<ul style="margin:0 0 16px;padding-left:20px;color:#e2e8f0;">${lis}</ul>`;
}

function renderSavingsRow(audit: PricingChangeNotificationAudit): string {
  if (!audit.new_result) return "";
  const monthlyNew = formatCurrency(audit.new_result.monthly_savings);
  if (audit.old_result) {
    const monthlyOld = formatCurrency(audit.old_result.monthly_savings);
    return `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#e2e8f0;"><span style="color:#94a3b8;">Projected monthly savings:</span> <span style="font-weight:600;color:#34d399;">${escapeHtml(monthlyOld)}</span> → <span style="font-weight:600;color:#34d399;">${escapeHtml(monthlyNew)}</span></p>`;
  }
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#e2e8f0;"><span style="color:#94a3b8;">Projected monthly savings:</span> <span style="font-weight:600;color:#34d399;">${escapeHtml(monthlyNew)}</span></p>`;
}

function renderAuditSection(audit: PricingChangeNotificationAudit, index: number): string {
  const baseTitle = audit.company_name.trim() || "Your audit";
  const title = escapeHtml(
    audit.audit_id ? `${baseTitle}` : baseTitle,
  );
  const subtitle =
    audit.audit_id.length >= 8
      ? `<p style="margin:0 0 12px;font-size:12px;line-height:1.4;color:#64748b;">Audit ref ${escapeHtml(audit.audit_id.slice(0, 8))}…</p>`
      : "";
  const divider =
    index > 0
      ? `<tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid rgba(255,255,255,0.08);font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table></td></tr>`
      : "";

  return `${divider}
          <tr>
            <td style="padding:24px 28px 8px;">
              <h2 style="margin:0 0 4px;font-size:18px;font-weight:600;line-height:1.3;color:#f8fafc;">${title}</h2>
              ${subtitle}
              <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;">Changed pricing</p>
              ${renderPriceChangeBullets(audit)}
              ${renderSavingsRow(audit)}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="padding:4px 0 8px;">
                    <a href="${escapeHtml(audit.reaudit_url)}" style="display:inline-block;padding:10px 22px;background-color:#f8fafc;color:#0f1419;font-size:13px;font-weight:600;text-decoration:none;border-radius:9999px;">View updated audit</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

export function buildConsolidatedPricingChangeEmailHtml(
  audits: PricingChangeNotificationAudit[],
): string {
  const auditSections = audits.map((a, i) => renderAuditSection(a, i)).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>${escapeHtml(PRICING_CHANGE_EMAIL_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1419;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f1419;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#151b24;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="padding:28px 28px 20px;background:linear-gradient(135deg,rgba(139,92,246,0.22) 0%,rgba(56,189,248,0.12) 100%);border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#a5b4fc;">SpendScope</p>
              <h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25;color:#f8fafc;">${escapeHtml(PRICING_CHANGE_EMAIL_SUBJECT)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0;font-size:15px;line-height:1.65;color:#e2e8f0;">${escapeHtml(INTRO)}</p>
            </td>
          </tr>
          ${auditSections}
          <tr>
            <td style="padding:8px 28px 24px;">
              <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">${escapeHtml(CLOSING)}</p>
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

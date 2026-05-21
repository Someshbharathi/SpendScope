import type { DetectChangesWithReauditItem } from "./audit-rerun-diff";
import { formatCurrency } from "./format-currency";
import type { EnrichedPlanPriceChange } from "./pricing-snapshot-diff";

function formatSeatPrice(value: number | null): string {
  if (value === null) return "custom / variable";
  return `$${value}`;
}

/** Bullet line: `Tool Plan: $20 → $30` (catalog-driven labels). */
export function formatPlanPriceChangeBullet(change: EnrichedPlanPriceChange): string {
  return `${change.tool_display_name} ${change.plan_label}: ${formatSeatPrice(change.old_price)} → ${formatSeatPrice(change.new_price)}`;
}

export type PricingChangeNotificationAudit = DetectChangesWithReauditItem & {
  company_name: string;
  reaudit_url: string;
};

/** Plain-text summary for a single audit block inside a consolidated email. */
export function buildAuditBlockForConsolidatedEmail(audit: PricingChangeNotificationAudit): string {
  const title = audit.company_name.trim() || "Your audit";
  const lines: string[] = [`${title}`, "", "Changed pricing:"];

  for (const change of audit.changes) {
    lines.push(`- ${formatPlanPriceChangeBullet(change)}`);
  }

  lines.push("");
  if (audit.old_result && audit.new_result) {
    lines.push(
      `Projected monthly savings:\n${formatCurrency(audit.old_result.monthly_savings)} → ${formatCurrency(audit.new_result.monthly_savings)}`,
    );
  } else if (audit.new_result) {
    lines.push(`Projected monthly savings: ${formatCurrency(audit.new_result.monthly_savings)}`);
  }

  lines.push("");
  lines.push("View updated audit:");
  lines.push(audit.reaudit_url);

  return lines.join("\n");
}

const INTRO =
  "We detected benchmark pricing changes affecting your stored AI spend audits.";

const CLOSING =
  "This notification was generated because benchmark pricing changes affected your previously stored audit recommendations.";

/** Full plain-text body for one user (multiple audits). */
export function buildConsolidatedPricingChangeEmailText(
  audits: PricingChangeNotificationAudit[],
): string {
  if (audits.length === 0) return "";

  const blocks = audits.map((a) => buildAuditBlockForConsolidatedEmail(a));
  return ["SpendScope", "", INTRO, "", ...blocks.join("\n\n"), "", CLOSING].join("\n");
}

/** Plain-text summary for a single re-audit detection row (logs / debugging). */
export function buildPricingChangeNotificationSummary(item: DetectChangesWithReauditItem): string {
  const labels =
    item.diff.affected_tool_labels.length > 0
      ? item.diff.affected_tool_labels.join(", ")
      : "your stack";

  const lines: string[] = [
    `List-price benchmarks changed for: ${labels}.`,
    "",
    "Price updates:",
    ...item.changes.map((c) => `• ${formatPlanPriceChangeBullet(c)}`),
  ];

  if (item.old_result && item.new_result) {
    lines.push(
      "",
      `Modeled monthly savings: ${formatCurrency(item.old_result.monthly_savings)} → ${formatCurrency(item.new_result.monthly_savings)}` +
        (item.diff.monthly_savings_delta !== null
          ? ` (Δ ${item.diff.monthly_savings_delta >= 0 ? "+" : ""}${item.diff.monthly_savings_delta})`
          : ""),
    );
  }

  if (item.diff.recommendation_changed) {
    lines.push("Recommendations changed after re-running the audit with current benchmarks.");
  }
  if (item.diff.optimization_summaries_changed) {
    lines.push("Optimization summaries changed for one or more tools.");
  }

  return lines.join("\n");
}

/** Batch summary for multiple affected audits (logs). */
export function buildPricingChangeBatchSummary(items: DetectChangesWithReauditItem[]): string {
  if (items.length === 0) {
    return "No audits affected by benchmark list-price changes.";
  }
  const header = `${items.length} audit${items.length === 1 ? "" : "s"} affected by benchmark updates.`;
  const blocks = items.map(
    (item, i) => `--- Audit ${i + 1} (${item.audit_id}) ---\n${buildPricingChangeNotificationSummary(item)}`,
  );
  return [header, "", ...blocks].join("\n");
}

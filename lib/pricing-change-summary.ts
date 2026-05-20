import type { DetectChangesWithReauditItem } from "./audit-rerun-diff";
import type { EnrichedPlanPriceChange } from "./pricing-snapshot-diff";

function formatSeatPrice(value: number | null): string {
  if (value === null) return "custom / variable";
  return `$${value}/seat`;
}

/** One line per detected plan price change (for email or logs). */
export function formatPlanPriceChangeLine(change: EnrichedPlanPriceChange): string {
  return `${change.tool_display_name} — ${change.plan_label}: ${formatSeatPrice(change.old_price)} → ${formatSeatPrice(change.new_price)}`;
}

/** Plain-text summary for a single re-audit detection row (no hardcoded vendor names). */
export function buildPricingChangeNotificationSummary(item: DetectChangesWithReauditItem): string {
  const lines: string[] = [];

  const labels =
    item.diff.affected_tool_labels.length > 0
      ? item.diff.affected_tool_labels.join(", ")
      : "your stack";

  lines.push(`List-price benchmarks changed for: ${labels}.`);
  lines.push("");
  lines.push("Price updates:");
  for (const change of item.changes) {
    lines.push(`• ${formatPlanPriceChangeLine(change)}`);
  }

  if (item.old_result && item.new_result) {
    lines.push("");
    lines.push(
      `Modeled monthly savings: ${item.old_result.monthly_savings} → ${item.new_result.monthly_savings}` +
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

/** Batch summary for multiple affected audits. */
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

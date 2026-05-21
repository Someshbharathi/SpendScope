import type { AuditReport } from "./audit-types";
import type { EnrichedPlanPriceChange, PlanPriceChange } from "./pricing-snapshot-diff";
import {
  getAffectedToolIdsFromChanges,
  getAffectedToolLabelsFromChanges,
} from "./pricing-snapshot-diff";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type AuditResultSummary = {
  monthly_savings: number;
  annual_savings: number;
};

/** Minimal parse of stored `results_json` for comparisons (does not re-run engine). */
export function parseStoredAuditReport(raw: unknown): AuditReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<AuditReport>;
  if (!Array.isArray(r.findings)) return null;
  return raw as AuditReport;
}

export function summarizeAuditReport(report: AuditReport | null): AuditResultSummary | null {
  if (!report) return null;
  return {
    monthly_savings: round2(report.totalMonthlySavings),
    annual_savings: round2(report.totalAnnualSavings),
  };
}

function recommendationFingerprint(report: AuditReport): string {
  const parts = report.findings
    .map((f) => ({
      t: f.toolId,
      a: f.actionType,
      rp: f.recommendedPlan,
      rt: f.recommendedTool,
      s: round2(f.monthlySavings),
    }))
    .sort((x, y) => x.t.localeCompare(y.t));
  return JSON.stringify(parts);
}

function optimizationFingerprint(report: AuditReport): string {
  const parts = report.findings
    .map((f) => ({ t: f.toolId, o: f.optimizationSummary }))
    .sort((x, y) => x.t.localeCompare(y.t));
  return JSON.stringify(parts);
}

export type ReauditDiffBlock = {
  monthly_savings_delta: number | null;
  annual_savings_delta: number | null;
  recommendation_changed: boolean;
  optimization_summaries_changed: boolean;
  /** Tool ids from detected price changes (catalog-driven). */
  affected_tools: string[];
  /** Human-readable tool names from `TOOL_PRICING`. */
  affected_tool_labels: string[];
};

export type DetectChangesWithReauditItem = {
  audit_id: string;
  changes: EnrichedPlanPriceChange[];
  old_result: AuditResultSummary | null;
  new_result: AuditResultSummary;
  diff: ReauditDiffBlock;
};

export function buildReauditDiff(
  pricingChanges: PlanPriceChange[],
  oldReport: AuditReport | null,
  newReport: AuditReport,
): ReauditDiffBlock {
  const affected_tools = getAffectedToolIdsFromChanges(pricingChanges);
  const affected_tool_labels = getAffectedToolLabelsFromChanges(pricingChanges);

  const oldMonthly = oldReport ? round2(oldReport.totalMonthlySavings) : null;
  const oldAnnual = oldReport ? round2(oldReport.totalAnnualSavings) : null;
  const newMonthly = round2(newReport.totalMonthlySavings);
  const newAnnual = round2(newReport.totalAnnualSavings);

  const monthly_savings_delta =
    oldMonthly !== null ? round2(newMonthly - oldMonthly) : null;
  const annual_savings_delta =
    oldAnnual !== null ? round2(newAnnual - oldAnnual) : null;

  const recommendation_changed =
    oldReport !== null
      ? recommendationFingerprint(oldReport) !== recommendationFingerprint(newReport)
      : false;

  const optimization_summaries_changed =
    oldReport !== null
      ? optimizationFingerprint(oldReport) !== optimizationFingerprint(newReport)
      : false;

  return {
    monthly_savings_delta,
    annual_savings_delta,
    recommendation_changed,
    optimization_summaries_changed,
    affected_tools,
    affected_tool_labels,
  };
}

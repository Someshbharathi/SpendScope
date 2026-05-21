import { rerunAuditReportFromShareRow } from "@/lib/audit-reaudit-page";
import {
  buildReauditDiff,
  parseStoredAuditReport,
  summarizeAuditReport,
  type ReauditDiffBlock,
} from "@/lib/audit-rerun-diff";
import type { AuditShareRow } from "@/lib/audit-share-fetch";
import type { AuditReport, ToolAuditFinding } from "@/lib/audit-types";
import { getToolDisplayName } from "@/lib/pricing";
import { PRICING_DATA_AS_OF_ISO } from "@/lib/pricing-sources";
import {
  diffSnapshotToolsAgainstCurrent,
  enrichPlanPriceChanges,
  type EnrichedPlanPriceChange,
} from "@/lib/pricing-snapshot-diff";

function extractToolsFromSnapshot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return null;
  return (raw as { tools?: unknown }).tools ?? null;
}

function snapshotPricingAsOf(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as { pricingDataAsOf?: unknown }).pricingDataAsOf;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export type RecommendationLineSnapshot = {
  actionType: string;
  recommendedTool: string;
  recommendedPlan: string;
  oneSentenceReason: string;
  optimizationSummary: string;
  monthlySavings: number;
  spendClassification: string;
};

export type ToolRecommendationDiff = {
  toolId: string;
  toolLabel: string;
  changed: boolean;
  previous: RecommendationLineSnapshot | null;
  updated: RecommendationLineSnapshot | null;
};

function toRecommendationSnapshot(finding: ToolAuditFinding): RecommendationLineSnapshot {
  return {
    actionType: finding.actionType,
    recommendedTool: finding.recommendedTool,
    recommendedPlan: finding.recommendedPlan,
    oneSentenceReason: finding.oneSentenceReason,
    optimizationSummary: finding.optimizationSummary,
    monthlySavings: finding.monthlySavings,
    spendClassification: finding.spendClassification,
  };
}

export function buildToolRecommendationDiffs(
  oldReport: AuditReport | null,
  newReport: AuditReport,
): ToolRecommendationDiff[] {
  const oldByTool = new Map(
    (oldReport?.findings ?? []).map((f) => [f.toolId, toRecommendationSnapshot(f)]),
  );
  const newByTool = new Map(newReport.findings.map((f) => [f.toolId, toRecommendationSnapshot(f)]));
  const toolIds = [...new Set([...oldByTool.keys(), ...newByTool.keys()])].sort();

  return toolIds.map((toolId) => {
    const previous = oldByTool.get(toolId) ?? null;
    const updated = newByTool.get(toolId) ?? null;
    return {
      toolId,
      toolLabel: getToolDisplayName(toolId),
      changed: JSON.stringify(previous) !== JSON.stringify(updated),
      previous,
      updated,
    };
  });
}

export type ReauditComparisonPayload = {
  auditId: string;
  shareId: string;
  companyName: string;
  createdAtLabel: string;
  savedReportUrl: string;
  snapshotPricingAsOf: string | null;
  currentPricingAsOf: string;
  priceChanges: EnrichedPlanPriceChange[];
  oldResult: ReturnType<typeof summarizeAuditReport>;
  newResult: NonNullable<ReturnType<typeof summarizeAuditReport>>;
  diff: ReauditDiffBlock;
  recommendationDiffs: ToolRecommendationDiff[];
};

/** Build comparison payload for `/re-audit/[id]` (id = share UUID from email links). */
export function buildReauditComparisonPayload(row: AuditShareRow): ReauditComparisonPayload | null {
  const newReport = rerunAuditReportFromShareRow(row);
  if (!newReport) return null;

  const oldReport = parseStoredAuditReport(row.results_json);
  const snapshotTools = extractToolsFromSnapshot(row.pricing_snapshot);
  const rawChanges = diffSnapshotToolsAgainstCurrent(snapshotTools);
  const priceChanges = enrichPlanPriceChanges(rawChanges);
  const diff = buildReauditDiff(rawChanges, oldReport, newReport);
  const newResult = summarizeAuditReport(newReport);
  if (!newResult) return null;

  const createdAtLabel = row.created_at
    ? new Date(row.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "Unknown date";

  return {
    auditId: row.id,
    shareId: row.share_id,
    companyName: row.company_name.trim() || "Your audit",
    createdAtLabel,
    savedReportUrl: `/audit/${row.share_id}`,
    snapshotPricingAsOf: snapshotPricingAsOf(row.pricing_snapshot),
    currentPricingAsOf: PRICING_DATA_AS_OF_ISO,
    priceChanges,
    oldResult: summarizeAuditReport(oldReport),
    newResult,
    diff,
    recommendationDiffs: buildToolRecommendationDiffs(oldReport, newReport),
  };
}

import type {
  AuditDimensionSummary,
  RecommendationActionType,
  ToolAuditFinding,
} from "./audit-types";

function defaultDimensions(): AuditDimensionSummary {
  return {
    planSuitability: "Evaluation not available for this report version.",
    cheaperSameVendor: "—",
    alternativeTool: "—",
    creditsVsRetail: "—",
  };
}

function normalizeRecommendationBadges(
  badges: ToolAuditFinding["recommendationBadges"] | undefined,
  fallbackAction: RecommendationActionType,
): RecommendationActionType[] {
  if (Array.isArray(badges) && badges.length > 0) return badges;
  return [fallbackAction];
}

export function normalizeFinding(finding: ToolAuditFinding): ToolAuditFinding {
  const actionType = finding.actionType ?? "Already Optimized";
  const reasoning =
    finding.reasoning ??
    (finding as { reasons?: string[] }).reasons ??
    ["No detailed reasoning available for this older report."];
  const oneSentenceReason =
    finding.oneSentenceReason ??
    (Array.isArray(reasoning) && reasoning[0] ? reasoning[0] : finding.optimizationSummary ?? "");

  return {
    ...finding,
    currentTool: finding.currentTool ?? (finding as { toolName?: string }).toolName ?? "Unknown tool",
    currentPlan: finding.currentPlan ?? (finding as { currentPlanLabel?: string }).currentPlanLabel ?? "Current plan",
    recommendedTool: finding.recommendedTool ?? finding.currentTool ?? "Current tool",
    recommendedPlan:
      finding.recommendedPlan ??
      (finding as { recommendedPlanLabel?: string }).recommendedPlanLabel ??
      finding.currentPlan ??
      "Current plan",
    actionType,
    benchmarkSpendMonthly: finding.benchmarkSpendMonthly ?? null,
    spendRatio: finding.spendRatio ?? null,
    spendClassification: finding.spendClassification ?? "Already Optimized",
    currentSpend:
      finding.currentSpend ??
      (finding as { monthlySpendReported?: number }).monthlySpendReported ??
      0,
    optimizedSpend:
      finding.optimizedSpend ??
      (finding as { monthlySpendAfterRecommendation?: number }).monthlySpendAfterRecommendation ??
      0,
    monthlySavings: finding.monthlySavings ?? 0,
    annualSavings: finding.annualSavings ?? Math.round((finding.monthlySavings ?? 0) * 12),
    confidenceLevel: finding.confidenceLevel ?? "Medium",
    oneSentenceReason,
    reasoning,
    optimizationSummary:
      finding.optimizationSummary ??
      "This recommendation was loaded from an earlier report format.",
    dimensions: finding.dimensions ?? defaultDimensions(),
    potentialPricingAnomaly: Boolean(finding.potentialPricingAnomaly),
    recommendationBadges: normalizeRecommendationBadges(finding.recommendationBadges, actionType),
  };
}

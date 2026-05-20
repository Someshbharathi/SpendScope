export const TOOL_IDS = [
  "chatgpt",
  "claude",
  "cursor",
  "copilot",
  "gemini",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export const USE_CASES = [
  "coding",
  "writing",
  "research",
  "mixed",
  "data_analysis",
] as const;

export type UseCase = (typeof USE_CASES)[number];

export type PlanTier = "free" | "individual" | "team" | "enterprise";

export interface ToolPlan {
  id: string;
  label: string;
  /** Monthly price per seat when billed monthly; null for custom / variable enterprise */
  monthlyPerSeat: number | null;
  tier: PlanTier;
}

export interface ToolPricing {
  id: ToolId;
  displayName: string;
  plans: ToolPlan[];
}

/**
 * Benchmark snapshot stored on each audit row (`pricing_snapshot` jsonb).
 * Built from the same sources as the audit engine: `TOOL_PRICING` plus PRICING_DATA / vendor metadata.
 */
export interface AuditPricingSnapshot {
  tools: Record<ToolId, ToolPricing>;
  pricingDataAsOf: string;
  pricingDataReference: string;
  vendorPricingPages: Record<ToolId, string>;
}

export interface ToolFormValues {
  enabled: boolean;
  planId: string;
  monthlySpend: number;
  seats: number;
}

export interface AuditFormValues {
  email: string;
  companyName: string;
  role: string;
  teamSize: number;
  useCase: UseCase;
  tools: Record<ToolId, ToolFormValues>;
}

export type RecommendationActionType =
  | "Downgrade Plan"
  | "Alternative Tool"
  | "Optimize Seats"
  | "Use Credits"
  | "Reduce API Spend"
  | "Already Optimized";

/** Spend vs list benchmark — independent of action type (downgrade vs usage, etc.). */
export type SpendClassification =
  | "Already Optimized"
  | "Mild Optimization Opportunity"
  | "Moderate Overspending"
  | "Significant Overspending"
  | "Potential Billing Anomaly";

export type ConfidenceLevel = "High" | "Medium" | "Low";

/** Four checks the engine runs for every enabled tool (finance-style transparency). */
export interface AuditDimensionSummary {
  planSuitability: string;
  cheaperSameVendor: string;
  alternativeTool: string;
  creditsVsRetail: string;
}

export interface ToolAuditFinding {
  toolId: ToolId;
  currentTool: string;
  currentPlan: string;
  recommendedTool: string;
  recommendedPlan: string;
  actionType: RecommendationActionType;
  /** List-price benchmark monthly total for this plan × seats (null if not computable). */
  benchmarkSpendMonthly: number | null;
  /** actualSpend / benchmark when benchmark is meaningful (> 0). */
  spendRatio: number | null;
  spendClassification: SpendClassification;
  currentSpend: number;
  optimizedSpend: number;
  monthlySavings: number;
  annualSavings: number;
  confidenceLevel: ConfidenceLevel;
  /** Single headline sentence for the card. */
  oneSentenceReason: string;
  reasoning: string[];
  optimizationSummary: string;
  dimensions: AuditDimensionSummary;
  potentialPricingAnomaly: boolean;
  recommendationBadges: RecommendationActionType[];
}

export interface AuditReport {
  companyName: string;
  role: string;
  teamSize: number;
  useCase: UseCase;
  findings: ToolAuditFinding[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  executiveSummary: string;
  summaryBullets: string[];
  isMostlyOptimized: boolean;
  /** ISO date — aligns with PRICING_DATA.md */
  pricingDataAsOf: string;
  pricingDataReference: string;
}

export interface AuditSessionPayload {
  version: 1;
  savedAt: string;
  email: string;
  companyName: string;
  role: string;
  teamSize: number;
  useCase: UseCase;
  tools: Record<ToolId, ToolFormValues>;
  report: AuditReport;
  auditRowId: string | null;
  shareId: string | null;
  /** Cached Gemini narrative; invalidated when `aiSummaryForSavedAt !== savedAt`. */
  aiExecutiveSummary?: string | null;
  aiSummaryForSavedAt?: string | null;
}

export interface EnabledToolPayload {
  toolId: ToolId;
  toolName: string;
  planId: string;
  planLabel: string;
  monthlySpend: number;
  seats: number;
}

export interface AuditInsertPayload {
  email: string;
  company_name: string;
  role: string;
  team_size: number;
  tools_json: {
    useCase: UseCase;
    enabledTools: EnabledToolPayload[];
  };
  results_json: AuditReport;
  share_id: string;
  pricing_snapshot: AuditPricingSnapshot;
}

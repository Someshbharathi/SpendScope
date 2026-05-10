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

export interface ToolFormValues {
  enabled: boolean;
  planId: string;
  monthlySpend: number;
  seats: number;
}

export interface AuditFormValues {
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

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface ToolAuditFinding {
  toolId: ToolId;
  currentTool: string;
  currentPlan: string;
  recommendedTool: string;
  recommendedPlan: string;
  actionType: RecommendationActionType;
  currentSpend: number;
  optimizedSpend: number;
  monthlySavings: number;
  annualSavings: number;
  confidenceLevel: ConfidenceLevel;
  reasoning: string[];
  optimizationSummary: string;
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
}

export interface AuditSessionPayload {
  version: 1;
  savedAt: string;
  companyName: string;
  role: string;
  teamSize: number;
  useCase: UseCase;
  tools: Record<ToolId, ToolFormValues>;
  report: AuditReport;
  auditRowId: string | null;
}

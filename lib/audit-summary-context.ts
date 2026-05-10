import { z } from "zod";

import type { AuditSessionPayload, RecommendationActionType, SpendClassification, UseCase } from "./audit-types";
import { TOOL_IDS } from "./audit-types";
import { normalizeFinding } from "./audit-report-normalize";
import { TOOL_PRICING } from "./pricing";

const USE_CASE_LABEL: Record<UseCase, string> = {
  coding: "Coding",
  writing: "Writing",
  research: "Research",
  mixed: "Mixed",
  data_analysis: "Data analysis",
};

export const OPTIMIZATION_LEVELS = [
  "highly_optimized",
  "moderate_opportunity",
  "significant_opportunity",
  "billing_review_suggested",
] as const;

export type OptimizationLevel = (typeof OPTIMIZATION_LEVELS)[number];

export interface AuditSummaryToolLine {
  toolId: string;
  toolDisplayName: string;
  monthlySpendReported: number;
  seats: number;
  planLabel: string;
  actionType: RecommendationActionType;
  spendClassification: SpendClassification;
  monthlySavingsModeled: number;
}

/** Structured context for Gemini — numbers come only from deterministic audit output. */
export interface AuditSummaryContext {
  companySize: number;
  useCase: string;
  tools: AuditSummaryToolLine[];
  totalMonthlySpend: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  deterministicExecutiveSummary: string;
  summaryBullets: string[];
  recommendations: string[];
  optimizationLevel: OptimizationLevel;
  pricingReferenceNote: string;
}

export const auditSummaryToolLineSchema = z.object({
  toolId: z.string().max(32),
  toolDisplayName: z.string().max(80),
  monthlySpendReported: z.number().finite().min(0),
  seats: z.number().finite().min(1).max(100000),
  planLabel: z.string().max(120),
  actionType: z.string().max(40),
  spendClassification: z.string().max(48),
  monthlySavingsModeled: z.number().finite().min(0),
});

export const auditSummaryContextSchema = z.object({
  companySize: z.number().int().min(1).max(500000),
  useCase: z.string().max(80),
  tools: z.array(auditSummaryToolLineSchema).max(32),
  totalMonthlySpend: z.number().finite().min(0),
  estimatedMonthlySavings: z.number().finite().min(0),
  estimatedAnnualSavings: z.number().finite().min(0),
  deterministicExecutiveSummary: z.string().max(4000),
  summaryBullets: z.array(z.string().max(600)).max(20),
  recommendations: z.array(z.string().max(600)).max(20),
  optimizationLevel: z.enum(OPTIMIZATION_LEVELS),
  pricingReferenceNote: z.string().max(500),
});

export type AuditSummaryContextInput = z.infer<typeof auditSummaryContextSchema>;

function deriveOptimizationLevel(payload: AuditSessionPayload): OptimizationLevel {
  const report = payload.report;
  const savings = report.totalMonthlySavings ?? 0;
  const findings = (report.findings ?? []).map(normalizeFinding);

  if (report.isMostlyOptimized || savings < 25) {
    return "highly_optimized";
  }

  const billingSignal = findings.some(
    (f) => f.spendClassification === "Potential Billing Anomaly" || f.potentialPricingAnomaly,
  );
  if (billingSignal && savings >= 10) {
    return "billing_review_suggested";
  }

  if (savings >= 500) {
    return "significant_opportunity";
  }

  return "moderate_opportunity";
}

function buildRecommendations(payload: AuditSessionPayload): string[] {
  const report = payload.report;
  const bullets = (report.summaryBullets ?? []).filter((b) => typeof b === "string" && b.trim().length > 0);
  if (bullets.length > 0) return bullets.slice(0, 6);

  const findings = (report.findings ?? []).map(normalizeFinding);
  return [...findings]
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 6)
    .map((f) => f.oneSentenceReason || f.optimizationSummary)
    .filter((s) => s.trim().length > 0);
}

/**
 * Builds structured audit context for Gemini from session payload.
 * Safe to call on client or server — uses only deterministic report fields.
 */
export function buildAuditSummaryContext(payload: AuditSessionPayload): AuditSummaryContext {
  const report = payload.report;
  const findings = (report.findings ?? []).map(normalizeFinding);
  const findingByTool = new Map(findings.map((f) => [f.toolId, f]));

  const tools: AuditSummaryToolLine[] = [];
  for (const id of TOOL_IDS) {
    const t = payload.tools[id];
    if (!t?.enabled) continue;
    const f = findingByTool.get(id);
    const pricing = TOOL_PRICING[id];
    const plan = pricing.plans.find((p) => p.id === t.planId);
    tools.push({
      toolId: id,
      toolDisplayName: pricing.displayName,
      monthlySpendReported: f?.currentSpend ?? t.monthlySpend,
      seats: t.seats,
      planLabel: plan?.label ?? t.planId,
      actionType: f?.actionType ?? "Already Optimized",
      spendClassification: f?.spendClassification ?? "Already Optimized",
      monthlySavingsModeled: f?.monthlySavings ?? 0,
    });
  }

  const totalMonthlySpend = findings.reduce((sum, f) => sum + f.currentSpend, 0);

  return {
    companySize: payload.teamSize,
    useCase: USE_CASE_LABEL[payload.useCase] ?? payload.useCase,
    tools,
    totalMonthlySpend,
    estimatedMonthlySavings: report.totalMonthlySavings ?? 0,
    estimatedAnnualSavings: report.totalAnnualSavings ?? 0,
    deterministicExecutiveSummary: report.executiveSummary ?? "",
    summaryBullets: (report.summaryBullets ?? []).filter((b) => typeof b === "string" && b.trim().length > 0),
    recommendations: buildRecommendations(payload),
    optimizationLevel: deriveOptimizationLevel(payload),
    pricingReferenceNote: `Benchmarks as of ${report.pricingDataAsOf} (${report.pricingDataReference}).`,
  };
}

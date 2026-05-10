import type {
  AuditFormValues,
  AuditReport,
  ConfidenceLevel,
  RecommendationActionType,
  ToolAuditFinding,
  ToolId,
  UseCase,
} from "./audit-types";
import { TOOL_IDS } from "./audit-types";
import {
  expectedMonthlyTotal,
  getPlan,
  isEnterpriseTier,
  isTeamishTier,
  TOOL_PRICING,
} from "./pricing";

const ENTERPRISE_LOW_SPEND_THRESHOLD = 400;
const API_SPIKE_MULTIPLIER = 1.8;
const SMALL_TEAM_MAX = 5;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function pricingAnomalyDetected(reported: number, expected: number | null, seats: number): boolean {
  const singleSeatHuge = seats <= 1 && reported >= 1000;
  const manySeatsHuge = seats <= 3 && reported >= 2500;
  const relativeSpike = expected !== null && expected > 0 && reported >= expected * 4;
  return singleSeatHuge || manySeatsHuge || relativeSpike;
}

function actionBadgesFor(actionType: RecommendationActionType, anomaly: boolean): RecommendationActionType[] {
  if (actionType === "Already Optimized") return ["Already Optimized"];
  const badges: RecommendationActionType[] = [actionType];
  if (anomaly) {
    badges.push("Reduce API Spend");
    badges.push("Use Credits");
  }
  return badges;
}

function pickBestListedNonEnterprisePlan(
  toolId: ToolId,
): { id: string; label: string; perSeat: number } | null {
  const plans = TOOL_PRICING[toolId].plans.filter(
    (p) => !isEnterpriseTier(p.tier) && p.monthlyPerSeat !== null,
  );
  if (!plans.length) return null;
  plans.sort((a, b) => (b.monthlyPerSeat ?? 0) - (a.monthlyPerSeat ?? 0));
  const best = plans[0];
  if (!best || best.monthlyPerSeat === null) return null;
  return { id: best.id, label: best.label, perSeat: best.monthlyPerSeat };
}

function pickCheaperPlan(
  toolId: ToolId,
  currentPlanId: string,
): { id: string; label: string; perSeat: number } | null {
  const current = getPlan(toolId, currentPlanId);
  if (!current || current.monthlyPerSeat === null) return null;
  const currentPerSeat = current.monthlyPerSeat;

  const cheaper = TOOL_PRICING[toolId].plans.filter((p) => {
    if (p.monthlyPerSeat === null) return false;
    if (p.id === current.id) return false;
    return p.monthlyPerSeat < currentPerSeat;
  });
  if (!cheaper.length) return null;

  cheaper.sort((a, b) => (a.monthlyPerSeat ?? 0) - (b.monthlyPerSeat ?? 0));
  const best = cheaper[0];
  if (!best || best.monthlyPerSeat === null) return null;
  return { id: best.id, label: best.label, perSeat: best.monthlyPerSeat };
}

function codingAlternative(toolId: ToolId, useCase: UseCase): { toolId: ToolId; plan: string } | null {
  if (useCase !== "coding") return null;
  if (toolId === "chatgpt" || toolId === "claude") {
    return { toolId: "copilot", plan: "Business" };
  }
  return null;
}

function findConfidence(action: RecommendationActionType, anomaly: boolean, monthlySavings: number): ConfidenceLevel {
  if (action === "Already Optimized") return "High";
  if (anomaly && action !== "Downgrade Plan") return "Medium";
  if (action === "Downgrade Plan" || action === "Optimize Seats") return "High";
  if (monthlySavings < 30) return "Low";
  return "Medium";
}

function optimizationSummaryText(
  actionType: RecommendationActionType,
  currentTool: string,
  currentPlan: string,
  recommendedTool: string,
  recommendedPlan: string,
): string {
  if (actionType === "Already Optimized") {
    return "Current setup appears cost-efficient relative to published pricing benchmarks.";
  }
  if (actionType === "Alternative Tool") {
    return `Switching from ${currentTool} ${currentPlan} to ${recommendedTool} ${recommendedPlan} can reduce spend while keeping coding workflows strong.`;
  }
  if (actionType === "Use Credits" || actionType === "Reduce API Spend") {
    return "Primary optimization is usage control: apply credits, rate limits, and billing guardrails before upgrading plans.";
  }
  if (actionType === "Optimize Seats") {
    return "Aligning paid seats with active users lowers cost without reducing capability.";
  }
  return `Moving from ${currentPlan} to ${recommendedPlan} should preserve core functionality at lower monthly cost.`;
}

function analyzeTool(form: AuditFormValues, toolId: ToolId): ToolAuditFinding | null {
  const row = form.tools[toolId];
  if (!row.enabled) return null;

  const currentPlan = getPlan(toolId, row.planId);
  if (!currentPlan) return null;

  const currentTool = TOOL_PRICING[toolId].displayName;
  const seats = Math.max(1, row.seats);
  const currentSpend = Math.max(0, row.monthlySpend);
  const expected = expectedMonthlyTotal(toolId, row.planId, seats);
  const anomaly = pricingAnomalyDetected(currentSpend, expected, seats);

  let recommendedTool = currentTool;
  let recommendedPlan = currentPlan.label;
  let optimizedSpend = currentSpend;
  let actionType: RecommendationActionType = "Already Optimized";
  const reasoning: string[] = [];

  const cheaper = pickCheaperPlan(toolId, row.planId);
  const nonEnterprise = pickBestListedNonEnterprisePlan(toolId);

  const teamPlanMismatch = isTeamishTier(currentPlan.tier) && seats <= 2 && cheaper;
  const enterpriseMismatch =
    isEnterpriseTier(currentPlan.tier) &&
    (form.teamSize <= SMALL_TEAM_MAX || currentSpend < ENTERPRISE_LOW_SPEND_THRESHOLD) &&
    nonEnterprise;
  const seatMismatch = expected !== null && seats > form.teamSize && form.teamSize > 0;
  const apiSpike = expected !== null && currentSpend > expected * API_SPIKE_MULTIPLIER;

  if (teamPlanMismatch) {
    actionType = "Downgrade Plan";
    recommendedPlan = cheaper.label;
    optimizedSpend = cheaper.perSeat * seats;
    reasoning.push(
      `Team-tier pricing is usually unnecessary for ${seats} seat${seats === 1 ? "" : "s"}.`,
      "Lower listed tiers typically cover this usage profile for small seat counts.",
    );
  } else if (enterpriseMismatch) {
    actionType = "Downgrade Plan";
    recommendedPlan = nonEnterprise.label;
    optimizedSpend = nonEnterprise.perSeat * seats;
    reasoning.push(
      `Enterprise plans are usually overprovisioned for teams of ${form.teamSize}.`,
      `Current spend is below the typical enterprise value threshold of ~$${ENTERPRISE_LOW_SPEND_THRESHOLD}/month.`,
    );
  } else if (seatMismatch) {
    actionType = "Optimize Seats";
    const paidPerSeat = currentPlan.monthlyPerSeat ?? Math.max(20, Math.round(currentSpend / seats));
    optimizedSpend = paidPerSeat * form.teamSize;
    reasoning.push(
      `You are paying for ${seats} seats while team size is ${form.teamSize}.`,
      "Reducing inactive seats is usually the fastest no-risk savings lever.",
    );
  } else {
    const alternative = codingAlternative(toolId, form.useCase);
    if (alternative) {
      const altPlan = TOOL_PRICING[alternative.toolId].plans.find((p) => p.label === alternative.plan);
      const altPerSeat = altPlan?.monthlyPerSeat ?? 10;
      const altSpend = altPerSeat * seats;
      if (altSpend < currentSpend) {
        actionType = "Alternative Tool";
        recommendedTool = TOOL_PRICING[alternative.toolId].displayName;
        recommendedPlan = alternative.plan;
        optimizedSpend = altSpend;
        reasoning.push(
          "Coding-heavy teams often extract more value from IDE-native assistants.",
          "Consolidating coding workflows can reduce duplicate spend across overlapping chat tools.",
        );
      }
    }
  }

  if (apiSpike || anomaly) {
    if (actionType === "Already Optimized") {
      actionType = "Reduce API Spend";
      recommendedPlan = currentPlan.label;
      optimizedSpend = Math.max(0, currentSpend * 0.7);
    }
    reasoning.push(
      "Potential pricing anomaly detected: spend materially exceeds expected list-price benchmarks.",
      "Common causes include API overuse, seat sprawl, incorrect billing setup, or unused subscriptions.",
    );
  }

  if (currentSpend > 0 && currentSpend <= 40 && actionType !== "Already Optimized") {
    actionType = "Already Optimized";
    recommendedTool = currentTool;
    recommendedPlan = currentPlan.label;
    optimizedSpend = currentSpend;
    reasoning.push("Current spend level is already near optimized baseline for this tool.");
  }

  const monthlySavings = roundCurrency(Math.max(0, currentSpend - optimizedSpend));
  const annualSavings = Math.round(monthlySavings * 12);
  const confidenceLevel = findConfidence(actionType, anomaly, monthlySavings);

  if (!reasoning.length) {
    reasoning.push("Current setup aligns with expected plan pricing and seat utilization.");
  }

  return {
    toolId,
    currentTool,
    currentPlan: currentPlan.label,
    recommendedTool,
    recommendedPlan,
    actionType,
    currentSpend: roundCurrency(currentSpend),
    optimizedSpend: roundCurrency(Math.max(0, optimizedSpend)),
    monthlySavings,
    annualSavings,
    confidenceLevel,
    reasoning,
    optimizationSummary: optimizationSummaryText(
      actionType,
      currentTool,
      currentPlan.label,
      recommendedTool,
      recommendedPlan,
    ),
    potentialPricingAnomaly: anomaly,
    recommendationBadges: actionBadgesFor(actionType, anomaly),
  };
}

function buildExecutiveSummary(form: AuditFormValues, findings: ToolAuditFinding[], totalSavings: number): string {
  const anomalyCount = findings.filter((f) => f.potentialPricingAnomaly).length;
  const highImpact = findings.filter((f) => f.monthlySavings >= 100).length;
  const overProvisioned = findings.filter(
    (f) => f.actionType === "Downgrade Plan" || f.actionType === "Optimize Seats",
  ).length;

  if (totalSavings < 25 && anomalyCount === 0) {
    return "Your AI stack appears cost-efficient with no material optimization gaps at current pricing benchmarks.";
  }
  if (anomalyCount > 0 && highImpact > 0) {
    return "Your current spend significantly exceeds expected pricing benchmarks, driven by overprovisioned plans and potential API billing anomalies.";
  }
  if (overProvisioned >= 2) {
    return "Most savings opportunities come from overprovisioned premium tiers and seat allocation inefficiencies.";
  }
  if (form.useCase === "coding") {
    return "Your stack is moderately optimized, with actionable savings available through coding-tool consolidation and tighter plan selection.";
  }
  return "Your AI stack appears moderately optimized with a few high-impact savings opportunities worth immediate action.";
}

export function runAuditEngine(form: AuditFormValues): AuditReport {
  const findings = TOOL_IDS.map((id) => analyzeTool(form, id)).filter(
    (f): f is ToolAuditFinding => f !== null,
  );

  const totalMonthlySavings = roundCurrency(
    findings.reduce((acc, finding) => acc + finding.monthlySavings, 0),
  );
  const totalAnnualSavings = Math.round(totalMonthlySavings * 12);
  const isMostlyOptimized = totalMonthlySavings < 25;

  const summaryBullets: string[] = [];
  const downgradeCount = findings.filter((f) => f.actionType === "Downgrade Plan").length;
  const anomalyCount = findings.filter((f) => f.potentialPricingAnomaly).length;
  const alternativeCount = findings.filter((f) => f.actionType === "Alternative Tool").length;

  if (downgradeCount > 0) {
    summaryBullets.push(
      `${downgradeCount} recommendation${downgradeCount > 1 ? "s" : ""} target overprovisioned premium plans.`,
    );
  }
  if (alternativeCount > 0) {
    summaryBullets.push(
      `${alternativeCount} workload${alternativeCount > 1 ? "s" : ""} can reduce overlap by switching to a better-fit tool.`,
    );
  }
  if (anomalyCount > 0) {
    summaryBullets.push(
      `${anomalyCount} tool${anomalyCount > 1 ? "s show" : " shows"} potential pricing anomalies linked to API overuse or billing misconfiguration.`,
    );
  }
  if (isMostlyOptimized) {
    summaryBullets.push("Your current stack already appears cost-efficient.");
  }

  return {
    companyName: form.companyName,
    role: form.role,
    teamSize: form.teamSize,
    useCase: form.useCase,
    findings,
    totalMonthlySavings,
    totalAnnualSavings,
    executiveSummary: buildExecutiveSummary(form, findings, totalMonthlySavings),
    summaryBullets,
    isMostlyOptimized,
  };
}

import type {
  AlternativeToolSuggestion,
  AuditFormValues,
  AuditReport,
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
const API_SPIKE_MULTIPLIER = 1.55;
const SMALL_TEAM_MAX = 5;

function pickCheaperPlan(
  toolId: ToolId,
  currentPlanId: string,
): { planId: string; label: string; monthlyPerSeat: number } | null {
  const current = getPlan(toolId, currentPlanId);
  if (!current || current.monthlyPerSeat === null) return null;

  const candidates = TOOL_PRICING[toolId].plans.filter((p) => {
    if (p.id === currentPlanId) return false;
    if (p.monthlyPerSeat === null) return false;
    return p.monthlyPerSeat < current.monthlyPerSeat!;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (a.monthlyPerSeat ?? 0) - (b.monthlyPerSeat ?? 0));
  const best = candidates[0];
  if (!best || best.monthlyPerSeat === null) return null;

  return {
    planId: best.id,
    label: best.label,
    monthlyPerSeat: best.monthlyPerSeat,
  };
}

/** Strongest listed non-enterprise tier (deterministic downgrade target from Enterprise / custom). */
function pickBestListedNonEnterprisePlan(
  toolId: ToolId,
): { planId: string; label: string; monthlyPerSeat: number } | null {
  const candidates = TOOL_PRICING[toolId].plans.filter(
    (p) => !isEnterpriseTier(p.tier) && p.monthlyPerSeat !== null,
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.monthlyPerSeat ?? 0) - (a.monthlyPerSeat ?? 0));
  const top = candidates[0];
  if (!top || top.monthlyPerSeat === null) return null;
  return {
    planId: top.id,
    label: top.label,
    monthlyPerSeat: top.monthlyPerSeat,
  };
}

function downgradeForSmallSeatCount(
  toolId: ToolId,
  currentPlanId: string,
  seats: number,
): { planId: string; label: string; monthlyPerSeat: number } | null {
  const plan = getPlan(toolId, currentPlanId);
  if (!plan) return null;
  if (seats > 2) return null;
  if (!isTeamishTier(plan.tier)) return null;
  return pickCheaperPlan(toolId, currentPlanId);
}

function downgradeEnterpriseSmallTeam(
  toolId: ToolId,
  currentPlanId: string,
  teamSize: number,
): { planId: string; label: string; monthlyPerSeat: number } | null {
  const plan = getPlan(toolId, currentPlanId);
  if (!plan || !isEnterpriseTier(plan.tier)) return null;
  if (teamSize > SMALL_TEAM_MAX) return null;
  return pickBestListedNonEnterprisePlan(toolId);
}

function downgradeEnterpriseLowSpend(
  toolId: ToolId,
  currentPlanId: string,
  monthlySpend: number,
): { planId: string; label: string; monthlyPerSeat: number } | null {
  const plan = getPlan(toolId, currentPlanId);
  if (!plan || !isEnterpriseTier(plan.tier)) return null;
  if (monthlySpend >= ENTERPRISE_LOW_SPEND_THRESHOLD) return null;
  return pickBestListedNonEnterprisePlan(toolId);
}

function monthlyFallbackEstimate(
  toolId: ToolId,
  planId: string,
  seats: number,
): number {
  const expected = expectedMonthlyTotal(toolId, planId, seats);
  if (expected !== null) return expected;
  return Math.max(199, seats * 45);
}

function codingAlternative(
  toolId: ToolId,
  useCase: UseCase,
  currentPlanId: string,
  seats: number,
): AlternativeToolSuggestion | null {
  if (useCase !== "coding") return null;

  const plan = getPlan(toolId, currentPlanId);
  if (!plan) return null;

  const heavyChat =
    toolId === "chatgpt" &&
    (isTeamishTier(plan.tier) || isEnterpriseTier(plan.tier));
  const heavyClaude =
    toolId === "claude" &&
    (isTeamishTier(plan.tier) || isEnterpriseTier(plan.tier));

  const baseline = monthlyFallbackEstimate(toolId, currentPlanId, seats);

  if (heavyChat) {
    const cursorMonthly = 20 * seats;
    return {
      toolId: "cursor",
      displayName: TOOL_PRICING.cursor.displayName,
      reason:
        "Coding-heavy teams often get better value from an IDE-native assistant instead of a broad chat team tier.",
      estimatedMonthlySavings: Math.max(0, Math.round(baseline - cursorMonthly)),
    };
  }

  if (heavyClaude) {
    const copilotMonthly = 10 * seats;
    return {
      toolId: "copilot",
      displayName: TOOL_PRICING.copilot.displayName,
      reason:
        "For day-to-day code completion, Copilot pairs well with a smaller Claude tier for research-heavy work.",
      estimatedMonthlySavings: Math.max(0, Math.round(baseline - copilotMonthly)),
    };
  }

  return null;
}

function analyzeTool(
  form: AuditFormValues,
  toolId: ToolId,
): ToolAuditFinding | null {
  const row = form.tools[toolId];
  if (!row.enabled) return null;

  const plan = getPlan(toolId, row.planId);
  if (!plan) return null;

  const seats = Math.max(1, row.seats);
  const reported = Math.max(0, row.monthlySpend);
  const expected = expectedMonthlyTotal(toolId, row.planId, seats);

  const reasons: string[] = [];
  let recommendation:
    | { planId: string; label: string; monthlyPerSeat: number }
    | null = null;

  const consider = (
    next: { planId: string; label: string; monthlyPerSeat: number } | null,
    reason: string,
  ) => {
    if (!next) return;
    if (!recommendation) {
      recommendation = next;
      reasons.push(reason);
    }
  };

  consider(
    downgradeForSmallSeatCount(toolId, row.planId, seats),
    `Team plan unnecessary for ${seats} seat${seats === 1 ? "" : "s"}—downgrade to a personal or lower tier.`,
  );

  consider(
    downgradeEnterpriseSmallTeam(toolId, row.planId, form.teamSize),
    `Enterprise is rarely justified for teams of ${form.teamSize}; use a standard business tier.`,
  );

  consider(
    downgradeEnterpriseLowSpend(toolId, row.planId, reported),
    `Enterprise features rarely pay off below ~$${ENTERPRISE_LOW_SPEND_THRESHOLD}/mo in spend.`,
  );

  if (
    expected !== null &&
    reported > expected * API_SPIKE_MULTIPLIER &&
    plan.monthlyPerSeat !== null
  ) {
    reasons.push(
      "Spend is much higher than typical list pricing—review API usage, prepaid credits, and seat sprawl.",
    );
  }

  if (!recommendation) {
    const cheaper = pickCheaperPlan(toolId, row.planId);
    if (cheaper && expected !== null && reported >= expected * 1.05) {
      recommendation = cheaper;
      reasons.push("You can likely cover this workload on a cheaper published plan at your seat count.");
    }
  }

  const alt = codingAlternative(toolId, form.useCase, row.planId, seats);

  const recommendedMonthlyTotal = recommendation
    ? recommendation.monthlyPerSeat * seats
    : reported;

  const planSavings = recommendation
    ? Math.max(0, reported - recommendedMonthlyTotal)
    : 0;

  const altSavings = alt?.estimatedMonthlySavings ?? 0;

  const monthlySavings =
    Math.round((Math.max(planSavings, altSavings) + Number.EPSILON) * 100) / 100;

  const monthlySpendAfterRecommendation =
    Math.round((reported - monthlySavings + Number.EPSILON) * 100) / 100;

  if (alt && altSavings >= planSavings && reasons.every((r) => !r.includes(alt.displayName))) {
    reasons.push(`Alternative: consolidate coding workflows with ${alt.displayName}.`);
  }

  if (reasons.length === 0) {
    reasons.push("No major tier mismatch detected for this tool at current inputs.");
  }

  const overspending =
    monthlySavings > 0 ||
    (expected !== null && reported > expected) ||
    reasons.some((r) => r.includes("API") || r.includes("sprawl"));

  return {
    toolId,
    toolName: TOOL_PRICING[toolId].displayName,
    currentPlanLabel: plan.label,
    recommendedPlanLabel: recommendation?.label ?? null,
    monthlySpendReported: reported,
    monthlySpendAfterRecommendation: Math.max(0, monthlySpendAfterRecommendation),
    monthlySavings,
    annualSavings: Math.round(monthlySavings * 12),
    reasons,
    overspendingDetected: overspending,
    alternativeTool: alt,
  };
}

export function runAuditEngine(form: AuditFormValues): AuditReport {
  const findings: ToolAuditFinding[] = [];
  for (const id of TOOL_IDS) {
    const f = analyzeTool(form, id);
    if (f) findings.push(f);
  }

  const totalMonthlySavings =
    Math.round(findings.reduce((acc, f) => acc + f.monthlySavings, 0) * 100) / 100;

  const totalAnnualSavings = Math.round(totalMonthlySavings * 12);

  const summaryBullets: string[] = [];
  if (form.teamSize <= SMALL_TEAM_MAX) {
    summaryBullets.push("Small teams should prefer individual or business tiers over enterprise contracts.");
  }
  if (form.useCase === "coding") {
    summaryBullets.push("Coding workflows benefit from IDE assistants paired with lighter general chat tiers.");
  }
  if (form.useCase === "data_analysis") {
    summaryBullets.push("Data-heavy work often incurs API overages—validate credits and batch jobs before upgrading plans.");
  }
  if (findings.some((f) => f.reasons.some((r) => r.includes("API usage") || r.includes("API")))) {
    summaryBullets.push("Spikes above list pricing usually mean API or seat sprawl—not a need for a higher tier.");
  }

  return {
    teamSize: form.teamSize,
    useCase: form.useCase,
    findings,
    totalMonthlySavings,
    totalAnnualSavings,
    summaryBullets,
  };
}

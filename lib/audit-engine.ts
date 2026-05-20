import type {
  AuditDimensionSummary,
  AuditFormValues,
  AuditReport,
  ConfidenceLevel,
  RecommendationActionType,
  SpendClassification,
  ToolAuditFinding,
  ToolId,
  ToolPlan,
  UseCase,
} from "./audit-types";
import { PRICING_DATA_AS_OF_ISO, PRICING_REFERENCE, VENDOR_PRICING_PAGE } from "./pricing-sources";
import {
  expectedMonthlyTotal,
  getConfiguredToolIds,
  getPlan,
  isEnterpriseTier,
  isTeamishTier,
  TOOL_PRICING,
} from "./pricing";

const SMALL_TEAM_MAX = 5;
const ENTERPRISE_LOW_SPEND_THRESHOLD = 450;
const MAJOR_ANOMALY_SINGLE_SEAT = 500;
const MAJOR_ANOMALY_PER_SEAT = 350;
/** Minimum modeled savings to recommend a change (avoid noisy micro-recommendations). */
const MIN_RECOMMENDATION_SAVINGS_USD = 12;
/** Minimum savings for spend-ratio (usage/billing) recommendations — slightly lower so mild gaps still surface. */
const MIN_RATIO_OVERSPEND_SAVINGS_USD = 10;

type CandidateRecommendation = {
  actionType: RecommendationActionType;
  recommendedTool: string;
  recommendedPlan: string;
  optimizedSpend: number;
  reasoning: string[];
  confidence: ConfidenceLevel;
};

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** List benchmark for ratio math; null when per-seat list is unavailable (e.g. enterprise custom). */
function resolveBenchmarkSpendMonthly(
  toolId: ToolId,
  planId: string,
  seats: number,
  plan: ToolPlan,
): number | null {
  const total = expectedMonthlyTotal(toolId, planId, seats);
  if (total !== null && total > 0) return roundCurrency(total);
  if (plan.monthlyPerSeat !== null && plan.monthlyPerSeat > 0) {
    return roundCurrency(plan.monthlyPerSeat * Math.max(1, seats));
  }
  return null;
}

function classifySpendRatio(ratio: number): SpendClassification {
  if (ratio <= 1.2) return "Already Optimized";
  if (ratio <= 1.5) return "Mild Optimization Opportunity";
  if (ratio <= 1.75) return "Moderate Overspending";
  if (ratio <= 2) return "Significant Overspending";
  return "Potential Billing Anomaly";
}

const OVERSPEND_RECOVERY_SHARE: Record<SpendClassification, number> = {
  "Already Optimized": 0,
  "Mild Optimization Opportunity": 0.52,
  "Moderate Overspending": 0.72,
  "Significant Overspending": 0.78,
  "Potential Billing Anomaly": 0.84,
};

/** Believable post-optimization spend: blend toward list benchmark without exaggeration or $0 floors. */
function estimateOverspendOptimizedSpend(
  benchmarkSpend: number,
  actualSpend: number,
  classification: SpendClassification,
): number {
  if (actualSpend <= benchmarkSpend) return roundCurrency(actualSpend);
  const share = OVERSPEND_RECOVERY_SHARE[classification] ?? 0.65;
  const excess = actualSpend - benchmarkSpend;
  const blended = actualSpend - excess * share;
  const floor = roundCurrency(benchmarkSpend * 1.03);
  return roundCurrency(Math.max(floor, blended));
}

function buildRatioOverspendCandidate(
  toolId: ToolId,
  currentTool: string,
  plan: ToolPlan,
  seats: number,
  currentSpend: number,
  benchmarkSpend: number,
  classification: SpendClassification,
): CandidateRecommendation | null {
  if (classification === "Already Optimized") return null;
  const optimizedSpend = estimateOverspendOptimizedSpend(
    benchmarkSpend,
    currentSpend,
    classification,
  );
  const savings = currentSpend - optimizedSpend;
  if (savings < MIN_RATIO_OVERSPEND_SAVINGS_USD) return null;

  const ratio = currentSpend / benchmarkSpend;
  const isAnomaly = classification === "Potential Billing Anomaly";
  const actionType: RecommendationActionType = isAnomaly ? "Use Credits" : "Reduce API Spend";
  const reasoning = [
    `Spend is ~${ratio.toFixed(2)}× vs list benchmark (~$${Math.round(benchmarkSpend)}/mo for ${seats} seat${seats === 1 ? "" : "s"} at published rates).`,
    isAnomaly
      ? "Treat as a billing anomaly until reconciled: invoice audit, API caps, add-ons, seat reconciliation, and infrastructure credits."
      : "Typical levers: API overages, unused seats, plan tier vs usage, add-ons, and annual vs monthly billing — align run-rate closer to list before switching vendors.",
    listBenchmarkLine(toolId, plan, seats, benchmarkSpend),
  ];
  const confidence: ConfidenceLevel =
    classification === "Mild Optimization Opportunity"
      ? "Low"
      : classification === "Moderate Overspending"
        ? "Medium"
        : classification === "Significant Overspending"
          ? "Medium"
          : "High";
  return {
    actionType,
    recommendedTool: currentTool,
    recommendedPlan: plan.label,
    optimizedSpend,
    reasoning,
    confidence,
  };
}

function minSavingsForCandidate(actionType: RecommendationActionType): number {
  if (actionType === "Reduce API Spend" || actionType === "Use Credits") {
    return MIN_RATIO_OVERSPEND_SAVINGS_USD;
  }
  return MIN_RECOMMENDATION_SAVINGS_USD;
}

function candidateFromPlan(
  toolId: ToolId,
  planId: string,
  seats: number,
  actionType: RecommendationActionType,
  reasoning: string[],
  confidence: ConfidenceLevel,
): CandidateRecommendation | null {
  const plan = getPlan(toolId, planId);
  if (!plan || plan.monthlyPerSeat === null) return null;
  return {
    actionType,
    recommendedTool: TOOL_PRICING[toolId].displayName,
    recommendedPlan: plan.label,
    optimizedSpend: plan.monthlyPerSeat * seats,
    reasoning,
    confidence,
  };
}

/** Next-cheaper paid tier only — never “downgrade” to Free/Hobby via this path (avoid bogus $∞ savings). */
function findCheaperPlanId(toolId: ToolId, currentPlanId: string): string | null {
  const current = getPlan(toolId, currentPlanId);
  if (!current || current.monthlyPerSeat === null) return null;
  const currentPerSeat = current.monthlyPerSeat;
  const candidates = TOOL_PRICING[toolId].plans.filter((p) => {
    if (p.id === currentPlanId) return false;
    if (p.monthlyPerSeat === null) return false;
    if (p.tier === "free" || p.monthlyPerSeat <= 0) return false;
    return p.monthlyPerSeat < currentPerSeat;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => (a.monthlyPerSeat ?? 0) - (b.monthlyPerSeat ?? 0));
  return candidates[0]?.id ?? null;
}

function findBestNonEnterprisePlanId(toolId: ToolId): string | null {
  const candidates = TOOL_PRICING[toolId].plans.filter(
    (p) => !isEnterpriseTier(p.tier) && p.monthlyPerSeat !== null && p.monthlyPerSeat > 0,
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.monthlyPerSeat ?? 0) - (a.monthlyPerSeat ?? 0));
  return candidates[0]?.id ?? null;
}

function alternativeForUseCase(
  toolId: ToolId,
  useCase: UseCase,
  seats: number,
): { toolId: ToolId; planId: string; reasoning: string[] } | null {
  if (useCase === "coding") {
    if (toolId === "chatgpt" || toolId === "claude") {
      return {
        toolId: "copilot",
        planId: "business",
        reasoning: [
          "At list prices, GitHub Copilot Business is often cheaper per seat than premium chat tiers for pure coding throughput.",
        ],
      };
    }
  }

  if (useCase === "writing" || useCase === "research") {
    if (toolId === "cursor" || toolId === "copilot") {
      return {
        toolId: "chatgpt",
        planId: seats <= 2 ? "plus" : "team",
        reasoning: [
          "Chat-centric tools typically match writing/research workflows; list pricing may beat IDE bundles for non-coding work.",
        ],
      };
    }
  }

  if (useCase === "mixed" || useCase === "data_analysis") {
    if (toolId === "gemini" && seats <= 3) {
      return {
        toolId: "chatgpt",
        planId: "plus",
        reasoning: [
          "For small teams, a single general-purpose chat Plus tier can reduce overlap with multiple premium subscriptions.",
        ],
      };
    }
  }

  return null;
}

function determineMajorAnomaly(
  currentSpend: number,
  benchmarkSpendMonthly: number | null,
  seats: number,
): boolean {
  const ratio =
    benchmarkSpendMonthly !== null && benchmarkSpendMonthly > 0
      ? currentSpend / benchmarkSpendMonthly
      : 0;
  if (ratio > 2) return true;
  const perSeat = currentSpend / Math.max(1, seats);
  if (seats === 1 && currentSpend >= MAJOR_ANOMALY_SINGLE_SEAT) return true;
  if (perSeat >= MAJOR_ANOMALY_PER_SEAT && currentSpend >= 700) return true;
  if (
    benchmarkSpendMonthly !== null &&
    benchmarkSpendMonthly > 0 &&
    currentSpend >= benchmarkSpendMonthly * 3.5
  ) {
    return true;
  }
  return false;
}

function confidenceFromSavings(
  actionType: RecommendationActionType,
  monthlySavings: number,
  majorAnomaly: boolean,
  spendClassification: SpendClassification,
): ConfidenceLevel {
  if (actionType === "Already Optimized") {
    return spendClassification === "Already Optimized" ? "High" : "Medium";
  }
  if (majorAnomaly && actionType === "Use Credits") return "High";
  if (actionType === "Reduce API Spend") {
    if (spendClassification === "Mild Optimization Opportunity") {
      return monthlySavings >= 28 ? "Medium" : "Low";
    }
    if (
      spendClassification === "Moderate Overspending" ||
      spendClassification === "Significant Overspending"
    ) {
      return "Medium";
    }
    if (spendClassification === "Potential Billing Anomaly") return "High";
  }
  if (monthlySavings >= 100) return "High";
  if (monthlySavings >= 30) return "Medium";
  return "Low";
}

function badgesForAction(
  actionType: RecommendationActionType,
  majorAnomaly: boolean,
): RecommendationActionType[] {
  if (actionType === "Already Optimized") return ["Already Optimized"];
  const badges: RecommendationActionType[] = [actionType];
  if (majorAnomaly && actionType !== "Use Credits") badges.push("Use Credits");
  return badges;
}

function optimizationSummary(
  finding: Pick<
    ToolAuditFinding,
    | "actionType"
    | "currentTool"
    | "currentPlan"
    | "recommendedTool"
    | "recommendedPlan"
    | "spendClassification"
  >,
): string {
  switch (finding.actionType) {
    case "Downgrade Plan":
      return `Switch from ${finding.currentTool} ${finding.currentPlan} to ${finding.recommendedTool} ${finding.recommendedPlan}.`;
    case "Alternative Tool":
      return `Switch from ${finding.currentTool} ${finding.currentPlan} to ${finding.recommendedTool} ${finding.recommendedPlan} for a better use-case fit.`;
    case "Optimize Seats":
      return `Reduce unused seats and align paid licenses to active users.`;
    case "Use Credits":
      if (finding.spendClassification === "Potential Billing Anomaly") {
        return "Reconcile invoices and usage first, then use credits, commits, and guardrails to prevent repeat drift above list.";
      }
      return "Use discounted AI infrastructure credits and usage controls to reduce effective spend.";
    case "Reduce API Spend": {
      switch (finding.spendClassification) {
        case "Mild Optimization Opportunity":
          return "Mild gap versus list benchmark — review add-ons, billing setup, and light usage variance before bigger moves.";
        case "Moderate Overspending":
          return "Moderate optimization opportunity — reported spend exceeds expected retail pricing for your seat count.";
        case "Significant Overspending":
          return "Significant gap versus list benchmark — prioritize API usage, seat alignment, tier fit, and add-on audit.";
        default:
          return "Reduce API overages with quotas, caching, and model routing; validate the bill against published list rates.";
      }
    }
    default:
      if (finding.spendClassification !== "Already Optimized") {
        return "Spend sits above list benchmark while structural plan changes are limited — still validate billing and usage drivers.";
      }
      return "Your stack already appears cost-efficient at published list rates.";
  }
}

function listBenchmarkLine(
  toolId: ToolId,
  plan: ToolPlan,
  seats: number,
  expectedSpend: number | null,
): string {
  if (plan.monthlyPerSeat !== null) {
    return `Vendor list benchmark: ~$${plan.monthlyPerSeat}/seat × ${seats} seat${seats === 1 ? "" : "s"} ≈ ~$${plan.monthlyPerSeat * seats}/mo (${VENDOR_PRICING_PAGE[toolId]}).`;
  }
  if (expectedSpend !== null) {
    return `Comparable list spend for this configuration is ~$${expectedSpend}/mo before overages.`;
  }
  return `See vendor list pricing: ${VENDOR_PRICING_PAGE[toolId]}.`;
}

function buildDimensions(
  form: AuditFormValues,
  toolId: ToolId,
  plan: ToolPlan,
  seats: number,
  currentSpend: number,
  majorAnomaly: boolean,
  cheaperPlanId: string | null,
  altCandidate: ReturnType<typeof alternativeForUseCase>,
  altViable: boolean,
  spendRatio: number | null,
): AuditDimensionSummary {
  const vendorUrl = VENDOR_PRICING_PAGE[toolId];

  let planSuitability: string;
  if (isTeamishTier(plan.tier) && seats <= 3) {
    planSuitability = `Team/Business-style tiers are usually priced for shared org workflows; with only ${seats} paid seat${seats === 1 ? "" : "s"}, a lower retail tier often matches utilization (${vendorUrl}).`;
  } else if (isEnterpriseTier(plan.tier) && form.teamSize <= SMALL_TEAM_MAX) {
    planSuitability = `Enterprise contracts are hard to justify on list economics alone for teams of ${form.teamSize} unless you need compliance features (${vendorUrl}).`;
  } else if (seats > form.teamSize && form.teamSize > 0) {
    planSuitability = `Seat count (${seats}) exceeds declared team size (${form.teamSize}), which often signals unused licenses.`;
  } else {
    planSuitability = `Plan tier is plausible for ${seats} seat${seats === 1 ? "" : "s"} and your org size; compare to list tiers on ${vendorUrl}.`;
  }

  let cheaperSameVendor: string;
  if (cheaperPlanId) {
    const p = getPlan(toolId, cheaperPlanId);
    const per = p?.monthlyPerSeat;
    if (p && typeof per === "number") {
      cheaperSameVendor = `Yes — ${p.label} lists at ~$${per}/seat (~$${per * seats}/mo for ${seats} seat${seats === 1 ? "" : "s"}), lower than your current tier at list rates (${vendorUrl}).`;
    } else {
      cheaperSameVendor = `A lower public tier may exist; confirm on ${vendorUrl}.`;
    }
  } else {
    cheaperSameVendor = `No lower public list tier undercuts your current plan’s per-seat rate on this vendor (${vendorUrl}).`;
  }

  let alternativeTool: string;
  if (altCandidate && altViable) {
    const alt = TOOL_PRICING[altCandidate.toolId];
    const ap = getPlan(altCandidate.toolId, altCandidate.planId);
    const apSeat = ap?.monthlyPerSeat;
    const price = typeof apSeat === "number" ? `~$${apSeat}/seat` : "see vendor pricing";
    alternativeTool = `Consider ${alt.displayName} (${altCandidate.planId}): ${price} — may fit your ${form.useCase} use case better than ${TOOL_PRICING[toolId].displayName} at list prices (${VENDOR_PRICING_PAGE[altCandidate.toolId]}).`;
  } else if (altCandidate) {
    alternativeTool = `An alternative exists for ${form.useCase}, but savings at your current spend are too small to recommend a switch credibly.`;
  } else {
    alternativeTool = `No strong alternative mapping for ${form.useCase} at this seat count; focus on tier and usage first.`;
  }

  const creditsVsRetail = majorAnomaly
    ? `Spend is far above list multiples for this configuration — prioritize committed credits, API guardrails, and billing reconciliation before accepting retail run-rate (${PRICING_REFERENCE}).`
    : spendRatio !== null && spendRatio > 1.2
      ? `Your reported run-rate is ~${Math.round((spendRatio - 1) * 100)}% above the computed list benchmark for this seat count — review API overages, add-ons, unused seats, and billing cadence (${PRICING_REFERENCE}).`
      : `Retail list pricing looks consistent with your tier unless you have material API overage; credits help when usage spikes beyond list (${PRICING_REFERENCE}).`;

  return { planSuitability, cheaperSameVendor, alternativeTool, creditsVsRetail };
}

function headlineForSpendClassification(c: SpendClassification): string {
  switch (c) {
    case "Already Optimized":
      return "Spend looks aligned with list benchmarks.";
    case "Mild Optimization Opportunity":
      return "Mild optimization opportunity detected.";
    case "Moderate Overspending":
      return "Moderate optimization opportunity detected.";
    case "Significant Overspending":
      return "Significant overspending versus list benchmark.";
    case "Potential Billing Anomaly":
      return "Potential billing anomaly versus list benchmark.";
  }
}

function oneSentenceReason(finding: ToolAuditFinding): string {
  const fmt = (n: number) => `$${Math.round(n)}`;
  const bench = finding.benchmarkSpendMonthly;
  const benchLabel =
    bench !== null
      ? `${fmt(bench)}/mo list benchmark for your seats`
      : "vendor list pricing for this configuration";

  switch (finding.actionType) {
    case "Downgrade Plan":
      return `Save ${fmt(finding.monthlySavings)}/mo by moving from ${finding.currentPlan} to ${finding.recommendedPlan} at list rates (${fmt(finding.currentSpend)}/mo reported vs ~${fmt(finding.optimizedSpend)}/mo target).`;
    case "Alternative Tool":
      return `Switching to ${finding.recommendedTool} ${finding.recommendedPlan} could save ~${fmt(finding.monthlySavings)}/mo vs your current ${finding.currentTool} spend at published prices.`;
    case "Optimize Seats":
      return `Right-size seats to match active users to cut ~${fmt(finding.monthlySavings)}/mo without changing vendors.`;
    case "Use Credits":
      if (finding.spendClassification === "Potential Billing Anomaly" && bench !== null) {
        return `${headlineForSpendClassification(finding.spendClassification)} ${fmt(finding.currentSpend)}/mo is ~${finding.spendRatio?.toFixed(2) ?? "?"}× ${benchLabel} — model ~${fmt(finding.optimizedSpend)}/mo after reconciliation and credits (~${fmt(finding.monthlySavings)}/mo).`;
      }
      return `Spend is elevated vs list benchmarks — modeled ~${fmt(finding.monthlySavings)}/mo from credits, commits, and usage controls vs paying full retail run-rate.`;
    case "Reduce API Spend": {
      const lead = headlineForSpendClassification(finding.spendClassification);
      return `${lead} Your reported ${fmt(finding.currentSpend)}/mo exceeds expected retail pricing for your seat count (~${bench !== null ? `${fmt(bench)}/mo` : benchLabel}). Recommended action: review API usage, add-ons, and unused seats — modeled run-rate ~${fmt(finding.optimizedSpend)}/mo (~${fmt(finding.monthlySavings)}/mo savings).`;
    }
    default: {
      if (finding.spendClassification !== "Already Optimized" && bench !== null) {
        return `${headlineForSpendClassification(finding.spendClassification)} Reported ${fmt(finding.currentSpend)}/mo vs ~${fmt(bench)}/mo benchmark (~${finding.spendRatio?.toFixed(2) ?? "?"}×) — no stronger list-price lever modeled; still validate invoices and usage.`;
      }
      const benchForAligned =
        bench !== null ? `~${fmt(bench)}/mo list benchmark` : "vendor list pricing";
      return `At ${fmt(finding.currentSpend)}/mo reported vs ${benchForAligned}, this line item looks aligned — no material savings modeled at retail list.`;
    }
  }
}

function analyzeTool(form: AuditFormValues, toolId: ToolId): ToolAuditFinding | null {
  const row = form.tools[toolId];
  if (!row.enabled) return null;

  const plan = getPlan(toolId, row.planId);
  if (!plan) return null;

  const currentTool = TOOL_PRICING[toolId].displayName;
  const seats = Math.max(1, row.seats);
  const currentSpend = Math.max(0, row.monthlySpend);
  const benchmarkSpendMonthly = resolveBenchmarkSpendMonthly(toolId, row.planId, seats, plan);
  const spendRatio =
    benchmarkSpendMonthly !== null && benchmarkSpendMonthly > 0
      ? roundCurrency(currentSpend / benchmarkSpendMonthly)
      : null;
  const spendClassification =
    spendRatio !== null ? classifySpendRatio(spendRatio) : "Already Optimized";
  const majorAnomaly = determineMajorAnomaly(currentSpend, benchmarkSpendMonthly, seats);

  const candidates: CandidateRecommendation[] = [];

  const cheaperPlanId = findCheaperPlanId(toolId, row.planId);
  if (cheaperPlanId && isTeamishTier(plan.tier) && seats <= 3) {
    const cheaperPlan = getPlan(toolId, cheaperPlanId);
    const cheaperSeat = cheaperPlan?.monthlyPerSeat;
    const listNew =
      cheaperPlan && typeof cheaperSeat === "number"
        ? `List math: ${cheaperPlan.label} ≈ $${cheaperSeat}/seat × ${seats} = ~$${cheaperSeat * seats}/mo before tax.`
        : "";
    const c = candidateFromPlan(
      toolId,
      cheaperPlanId,
      seats,
      "Downgrade Plan",
      [
        listNew,
        `Team/Business tier is often more than small seat counts need at published list prices.`,
        listBenchmarkLine(toolId, plan, seats, benchmarkSpendMonthly),
      ].filter(Boolean),
      "High",
    );
    if (c) candidates.push(c);
  }

  if (isEnterpriseTier(plan.tier) && form.teamSize <= SMALL_TEAM_MAX && currentSpend < 1200) {
    const nonEnterprisePlanId = findBestNonEnterprisePlanId(toolId);
    if (nonEnterprisePlanId) {
      const nep = getPlan(toolId, nonEnterprisePlanId);
      const nepSeat = nep?.monthlyPerSeat;
      const listNew =
        nep && typeof nepSeat === "number"
          ? `Downgrade target at list: ${nep.label} ≈ $${nepSeat}/seat × ${seats} ≈ $${nepSeat * seats}/mo.`
          : "";
      const c = candidateFromPlan(
        toolId,
        nonEnterprisePlanId,
        seats,
        "Downgrade Plan",
        [
          listNew,
          `Enterprise list economics rarely fit teams of ${form.teamSize} unless you require enterprise features.`,
          `Spend under ~$${ENTERPRISE_LOW_SPEND_THRESHOLD}/mo is a common signal to avoid enterprise list tiers.`,
        ],
        "High",
      );
      if (c) candidates.push(c);
    }
  }

  if (seats > form.teamSize && form.teamSize > 0) {
    const perSeat = plan.monthlyPerSeat ?? Math.max(10, currentSpend / seats);
    candidates.push({
      actionType: "Optimize Seats",
      recommendedTool: currentTool,
      recommendedPlan: plan.label,
      optimizedSpend: perSeat * form.teamSize,
      reasoning: [
        `You report ${seats} paid seats vs team size ${form.teamSize}; trimming ${seats - form.teamSize} inactive seat${seats - form.teamSize === 1 ? "" : "s"} saves at ~$${Math.round(perSeat)}/seat/mo at list.`,
        listBenchmarkLine(toolId, plan, seats, benchmarkSpendMonthly),
      ],
      confidence: "High",
    });
  }

  const altCandidate = alternativeForUseCase(toolId, form.useCase, seats);
  let altViable = false;
  if (altCandidate) {
    const altPlan = getPlan(altCandidate.toolId, altCandidate.planId);
    const altPerSeat = altPlan?.monthlyPerSeat;
    if (typeof altPerSeat === "number") {
      const altSpend = altPerSeat * seats;
      const savingsVsCurrent = currentSpend - altSpend;
      altViable = savingsVsCurrent >= MIN_RECOMMENDATION_SAVINGS_USD;
      if (altViable) {
        candidates.push({
          actionType: "Alternative Tool",
          recommendedTool: TOOL_PRICING[altCandidate.toolId].displayName,
          recommendedPlan: altPlan?.label ?? altCandidate.planId,
          optimizedSpend: altSpend,
          reasoning: [
            ...altCandidate.reasoning,
            `${TOOL_PRICING[altCandidate.toolId].displayName} ${altPlan?.label ?? ""} lists ~$${altPerSeat}/seat × ${seats} ≈ $${altSpend}/mo vs your ~$${currentSpend}/mo here.`,
          ],
          confidence: "Medium",
        });
      }
    }
  }

  if (majorAnomaly || (currentSpend >= 2000 && isEnterpriseTier(plan.tier))) {
    const floorSpend = benchmarkSpendMonthly ?? currentSpend * 0.85;
    candidates.push({
      actionType: "Use Credits",
      recommendedTool: currentTool,
      recommendedPlan: plan.label,
      optimizedSpend: Math.max(floorSpend, currentSpend * 0.85),
      reasoning: [
        `Reported ~$${Math.round(currentSpend)}/mo is materially above typical list multiples for this tier — negotiate credits and audit API/seat sprawl.`,
        listBenchmarkLine(toolId, plan, seats, benchmarkSpendMonthly),
      ],
      confidence: "Medium",
    });
  }

  if (benchmarkSpendMonthly !== null && benchmarkSpendMonthly > 0) {
    const ratioCand = buildRatioOverspendCandidate(
      toolId,
      currentTool,
      plan,
      seats,
      currentSpend,
      benchmarkSpendMonthly,
      spendClassification,
    );
    if (ratioCand) candidates.push(ratioCand);
  }

  let chosen: CandidateRecommendation | null = null;
  let bestSavings = 0;
  for (const candidate of candidates) {
    const savings = currentSpend - candidate.optimizedSpend;
    const min = minSavingsForCandidate(candidate.actionType);
    if (savings >= min && savings > bestSavings) {
      bestSavings = savings;
      chosen = candidate;
    }
  }

  if (!chosen) {
    chosen = {
      actionType: "Already Optimized",
      recommendedTool: currentTool,
      recommendedPlan: plan.label,
      optimizedSpend: currentSpend,
      reasoning: [
        listBenchmarkLine(toolId, plan, seats, benchmarkSpendMonthly),
        `${PRICING_REFERENCE}`,
      ],
      confidence: "High",
    };
  } else if (
    chosen.actionType === "Alternative Tool" &&
    chosen.optimizedSpend > currentSpend - MIN_RECOMMENDATION_SAVINGS_USD
  ) {
    chosen = {
      actionType: "Already Optimized",
      recommendedTool: currentTool,
      recommendedPlan: plan.label,
      optimizedSpend: currentSpend,
      reasoning: [
        "Alternative tooling may fit, but the financial gain is below our reporting threshold.",
        listBenchmarkLine(toolId, plan, seats, benchmarkSpendMonthly),
      ],
      confidence: "Medium",
    };
  }

  const monthlySavings = roundCurrency(Math.max(0, currentSpend - chosen.optimizedSpend));
  const annualSavings = Math.round(monthlySavings * 12);
  const confidenceLevel = confidenceFromSavings(
    chosen.actionType,
    monthlySavings,
    majorAnomaly,
    spendClassification,
  );

  const dimensions = buildDimensions(
    form,
    toolId,
    plan,
    seats,
    currentSpend,
    majorAnomaly,
    cheaperPlanId,
    altCandidate,
    altViable,
    spendRatio,
  );

  const pricingAnomaly = majorAnomaly || spendClassification === "Potential Billing Anomaly";

  const finding: ToolAuditFinding = {
    toolId,
    currentTool,
    currentPlan: plan.label,
    recommendedTool: chosen.recommendedTool,
    recommendedPlan: chosen.recommendedPlan,
    actionType: chosen.actionType,
    benchmarkSpendMonthly,
    spendRatio,
    spendClassification,
    currentSpend: roundCurrency(currentSpend),
    optimizedSpend: roundCurrency(Math.max(0, chosen.optimizedSpend)),
    monthlySavings,
    annualSavings,
    confidenceLevel,
    oneSentenceReason: "",
    reasoning: chosen.reasoning.slice(0, 3),
    optimizationSummary: "",
    dimensions,
    potentialPricingAnomaly: pricingAnomaly,
    recommendationBadges: badgesForAction(chosen.actionType, majorAnomaly),
  };
  finding.optimizationSummary = optimizationSummary(finding);
  finding.oneSentenceReason = oneSentenceReason(finding);

  return finding;
}

function buildReportExecutiveSummary(
  findings: ToolAuditFinding[],
  useCase: UseCase,
  totalMonthlySavings: number,
): string {
  const downgradeCount = findings.filter((f) => f.actionType === "Downgrade Plan").length;
  const altCount = findings.filter((f) => f.actionType === "Alternative Tool").length;
  const creditCount = findings.filter((f) => f.actionType === "Use Credits").length;
  const apiCount = findings.filter((f) => f.actionType === "Reduce API Spend").length;
  const optimizedCount = findings.filter((f) => f.actionType === "Already Optimized").length;

  if (totalMonthlySavings < 25 || optimizedCount === findings.length) {
    return "Your spend is aligned with expected list-price benchmarks for your team size and tool mix.";
  }
  if (creditCount > 0) {
    return "A meaningful share of spend appears tied to run-rate billing above list multiples; committed credits and usage controls are the primary financial lever.";
  }
  if (apiCount >= 2 || (apiCount > 0 && downgradeCount === 0 && creditCount === 0)) {
    return "Several tools show run-rate spend above expected list benchmarks for reported seats — usage, add-ons, and seat alignment usually recover margin before switching vendors.";
  }
  if (downgradeCount >= 2) {
    return "Most savings opportunities come from overprovisioned premium plans relative to published list tiers.";
  }
  if (altCount > 0 && useCase === "coding") {
    return "Your stack is moderately optimized; consolidating coding spend into IDE-native tools can reduce overlap with premium chat tiers.";
  }
  return "Your AI stack appears moderately optimized with a few actionable, list-price-backed improvements.";
}

export function runAuditEngine(form: AuditFormValues): AuditReport {
  const findings = getConfiguredToolIds().map((id) => analyzeTool(form, id)).filter(
    (finding): finding is ToolAuditFinding => Boolean(finding),
  );

  const totalMonthlySavings = roundCurrency(
    findings.reduce((total, finding) => total + finding.monthlySavings, 0),
  );
  const totalAnnualSavings = Math.round(totalMonthlySavings * 12);
  const isMostlyOptimized = totalMonthlySavings < 25;

  const summaryBullets: string[] = [];
  const downgradeCount = findings.filter((f) => f.actionType === "Downgrade Plan").length;
  const seatCount = findings.filter((f) => f.actionType === "Optimize Seats").length;
  const altCount = findings.filter((f) => f.actionType === "Alternative Tool").length;
  const creditCount = findings.filter((f) => f.actionType === "Use Credits").length;
  const apiOptCount = findings.filter((f) => f.actionType === "Reduce API Spend").length;

  if (downgradeCount > 0) {
    summaryBullets.push(
      `${downgradeCount} tool${downgradeCount > 1 ? "s sit" : " sits"} on higher list tiers than seat count and usage likely warrant.`,
    );
  }
  if (seatCount > 0) {
    summaryBullets.push(
      `${seatCount} line item${seatCount > 1 ? "s" : ""} show paid seats above declared team size.`,
    );
  }
  if (altCount > 0) {
    summaryBullets.push(
      `${altCount} workload${altCount > 1 ? "s" : ""} may be cheaper on a better-fit tool at published list prices.`,
    );
  }
  if (creditCount > 0) {
    summaryBullets.push("Run-rate spend suggests reviewing infrastructure credits and API governance.");
  }
  if (apiOptCount > 0) {
    summaryBullets.push(
      `${apiOptCount} line item${apiOptCount > 1 ? "s" : ""} exceed expected list pricing for reported seats — review usage, add-ons, and billing.`,
    );
  }
  if (isMostlyOptimized) {
    summaryBullets.push("Overall, your stack already appears cost-efficient at list benchmarks.");
  }

  return {
    companyName: form.companyName,
    role: form.role,
    teamSize: form.teamSize,
    useCase: form.useCase,
    findings,
    totalMonthlySavings,
    totalAnnualSavings,
    executiveSummary: buildReportExecutiveSummary(findings, form.useCase, totalMonthlySavings),
    summaryBullets,
    isMostlyOptimized,
    pricingDataAsOf: PRICING_DATA_AS_OF_ISO,
    pricingDataReference: PRICING_REFERENCE,
  };
}

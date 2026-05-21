import type { AuditPricingSnapshot, ToolId, ToolPlan, ToolPricing } from "./audit-types";
import { PRICING_DATA_AS_OF_ISO, PRICING_REFERENCE, VENDOR_PRICING_PAGE } from "./pricing-sources";

export const TOOL_PRICING: Record<ToolId, ToolPricing> = {
  chatgpt: {
    id: "chatgpt",
    displayName: "ChatGPT",
    plans: [
      {
        id: "free",
        label: "Free",
        monthlyPerSeat: 0,
        tier: "free",
      },
      {
        id: "plus",
        label: "Plus",
        monthlyPerSeat: 15,
        tier: "individual",
      },
      {
        id: "team",
        label: "Team",
        monthlyPerSeat: 25,
        tier: "team",
      },
      {
        id: "enterprise",
        label: "Enterprise",
        monthlyPerSeat: null,
        tier: "enterprise",
      },
    ],
  },
  claude: {
    id: "claude",
    displayName: "Claude",
    plans: [
      {
        id: "free",
        label: "Free",
        monthlyPerSeat: 0,
        tier: "free",
      },
      {
        id: "pro",
        label: "Pro",
        monthlyPerSeat: 20,
        tier: "individual",
      },
      {
        id: "team",
        label: "Team",
        monthlyPerSeat: 30,
        tier: "team",
      },
      {
        id: "enterprise",
        label: "Enterprise",
        monthlyPerSeat: null,
        tier: "enterprise",
      },
    ],
  },
  cursor: {
    id: "cursor",
    displayName: "Cursor",
    plans: [
      {
        id: "hobby",
        label: "Hobby",
        monthlyPerSeat: 0,
        tier: "free",
      },
      {
        id: "pro",
        label: "Pro",
        monthlyPerSeat: 10,
        tier: "individual",
      },
      {
        id: "business",
        label: "Business",
        monthlyPerSeat: 40,
        tier: "team",
      },
    ],
  },
  copilot: {
    id: "copilot",
    displayName: "GitHub Copilot",
    plans: [
      {
        id: "free",
        label: "Free trial / limited",
        monthlyPerSeat: 0,
        tier: "free",
      },
      {
        id: "individual",
        label: "Individual",
        monthlyPerSeat: 10,
        tier: "individual",
      },
      {
        id: "business",
        label: "Business",
        monthlyPerSeat: 19,
        tier: "team",
      },
      {
        id: "enterprise",
        label: "Enterprise",
        monthlyPerSeat: 39,
        tier: "enterprise",
      },
    ],
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini (Google AI)",
    plans: [
      {
        id: "free",
        label: "Free",
        monthlyPerSeat: 0,
        tier: "free",
      },
      {
        id: "google_ai_pro",
        label: "Google AI Pro",
        monthlyPerSeat: 20,
        tier: "individual",
      },
      {
        id: "ultra",
        label: "Ultra / Advanced",
        monthlyPerSeat: 250,
        tier: "individual",
      },
      {
        id: "workspace_enterprise",
        label: "Workspace / Enterprise",
        monthlyPerSeat: null,
        tier: "enterprise",
      },
    ],
  },
};

export function getDefaultPlanId(toolId: ToolId): string {
  const plans = TOOL_PRICING[toolId].plans;
  const paid = plans.find((p) => p.monthlyPerSeat !== null && p.monthlyPerSeat > 0);
  return paid?.id ?? plans[0]?.id ?? "free";
}

export function getPlan(toolId: ToolId, planId: string): ToolPlan | undefined {
  return TOOL_PRICING[toolId].plans.find((p) => p.id === planId);
}

/** Expected monthly total for per-seat plans; null if enterprise/custom */
export function expectedMonthlyTotal(
  toolId: ToolId,
  planId: string,
  seats: number,
): number | null {
  const plan = getPlan(toolId, planId);
  if (!plan || plan.monthlyPerSeat === null) return null;
  return plan.monthlyPerSeat * Math.max(1, seats);
}

export function isTeamishTier(tier: ToolPlan["tier"]): boolean {
  return tier === "team";
}

export function isEnterpriseTier(tier: ToolPlan["tier"]): boolean {
  return tier === "enterprise";
}

/** Live benchmark catalog tool ids (keys of `TOOL_PRICING`). */
export function getConfiguredToolIds(): ToolId[] {
  return Object.keys(TOOL_PRICING) as ToolId[];
}

export function isConfiguredToolId(value: string): value is ToolId {
  return Object.prototype.hasOwnProperty.call(TOOL_PRICING, value);
}

export function getToolDisplayName(toolId: string): string {
  return isConfiguredToolId(toolId) ? TOOL_PRICING[toolId].displayName : toolId;
}

export function getPlanDisplayLabel(toolId: string, planId: string): string {
  return isConfiguredToolId(toolId) ? (getPlan(toolId, planId)?.label ?? planId) : planId;
}

/** Deep copy of current list-price benchmarks + metadata for Supabase `pricing_snapshot`. */
export function buildAuditPricingSnapshot(): AuditPricingSnapshot {
  return {
    tools: structuredClone(TOOL_PRICING),
    pricingDataAsOf: PRICING_DATA_AS_OF_ISO,
    pricingDataReference: PRICING_REFERENCE,
    vendorPricingPages: structuredClone(VENDOR_PRICING_PAGE),
  };
}

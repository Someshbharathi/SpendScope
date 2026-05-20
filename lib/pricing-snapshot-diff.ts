import type { ToolId, ToolPlan } from "./audit-types";
import {
  getConfiguredToolIds,
  getPlanDisplayLabel,
  getToolDisplayName,
  isConfiguredToolId,
  TOOL_PRICING,
} from "./pricing";

/** One plan whose list `monthlyPerSeat` changed between snapshot and current benchmark. */
export type PlanPriceChange = {
  tool: string;
  plan: string;
  old_price: number | null;
  new_price: number | null;
};

/** Same as `PlanPriceChange` with labels resolved from the live benchmark catalog. */
export type EnrichedPlanPriceChange = PlanPriceChange & {
  tool_display_name: string;
  plan_label: string;
};

function normalizeMonthlyPerSeat(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function samePrice(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a === b;
}

function indexPlansById(plans: unknown): Map<string, ToolPlan> {
  const map = new Map<string, ToolPlan>();
  if (!Array.isArray(plans)) return map;
  for (const raw of plans) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Partial<ToolPlan>;
    if (typeof p.id !== "string") continue;
    map.set(p.id, {
      id: p.id,
      label: typeof p.label === "string" ? p.label : p.id,
      monthlyPerSeat: normalizeMonthlyPerSeat(p.monthlyPerSeat),
      tier:
        p.tier === "free" ||
        p.tier === "individual" ||
        p.tier === "team" ||
        p.tier === "enterprise"
          ? p.tier
          : "free",
    });
  }
  return map;
}

/** Union of catalog tool ids and keys present on a stored snapshot (catalog-only diff). */
export function getToolIdsForPricingDiff(snapshotTools: unknown): ToolId[] {
  const ids = new Set<ToolId>(getConfiguredToolIds());
  if (snapshotTools && typeof snapshotTools === "object") {
    for (const key of Object.keys(snapshotTools as object)) {
      if (isConfiguredToolId(key)) ids.add(key);
    }
  }
  return [...ids].sort();
}

/**
 * Compare stored `pricing_snapshot.tools` to live `TOOL_PRICING`.
 * Iterates the benchmark catalog dynamically; only plan ids on both sides; `monthlyPerSeat` only.
 */
export function diffSnapshotToolsAgainstCurrent(snapshotTools: unknown): PlanPriceChange[] {
  if (!snapshotTools || typeof snapshotTools !== "object") return [];

  const changes: PlanPriceChange[] = [];

  for (const toolId of getToolIdsForPricingDiff(snapshotTools)) {
    const currentTool = TOOL_PRICING[toolId];
    const snapEntry = (snapshotTools as Record<string, unknown>)[toolId];
    if (!snapEntry || typeof snapEntry !== "object") continue;

    const snapPlans = indexPlansById((snapEntry as { plans?: unknown }).plans);

    for (const currentPlan of currentTool.plans) {
      const snapPlan = snapPlans.get(currentPlan.id);
      if (!snapPlan) continue;

      const oldPrice = normalizeMonthlyPerSeat(snapPlan.monthlyPerSeat);
      const newPrice = normalizeMonthlyPerSeat(currentPlan.monthlyPerSeat);

      if (!samePrice(oldPrice, newPrice)) {
        changes.push({
          tool: toolId,
          plan: currentPlan.id,
          old_price: oldPrice,
          new_price: newPrice,
        });
      }
    }
  }

  return changes;
}

export function enrichPlanPriceChanges(changes: PlanPriceChange[]): EnrichedPlanPriceChange[] {
  return changes.map((c) => ({
    ...c,
    tool_display_name: getToolDisplayName(c.tool),
    plan_label: getPlanDisplayLabel(c.tool, c.plan),
  }));
}

/** Unique tool ids from detected price changes (sorted). */
export function getAffectedToolIdsFromChanges(changes: PlanPriceChange[]): string[] {
  return [...new Set(changes.map((c) => c.tool))].sort();
}

/** Display names for affected tools, derived from the benchmark catalog. */
export function getAffectedToolLabelsFromChanges(changes: PlanPriceChange[]): string[] {
  return getAffectedToolIdsFromChanges(changes).map((id) => getToolDisplayName(id));
}

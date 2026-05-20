import { TOOL_IDS, type ToolId, type ToolPlan } from "./audit-types";
import { TOOL_PRICING } from "./pricing";

/** One plan whose list `monthlyPerSeat` changed between snapshot and current benchmark. */
export type PlanPriceChange = {
  tool: ToolId;
  plan: string;
  old_price: number | null;
  new_price: number | null;
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

/**
 * Compare a stored `pricing_snapshot.tools` object to live `TOOL_PRICING`.
 * Only considers plan IDs that exist on **both** sides (ignores new/removed plans).
 * Detects differences in `monthlyPerSeat` only.
 */
export function diffSnapshotToolsAgainstCurrent(snapshotTools: unknown): PlanPriceChange[] {
  if (!snapshotTools || typeof snapshotTools !== "object") return [];

  const changes: PlanPriceChange[] = [];

  for (const toolId of TOOL_IDS) {
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

export type AuditPricingChangeRow = {
  audit_id: string;
  affected_tools: ToolId[];
  changes: PlanPriceChange[];
};

export function buildAuditPricingChangeRow(
  auditId: string,
  changes: PlanPriceChange[],
): AuditPricingChangeRow {
  const affected = [...new Set(changes.map((c) => c.tool))];
  affected.sort();
  return {
    audit_id: auditId,
    affected_tools: affected,
    changes,
  };
}

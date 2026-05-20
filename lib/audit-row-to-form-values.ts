import type { AuditFormValues, EnabledToolPayload, ToolId, UseCase } from "./audit-types";
import { TOOL_IDS, USE_CASES } from "./audit-types";
import { getDefaultPlanId, getPlan } from "./pricing";

function isUseCase(v: unknown): v is UseCase {
  return typeof v === "string" && (USE_CASES as readonly string[]).includes(v);
}

/**
 * Reconstruct `AuditFormValues` from a persisted `audits` row so `runAuditEngine` can rerun with current pricing.
 */
export function parseAuditRowToFormValues(row: {
  email?: unknown;
  company_name?: unknown;
  role?: unknown;
  team_size?: unknown;
  tools_json?: unknown;
}): AuditFormValues | null {
  const email = typeof row.email === "string" ? row.email.trim() : "";
  const companyName = typeof row.company_name === "string" ? row.company_name.trim() : "";
  const role = typeof row.role === "string" ? row.role.trim() : "";
  const teamSize =
    typeof row.team_size === "number" && Number.isFinite(row.team_size)
      ? Math.max(1, Math.round(row.team_size))
      : 5;

  if (!email || !companyName || !role) return null;

  const toolsJson = row.tools_json;
  if (!toolsJson || typeof toolsJson !== "object") return null;

  const useCase = isUseCase((toolsJson as { useCase?: unknown }).useCase)
    ? (toolsJson as { useCase: UseCase }).useCase
    : "mixed";

  const enabledToolsRaw = (toolsJson as { enabledTools?: unknown }).enabledTools;
  if (!Array.isArray(enabledToolsRaw) || enabledToolsRaw.length === 0) return null;

  const tools = {} as AuditFormValues["tools"];
  for (const id of TOOL_IDS) {
    tools[id] = {
      enabled: false,
      planId: getDefaultPlanId(id),
      monthlySpend: 0,
      seats: 1,
    };
  }

  for (const raw of enabledToolsRaw) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Partial<EnabledToolPayload>;
    const toolId = e.toolId;
    if (typeof toolId !== "string" || !(TOOL_IDS as readonly string[]).includes(toolId)) continue;

    const tid = toolId as ToolId;
    const rawPlan = typeof e.planId === "string" ? e.planId : getDefaultPlanId(tid);
    const planId = getPlan(tid, rawPlan) ? rawPlan : getDefaultPlanId(tid);
    const monthlySpend =
      typeof e.monthlySpend === "number" && Number.isFinite(e.monthlySpend)
        ? Math.max(0, e.monthlySpend)
        : 0;
    const seats =
      typeof e.seats === "number" && Number.isFinite(e.seats) ? Math.max(1, Math.round(e.seats)) : 1;

    tools[tid] = {
      enabled: true,
      planId,
      monthlySpend,
      seats,
    };
  }

  const anyEnabled = TOOL_IDS.some((id) => tools[id].enabled);
  if (!anyEnabled) return null;

  return {
    email,
    companyName,
    role,
    teamSize,
    useCase,
    tools,
  };
}

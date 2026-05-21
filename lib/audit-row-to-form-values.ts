import type { AuditFormValues, EnabledToolPayload, ToolId, UseCase } from "./audit-types";
import { USE_CASES } from "./audit-types";
import { parseStoredAuditReport } from "./audit-rerun-diff";
import {
  getConfiguredToolIds,
  getDefaultPlanId,
  getPlan,
  getToolDisplayName,
  isConfiguredToolId,
  TOOL_PRICING,
} from "./pricing";

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
  for (const id of getConfiguredToolIds()) {
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
    if (typeof toolId !== "string" || !isConfiguredToolId(toolId)) continue;

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

  const anyEnabled = getConfiguredToolIds().some((id) => tools[id].enabled);
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

function planIdFromFindingLabel(toolId: ToolId, currentPlanLabel: string): string {
  const label = currentPlanLabel.trim();
  const match = TOOL_PRICING[toolId].plans.find(
    (p) => p.label.toLowerCase() === label.toLowerCase() || p.id.toLowerCase() === label.toLowerCase(),
  );
  return match?.id ?? getDefaultPlanId(toolId);
}

/** Rebuild `tools_json.enabledTools` from stored engine output when legacy rows omit the array. */
function toolsJsonFromStoredResults(
  toolsJson: unknown,
  resultsJson: unknown,
): { useCase: UseCase; enabledTools: EnabledToolPayload[] } | null {
  if (toolsJson && typeof toolsJson === "object") {
    const useCase = isUseCase((toolsJson as { useCase?: unknown }).useCase)
      ? (toolsJson as { useCase: UseCase }).useCase
      : "mixed";
    const enabledToolsRaw = (toolsJson as { enabledTools?: unknown }).enabledTools;
    if (Array.isArray(enabledToolsRaw) && enabledToolsRaw.length > 0) {
      return { useCase, enabledTools: enabledToolsRaw as EnabledToolPayload[] };
    }
  }

  const report = parseStoredAuditReport(resultsJson);
  if (!report) return null;

  const enabledTools: EnabledToolPayload[] = [];
  for (const finding of report.findings) {
    if (!isConfiguredToolId(finding.toolId)) continue;
    const toolId = finding.toolId;
    const planId = planIdFromFindingLabel(toolId, finding.currentPlan);
    const plan = getPlan(toolId, planId);
    enabledTools.push({
      toolId,
      toolName: getToolDisplayName(toolId),
      planId,
      planLabel: plan?.label ?? finding.currentPlan,
      monthlySpend: Math.max(0, finding.currentSpend),
      seats: 1,
    });
  }

  if (enabledTools.length === 0) return null;

  const useCase = isUseCase(report.useCase) ? report.useCase : "mixed";
  return { useCase, enabledTools };
}

/**
 * Lenient parser for `/re-audit/[id]`: fills missing identity fields and can rebuild
 * `tools_json` from `results_json` so rows that still have a valid share report load.
 */
export function parseAuditRowToFormValuesForReaudit(row: {
  email?: unknown;
  company_name?: unknown;
  role?: unknown;
  team_size?: unknown;
  tools_json?: unknown;
  results_json?: unknown;
}): AuditFormValues | null {
  const email =
    typeof row.email === "string" && row.email.trim().length > 0
      ? row.email.trim()
      : "reaudit@spendscope.app";
  const companyName =
    typeof row.company_name === "string" && row.company_name.trim().length > 0
      ? row.company_name.trim()
      : "Your company";
  const role =
    typeof row.role === "string" && row.role.trim().length > 0 ? row.role.trim() : "Team member";

  const toolsJson = toolsJsonFromStoredResults(row.tools_json, row.results_json);
  if (!toolsJson) return null;

  return parseAuditRowToFormValues({
    email,
    company_name: companyName,
    role,
    team_size: row.team_size,
    tools_json: toolsJson,
  });
}

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AuditFormValues,
  AuditInsertPayload,
  AuditReport,
  EnabledToolPayload,
} from "./audit-types";
import { buildAuditPricingSnapshot, getConfiguredToolIds, getPlan, TOOL_PRICING } from "./pricing";

export function getEnabledToolsPayload(values: AuditFormValues): EnabledToolPayload[] {
  const enabledTools: EnabledToolPayload[] = [];

  for (const toolId of getConfiguredToolIds()) {
    const tool = values.tools[toolId];
    if (!tool?.enabled) continue;

    const plan = getPlan(toolId, tool.planId);
    enabledTools.push({
      toolId,
      toolName: TOOL_PRICING[toolId].displayName,
      planId: tool.planId,
      planLabel: plan?.label ?? tool.planId,
      monthlySpend: Math.max(0, tool.monthlySpend),
      seats: Math.max(1, Math.round(tool.seats)),
    });
  }

  return enabledTools;
}

export function buildAuditInsertPayload(
  values: AuditFormValues,
  report: AuditReport,
  shareId: string,
): AuditInsertPayload {
  const enabledTools = getEnabledToolsPayload(values);
  return {
    email: values.email.trim(),
    company_name: values.companyName.trim(),
    role: values.role.trim(),
    team_size: Math.max(1, Math.round(values.teamSize)),
    tools_json: {
      useCase: values.useCase,
      enabledTools,
    },
    results_json: report,
    share_id: shareId,
    pricing_snapshot: buildAuditPricingSnapshot(),
  };
}

type InsertAuditResult =
  | { ok: true; id: string | null; shareId: string }
  | { ok: false; message: string };

export async function insertAuditRow(
  supabase: SupabaseClient,
  payload: AuditInsertPayload,
): Promise<InsertAuditResult> {
  // Avoid .select() after insert: with RLS enabled and no SELECT policy for anon,
  // Postgres would filter RETURNING rows and PostgREST can surface insert failures.
  const { error } = await supabase.from("audits").insert([payload]);

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    id: null,
    shareId: payload.share_id,
  };
}

export function generateShareId(): string {
  return crypto.randomUUID();
}

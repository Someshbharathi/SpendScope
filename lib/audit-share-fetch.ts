import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuditReport, UseCase } from "./audit-types";

/**
 * Public share pages use the anon Supabase client. Ensure RLS (or a secure API route) allows
 * `SELECT` on `audits` for rows matched by `share_id` only—never expose unrelated rows.
 */

/** Row shape returned from `audits` for share links */
export type AuditShareRow = {
  id: string;
  share_id: string;
  company_name: string;
  role: string;
  team_size: number;
  tools_json: {
    useCase?: UseCase;
    enabledTools?: unknown[];
  } | null;
  results_json: AuditReport | null;
  created_at?: string | null;
};

function isUuidLike(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function fetchAuditByShareId(
  supabase: SupabaseClient,
  shareId: string,
): Promise<AuditShareRow | null> {
  const trimmed = shareId.trim();
  if (!trimmed || !isUuidLike(trimmed)) return null;

  const { data, error } = await supabase
    .from("audits")
    .select("id, share_id, company_name, role, team_size, tools_json, results_json, created_at")
    .eq("share_id", trimmed)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  if (typeof row.share_id !== "string" || typeof row.company_name !== "string") return null;

  return {
    id: String(row.id ?? ""),
    share_id: row.share_id,
    company_name: row.company_name,
    role: typeof row.role === "string" ? row.role : "",
    team_size: typeof row.team_size === "number" && Number.isFinite(row.team_size) ? row.team_size : 0,
    tools_json: (row.tools_json as AuditShareRow["tools_json"]) ?? null,
    results_json: (row.results_json as AuditReport | null) ?? null,
    created_at: row.created_at != null ? String(row.created_at) : null,
  };
}

export function parseShareReport(row: AuditShareRow): AuditReport | null {
  const r = row.results_json;
  if (!r || typeof r !== "object") return null;
  if (!Array.isArray((r as AuditReport).findings)) return null;
  return r as AuditReport;
}

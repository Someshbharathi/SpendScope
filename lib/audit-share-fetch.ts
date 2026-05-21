import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuditReport, UseCase } from "./audit-types";

/**
 * Public share pages load audits via RPC `get_audit_by_share_id` (SECURITY DEFINER).
 * Direct `SELECT` on `audits` stays denied for anon under RLS so the table cannot be enumerated.
 */

/** Row shape returned from `audits` for share / re-audit links */
export type AuditShareRow = {
  id: string;
  share_id: string;
  company_name: string;
  role: string;
  team_size: number;
  email: string;
  tools_json: {
    useCase?: UseCase;
    enabledTools?: unknown[];
  } | null;
  results_json: AuditReport | null;
  pricing_snapshot: unknown;
  created_at?: string | null;
};

/** Validates share link IDs stored as UUIDs on audit rows. */
export function isValidShareIdFormat(id: string): boolean {
  const trimmed = id.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
}

export async function fetchAuditByShareId(
  supabase: SupabaseClient,
  shareId: string,
): Promise<AuditShareRow | null> {
  const trimmed = shareId.trim();
  if (!trimmed || !isValidShareIdFormat(trimmed)) return null;

  const { data, error } = await supabase.rpc("get_audit_by_share_id", {
    p_share_id: trimmed,
  });

  if (error || data == null) return null;

  const rowRaw = Array.isArray(data) ? data[0] : data;
  if (!rowRaw || typeof rowRaw !== "object") return null;

  const row = rowRaw as Record<string, unknown>;
  const resolvedShareId = row.share_id != null ? String(row.share_id).trim() : "";
  if (!resolvedShareId) return null;

  return {
    id: String(row.id ?? ""),
    share_id: resolvedShareId,
    company_name: typeof row.company_name === "string" ? row.company_name : "",
    role: typeof row.role === "string" ? row.role : "",
    team_size: typeof row.team_size === "number" && Number.isFinite(row.team_size) ? row.team_size : 0,
    email: typeof row.email === "string" ? row.email.trim() : "",
    tools_json: (row.tools_json as AuditShareRow["tools_json"]) ?? null,
    results_json: (row.results_json as AuditReport | null) ?? null,
    pricing_snapshot: row.pricing_snapshot ?? null,
    created_at: row.created_at != null ? String(row.created_at) : null,
  };
}

export function parseShareReport(row: AuditShareRow): AuditReport | null {
  const r = row.results_json;
  if (!r || typeof r !== "object") return null;
  if (!Array.isArray((r as AuditReport).findings)) return null;
  return r as AuditReport;
}

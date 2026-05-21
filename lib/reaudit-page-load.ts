import { fetchAuditByShareId, isValidShareIdFormat, type AuditShareRow } from "@/lib/audit-share-fetch";
import { buildReauditComparisonPayload, type ReauditComparisonPayload } from "@/lib/reaudit-comparison";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReauditLoadFailure =
  | "invalid_id"
  | "row_not_found"
  | "comparison_unavailable";

export type ReauditLoadResult =
  | { ok: true; row: AuditShareRow; payload: ReauditComparisonPayload }
  | { ok: false; failure: ReauditLoadFailure; shareIdPrefix: string };

function shareIdPrefix(id: string): string {
  return id.length >= 8 ? id.slice(0, 8) : id;
}

/**
 * Load audit row + comparison payload for `/re-audit/[id]`.
 * `id` must be the public share UUID (same value as email `reaudit_url` paths).
 */
export async function loadReauditComparison(
  supabase: SupabaseClient,
  rawId: string,
): Promise<ReauditLoadResult> {
  const id = decodeURIComponent(rawId).trim();
  if (!isValidShareIdFormat(id)) {
    return { ok: false, failure: "invalid_id", shareIdPrefix: shareIdPrefix(id) };
  }

  const row = await fetchAuditByShareId(supabase, id);
  if (!row) {
    return { ok: false, failure: "row_not_found", shareIdPrefix: shareIdPrefix(id) };
  }

  const payload = buildReauditComparisonPayload(row);
  if (!payload) {
    return { ok: false, failure: "comparison_unavailable", shareIdPrefix: shareIdPrefix(id) };
  }

  return { ok: true, row, payload };
}

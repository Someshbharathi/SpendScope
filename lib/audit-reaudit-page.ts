import { parseAuditRowToFormValuesForReaudit } from "@/lib/audit-row-to-form-values";
import type { AuditShareRow } from "@/lib/audit-share-fetch";
import { runAuditEngine } from "@/lib/audit-engine";
import type { AuditFormValues, AuditReport } from "@/lib/audit-types";

/** Rebuild form inputs from a share/RPC row so the engine can rerun with current benchmarks. */
export function parseAuditShareRowToFormValues(row: AuditShareRow): AuditFormValues | null {
  return parseAuditRowToFormValuesForReaudit({
    email: row.email,
    company_name: row.company_name,
    role: row.role,
    team_size: row.team_size,
    tools_json: row.tools_json,
    results_json: row.results_json,
  });
}

export function rerunAuditReportFromShareRow(row: AuditShareRow): AuditReport | null {
  const form = parseAuditShareRowToFormValues(row);
  if (!form) return null;
  return runAuditEngine(form);
}

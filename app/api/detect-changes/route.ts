import { NextResponse } from "next/server";

import { parseAuditRowToFormValues } from "@/lib/audit-row-to-form-values";
import {
  buildReauditDiff,
  parseStoredAuditReport,
  summarizeAuditReport,
  type DetectChangesWithReauditItem,
} from "@/lib/audit-rerun-diff";
import { runAuditEngine } from "@/lib/audit-engine";
import type { ToolId } from "@/lib/audit-types";
import { diffSnapshotToolsAgainstCurrent } from "@/lib/pricing-snapshot-diff";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const PAGE_SIZE = 500;

type AuditRow = {
  id: string;
  pricing_snapshot: unknown;
  tools_json: unknown;
  results_json: unknown;
  email: unknown;
  company_name: unknown;
  role: unknown;
  team_size: unknown;
};

function extractToolsFromSnapshot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return null;
  const tools = (raw as { tools?: unknown }).tools;
  return tools ?? null;
}

function pricingAffectedTools(changes: { tool: ToolId }[]): ToolId[] {
  return [...new Set(changes.map((c) => c.tool))].sort();
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`detect-changes:${ip}`, { max: 30, windowMs: 600_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limited.retryAfterSec} seconds.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for this route (reads all audits; bypasses RLS).",
      },
      { status: 503 },
    );
  }

  try {
    const out: DetectChangesWithReauditItem[] = [];
    let offset = 0;

    for (;;) {
      const { data, error } = await admin
        .from("audits")
        .select("id, pricing_snapshot, tools_json, results_json, email, company_name, role, team_size")
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("[detect-changes]", error);
        return NextResponse.json({ error: "Failed to load audits from database." }, { status: 500 });
      }

      const rows = (data ?? []) as AuditRow[];
      if (rows.length === 0) break;

      for (const row of rows) {
        const snapshotTools = extractToolsFromSnapshot(row.pricing_snapshot);
        const changes = diffSnapshotToolsAgainstCurrent(snapshotTools);
        if (changes.length === 0) continue;

        const form = parseAuditRowToFormValues(row);
        if (!form) continue;

        const oldReport = parseStoredAuditReport(row.results_json);
        const newReport = runAuditEngine(form);

        const affected = pricingAffectedTools(changes);
        const diff = buildReauditDiff(affected, oldReport, newReport);

        const newSummary = summarizeAuditReport(newReport);
        if (!newSummary) continue;

        out.push({
          audit_id: String(row.id),
          changes,
          old_result: summarizeAuditReport(oldReport),
          new_result: newSummary,
          diff,
        });
      }

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    out.sort((a, b) => a.audit_id.localeCompare(b.audit_id));
    return NextResponse.json(out);
  } catch (err) {
    console.error("[detect-changes]", err);
    return NextResponse.json({ error: "Unexpected error while scanning audits." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { sendPricingChangeNotifications } from "@/lib/detect-changes-notify";
import { getPublicAppOrigin, getPublicOriginFromRequest } from "@/lib/email/site-url";
import { isValidShareIdFormat } from "@/lib/audit-share-fetch";
import { parseAuditRowToFormValues } from "@/lib/audit-row-to-form-values";
import {
  buildReauditDiff,
  parseStoredAuditReport,
  summarizeAuditReport,
  type DetectChangesWithReauditItem,
} from "@/lib/audit-rerun-diff";
import { runAuditEngine } from "@/lib/audit-engine";
import {
  diffSnapshotToolsAgainstCurrent,
  enrichPlanPriceChanges,
} from "@/lib/pricing-snapshot-diff";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const PAGE_SIZE = 500;

type AuditRow = {
  id: string;
  share_id: unknown;
  pricing_snapshot: unknown;
  tools_json: unknown;
  results_json: unknown;
  email: unknown;
  company_name: unknown;
  role: unknown;
  team_size: unknown;
};

type AffectedAuditRow = DetectChangesWithReauditItem & {
  email: string;
  company_name: string;
  share_id: string;
};

function extractToolsFromSnapshot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return null;
  const tools = (raw as { tools?: unknown }).tools;
  return tools ?? null;
}

function companyLabel(raw: unknown): string {
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "Your audit";
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
    const out: AffectedAuditRow[] = [];
    let offset = 0;

    for (;;) {
      const { data, error } = await admin
        .from("audits")
        .select("id, share_id, pricing_snapshot, tools_json, results_json, email, company_name, role, team_size")
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
        const rawChanges = diffSnapshotToolsAgainstCurrent(snapshotTools);
        if (rawChanges.length === 0) continue;

        const form = parseAuditRowToFormValues(row);
        if (!form) continue;

        const oldReport = parseStoredAuditReport(row.results_json);
        const newReport = runAuditEngine(form);
        const changes = enrichPlanPriceChanges(rawChanges);
        const diff = buildReauditDiff(rawChanges, oldReport, newReport);

        const newSummary = summarizeAuditReport(newReport);
        if (!newSummary) continue;

        const email = typeof row.email === "string" ? row.email.trim() : "";
        const shareId = typeof row.share_id === "string" ? row.share_id.trim() : "";
        if (!shareId || !isValidShareIdFormat(shareId)) continue;

        out.push({
          audit_id: String(row.id),
          changes,
          old_result: summarizeAuditReport(oldReport),
          new_result: newSummary,
          diff,
          email,
          company_name: companyLabel(row.company_name),
          share_id: shareId,
        });
      }

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    out.sort((a, b) => a.audit_id.localeCompare(b.audit_id));

    const notifications = await sendPricingChangeNotifications(out, req);

    const origin = process.env.NEXT_PUBLIC_APP_URL?.trim()
      ? getPublicAppOrigin()
      : getPublicOriginFromRequest(req);

    const audits = out.map(({ email: _email, company_name, audit_id, share_id, ...rest }) => ({
      ...rest,
      audit_id,
      company_name,
      share_id,
      reaudit_url: `${origin.replace(/\/$/, "")}/re-audit/${encodeURIComponent(share_id)}`,
    }));

    return NextResponse.json({ audits, notifications });
  } catch (err) {
    console.error("[detect-changes]", err);
    return NextResponse.json({ error: "Unexpected error while scanning audits." }, { status: 500 });
  }
}

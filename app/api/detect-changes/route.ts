import { NextResponse } from "next/server";

import {
  buildAuditPricingChangeRow,
  diffSnapshotToolsAgainstCurrent,
  type AuditPricingChangeRow,
} from "@/lib/pricing-snapshot-diff";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const PAGE_SIZE = 500;

type AuditRow = { id: string; pricing_snapshot: unknown };

function extractToolsFromSnapshot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return null;
  const tools = (raw as { tools?: unknown }).tools;
  return tools ?? null;
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
    const out: AuditPricingChangeRow[] = [];
    let offset = 0;

    for (;;) {
      const { data, error } = await admin
        .from("audits")
        .select("id, pricing_snapshot")
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("[detect-changes]", error);
        return NextResponse.json({ error: "Failed to load audits from database." }, { status: 500 });
      }

      const rows = (data ?? []) as AuditRow[];
      if (rows.length === 0) break;

      for (const row of rows) {
        const tools = extractToolsFromSnapshot(row.pricing_snapshot);
        const changes = diffSnapshotToolsAgainstCurrent(tools);
        if (changes.length === 0) continue;
        out.push(buildAuditPricingChangeRow(String(row.id), changes));
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

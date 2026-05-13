import { NextResponse } from "next/server";

import { auditSummaryContextSchema, type AuditSummaryContext } from "@/lib/audit-summary-context";
import { generateFallbackSummary } from "@/lib/fallback-summary";
import { generateExecutiveSummaryWithGemini } from "@/lib/gemini";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`generate-summary:${ip}`, { max: 30, windowMs: 600_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limited.retryAfterSec} seconds.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ summary: "", source: "fallback" as const }, { status: 400 });
  }

  const parsed = auditSummaryContextSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ summary: "", source: "fallback" as const }, { status: 400 });
  }

  const context = parsed.data as unknown as AuditSummaryContext;
  const fallback = generateFallbackSummary(context);

  try {
    const summary = await generateExecutiveSummaryWithGemini(context);
    return NextResponse.json({ summary, source: "gemini" as const });
  } catch (err) {
    console.error("[generate-summary]", err);
    return NextResponse.json({ summary: fallback, source: "fallback" as const });
  }
}

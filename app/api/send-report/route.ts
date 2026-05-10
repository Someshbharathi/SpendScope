import { NextResponse } from "next/server";
import { z } from "zod";

import { isValidShareIdFormat } from "@/lib/audit-share-fetch";
import { getPublicOriginFromRequest } from "@/lib/email/site-url";
import { isResendConfigured, sendAuditReportEmail } from "@/lib/email/send-audit-report-email";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  share_id: z.string().trim().min(1).max(36),
  /** Personalized executive narrative (Gemini or deterministic fallback) — shown as email body lead. */
  executive_summary: z.string().trim().max(8000),
  monthly_savings: z.number().finite(),
  annual_savings: z.number().finite(),
  top_recommendations: z.array(z.string().trim().max(500)).max(10),
});

export async function POST(req: Request) {
  try {
    if (!isResendConfigured()) {
      return NextResponse.json(
        { error: "Email delivery is not configured. Please try again later." },
        { status: 503 },
      );
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Check your email and try again." },
        { status: 400 },
      );
    }

    const data = parsed.data;
    if (!isValidShareIdFormat(data.share_id)) {
      return NextResponse.json(
        { error: "Invalid share link. Run the audit again to generate a report." },
        { status: 400 },
      );
    }

    const origin = getPublicOriginFromRequest(req);
    const shareUrl = `${origin}/audit/${encodeURIComponent(data.share_id.trim())}`;

    await sendAuditReportEmail({
      to: data.email,
      shareUrl,
      executiveSummary: data.executive_summary,
      monthlySavings: data.monthly_savings,
      annualSavings: data.annual_savings,
      topRecommendations: data.top_recommendations,
    });

    return NextResponse.json({ ok: true, message: "Audit report sent successfully" });
  } catch (err) {
    console.error("[send-report]", err);
    return NextResponse.json(
      { error: "Failed to send report. Please try again later." },
      { status: 500 },
    );
  }
}

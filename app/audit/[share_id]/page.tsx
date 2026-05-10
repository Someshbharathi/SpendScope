import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SharedAuditReportClient } from "@/components/audit/shared-audit-report-client";
import { fetchAuditByShareId, parseShareReport } from "@/lib/audit-share-fetch";
import type { UseCase } from "@/lib/audit-types";
import { formatCurrency } from "@/lib/format-currency";

const USE_CASES: UseCase[] = ["coding", "writing", "research", "mixed", "data_analysis"];
import { createClient } from "@/utils/supabase/server";

type PageProps = {
  params: Promise<{ share_id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { share_id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const row = await fetchAuditByShareId(supabase, share_id);
  if (!row) {
    return {
      title: "Report not found — SpendScope",
      description: "This shared audit could not be loaded.",
    };
  }
  const report = parseShareReport(row);
  if (!report) {
    return {
      title: "Report unavailable — SpendScope",
      description: "This shared audit could not be loaded.",
    };
  }
  const savings = report.totalMonthlySavings ?? 0;
  const title =
    savings > 0
      ? `AI Spend Audit — ${formatCurrency(savings)}/mo opportunity — SpendScope`
      : "AI Spend Audit — SpendScope";
  const summary = (report.executiveSummary ?? "").trim();
  const description =
    summary.length > 0
      ? `${row.company_name} — ${summary.slice(0, 155)}${summary.length > 155 ? "…" : ""}`
      : `Shared AI spend audit for ${row.company_name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharedAuditPage({ params }: PageProps) {
  const { share_id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const row = await fetchAuditByShareId(supabase, share_id);
  if (!row) notFound();

  const report = parseShareReport(row);
  if (!report) notFound();

  const rawUseCase = row.tools_json?.useCase;
  const useCase =
    rawUseCase && USE_CASES.includes(rawUseCase as UseCase) ? (rawUseCase as UseCase) : null;

  const generatedAtLabel = row.created_at
    ? new Date(row.created_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Recently";

  return (
    <SharedAuditReportClient
      companyName={row.company_name}
      role={row.role}
      teamSize={Math.max(1, row.team_size)}
      useCase={useCase}
      report={report}
      generatedAtLabel={generatedAtLabel}
    />
  );
}

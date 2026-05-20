import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SharedAuditReportClient } from "@/components/audit/shared-audit-report-client";
import { rerunAuditReportFromShareRow } from "@/lib/audit-reaudit-page";
import { fetchAuditByShareId, isValidShareIdFormat } from "@/lib/audit-share-fetch";
import type { UseCase } from "@/lib/audit-types";
import { formatCurrency } from "@/lib/format-currency";
import {
  diffSnapshotToolsAgainstCurrent,
  enrichPlanPriceChanges,
} from "@/lib/pricing-snapshot-diff";
import { formatPlanPriceChangeBullet } from "@/lib/pricing-change-summary";
import { PRICING_DATA_AS_OF_ISO } from "@/lib/pricing-sources";
import { createClient } from "@/utils/supabase/server";

const USE_CASES: UseCase[] = ["coding", "writing", "research", "mixed", "data_analysis"];

type PageProps = {
  params: Promise<{ share_id: string }>;
};

function extractToolsFromSnapshot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return null;
  return (raw as { tools?: unknown }).tools ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { share_id } = await params;
  if (!isValidShareIdFormat(share_id)) {
    return { title: "Report not found — SpendScope" };
  }
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const row = await fetchAuditByShareId(supabase, share_id);
  if (!row) {
    return { title: "Report not found — SpendScope" };
  }
  const report = rerunAuditReportFromShareRow(row);
  const savings = report?.totalMonthlySavings ?? 0;
  return {
    title: `${row.company_name} — Updated audit — SpendScope`,
    description:
      savings > 0
        ? `Re-audit with current benchmarks: ${formatCurrency(savings)}/mo modeled savings.`
        : "Re-audit with current list-price benchmarks.",
  };
}

export default async function ReauditPage({ params }: PageProps) {
  const { share_id } = await params;
  if (!isValidShareIdFormat(share_id)) notFound();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const row = await fetchAuditByShareId(supabase, share_id);
  if (!row) notFound();

  const report = rerunAuditReportFromShareRow(row);
  if (!report) notFound();

  const snapshotTools = extractToolsFromSnapshot(row.pricing_snapshot);
  const priceChanges = enrichPlanPriceChanges(diffSnapshotToolsAgainstCurrent(snapshotTools));

  const rawUseCase = row.tools_json?.useCase;
  const useCase =
    rawUseCase && USE_CASES.includes(rawUseCase as UseCase) ? (rawUseCase as UseCase) : null;

  const changeLines =
    priceChanges.length > 0
      ? priceChanges.map((c) => formatPlanPriceChangeBullet(c)).join(" · ")
      : null;

  const bannerMessage = [
    "Updated with current list-price benchmarks",
    `(as of ${PRICING_DATA_AS_OF_ISO}).`,
    changeLines ? `Changes since your saved audit: ${changeLines}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const generatedAtLabel = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <SharedAuditReportClient
      teamSize={Math.max(1, row.team_size)}
      useCase={useCase}
      report={report}
      generatedAtLabel={generatedAtLabel}
      bannerMessage={bannerMessage}
      headerBadge="Updated audit"
      savedShareUrl={`/audit/${row.share_id}`}
    />
  );
}

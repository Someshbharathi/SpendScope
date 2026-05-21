import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReauditComparisonView } from "@/components/re-audit/reaudit-comparison-view";
import { fetchAuditByShareId, isValidShareIdFormat } from "@/lib/audit-share-fetch";
import { buildReauditComparisonPayload } from "@/lib/reaudit-comparison";
import { formatCurrency } from "@/lib/format-currency";
import { createClient } from "@/utils/supabase/server";

/** Always run on the server so Vercel serves this dynamic route on demand. */
export const dynamic = "force-dynamic";

type PageProps = {
  /** Share UUID from notification emails (`/re-audit/{id}`). */
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidShareIdFormat(id)) {
    return { title: "Re-audit not found — SpendScope" };
  }
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const row = await fetchAuditByShareId(supabase, id);
  if (!row) {
    return { title: "Re-audit not found — SpendScope" };
  }
  const payload = buildReauditComparisonPayload(row);
  const savings = payload?.newResult.monthly_savings ?? 0;
  return {
    title: `${row.company_name} — Re-audit comparison — SpendScope`,
    description:
      savings > 0
        ? `Compare saved vs updated audit: ${formatCurrency(savings)}/mo after benchmark changes.`
        : "Compare your saved AI spend audit against current list-price benchmarks.",
  };
}

export default async function ReauditComparisonPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId).trim();
  if (!isValidShareIdFormat(id)) notFound();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const row = await fetchAuditByShareId(supabase, id);
  if (!row) notFound();

  const payload = buildReauditComparisonPayload(row);
  if (!payload) notFound();

  return <ReauditComparisonView data={payload} />;
}

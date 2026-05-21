import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReauditComparisonView } from "@/components/re-audit/reaudit-comparison-view";
import { formatCurrency } from "@/lib/format-currency";
import { loadReauditComparison } from "@/lib/reaudit-page-load";
import { createClient } from "@/utils/supabase/server";

/** Always run on the server so Vercel serves this dynamic route on demand. */
export const dynamic = "force-dynamic";

type PageProps = {
  /** Public share UUID from notification emails (`/re-audit/{share_id}`). */
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const loaded = await loadReauditComparison(supabase, id);
  if (!loaded.ok) {
    return { title: "Re-audit not found — SpendScope" };
  }
  const savings = loaded.payload.newResult.monthly_savings ?? 0;
  return {
    title: `${loaded.row.company_name} — Re-audit comparison — SpendScope`,
    description:
      savings > 0
        ? `Compare saved vs updated audit: ${formatCurrency(savings)}/mo after benchmark changes.`
        : "Compare your saved AI spend audit against current list-price benchmarks.",
  };
}

export default async function ReauditComparisonPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const loaded = await loadReauditComparison(supabase, id);
  if (!loaded.ok) notFound();

  return <ReauditComparisonView data={loaded.payload} />;
}

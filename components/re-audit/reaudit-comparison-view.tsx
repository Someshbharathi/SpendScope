import Link from "next/link";
import { ArrowLeft, ArrowRight, GitCompare } from "lucide-react";

import { AuditTopNav } from "@/components/audit/audit-top-nav";
import { GlassCard } from "@/components/audit/glass-card";
import { AppShell } from "@/components/app-shell";
import { formatCurrency } from "@/lib/format-currency";
import type {
  ReauditComparisonPayload,
  ToolRecommendationDiff,
} from "@/lib/reaudit-comparison";
import type { EnrichedPlanPriceChange } from "@/lib/pricing-snapshot-diff";

function formatSeatPrice(value: number | null): string {
  if (value === null) return "Custom";
  return formatCurrency(value);
}

function PriceChangeRow({ change }: { change: EnrichedPlanPriceChange }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-amber-400/20 bg-amber-500/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-white/90">
        {change.tool_display_name}{" "}
        <span className="font-normal text-white/55">{change.plan_label}</span>
      </p>
      <p className="text-sm tabular-nums text-amber-100/95">
        {formatSeatPrice(change.old_price)}
        <span className="mx-2 text-white/40">→</span>
        {formatSeatPrice(change.new_price)}
        <span className="ml-1 text-xs text-white/45">/ seat</span>
      </p>
    </div>
  );
}

function RecommendationBlock({
  label,
  line,
  variant,
}: {
  label: string;
  line: ToolRecommendationDiff["previous"];
  variant: "before" | "after";
}) {
  const border =
    variant === "before" ? "border-white/10 bg-white/4" : "border-emerald-400/25 bg-emerald-500/8";
  if (!line) {
    return (
      <div className={`rounded-xl border px-4 py-3 ${border}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{label}</p>
        <p className="mt-2 text-sm text-white/50">No recommendation for this tool on this pass.</p>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${border}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-2 text-sm font-medium text-white/90">{line.actionType}</p>
      <p className="mt-1 text-sm leading-relaxed text-white/70">{line.oneSentenceReason}</p>
      <p className="mt-2 text-xs leading-relaxed text-white/50">{line.optimizationSummary}</p>
      <p className="mt-2 text-xs text-white/45">
        Modeled savings: {formatCurrency(line.monthlySavings)}/mo · {line.spendClassification}
      </p>
    </div>
  );
}

function ToolRecommendationCard({ item }: { item: ToolRecommendationDiff }) {
  if (!item.changed) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-white">{item.toolLabel}</h3>
        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-200/90">
          Changed
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <RecommendationBlock label="Previous recommendation" line={item.previous} variant="before" />
        <RecommendationBlock label="Updated recommendation" line={item.updated} variant="after" />
      </div>
    </div>
  );
}

export function ReauditComparisonView({ data }: { data: ReauditComparisonPayload }) {
  const changedRecommendations = data.recommendationDiffs.filter((r) => r.changed);
  const monthlyDelta = data.diff.monthly_savings_delta;
  const deltaLabel =
    monthlyDelta === null
      ? "—"
      : `${monthlyDelta >= 0 ? "+" : ""}${formatCurrency(monthlyDelta)}/month`;

  const whyParts: string[] = [
    "Your saved audit used list prices from when it was created.",
    `We re-ran the same inputs against benchmarks as of ${data.currentPricingAsOf}.`,
  ];
  if (data.priceChanges.length > 0) {
    whyParts.push(
      `List prices changed for ${data.diff.affected_tool_labels.join(", ")}${data.snapshotPricingAsOf ? ` (snapshot ${data.snapshotPricingAsOf})` : ""}.`,
    );
  }
  if (data.diff.recommendation_changed) {
    whyParts.push("Recommendations and modeled savings reflect the updated benchmarks.");
  }

  return (
    <AppShell>
      <AuditTopNav />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6 md:px-8">
        <Link
          href={data.savedReportUrl}
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white/85"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to saved report
        </Link>

        <header className="mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-violet-200/90">
            <GitCompare className="h-3.5 w-3.5" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Re-audit comparison</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Pricing changes affected this audit
          </h1>
          <GlassCard className="space-y-3 !p-5">
            <p className="text-lg font-medium text-white">{data.companyName}</p>
            <p className="text-sm text-white/55">
              Original audit: <span className="text-white/75">{data.createdAtLabel}</span>
            </p>
            {data.diff.affected_tool_labels.length > 0 ? (
              <p className="text-sm text-white/55">
                Affected tools:{" "}
                <span className="font-medium text-white/80">{data.diff.affected_tool_labels.join(", ")}</span>
              </p>
            ) : null}
            <p className="text-sm leading-relaxed text-white/50">{whyParts.join(" ")}</p>
          </GlassCard>
        </header>

        <div className="space-y-6">
          <GlassCard>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">Pricing changes</h2>
            {data.priceChanges.length > 0 ? (
              <div className="mt-4 space-y-3">
                {data.priceChanges.map((c) => (
                  <PriceChangeRow key={`${c.tool}-${c.plan}`} change={c} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/55">
                No list-price differences between your saved snapshot and today&apos;s catalog. Savings below
                still reflect a fresh pass on your inputs.
              </p>
            )}
          </GlassCard>

          <GlassCard>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
              Projected monthly savings
            </h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-white/45">
                  Previous projected savings
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                  {data.oldResult ? `${formatCurrency(data.oldResult.monthly_savings)}/month` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/8 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-200/70">
                  Updated projected savings
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-100">
                  {formatCurrency(data.newResult.monthly_savings)}/month
                </p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/8 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-200/70">Change</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-100">{deltaLabel}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
              Recommendation comparison
            </h2>
            {changedRecommendations.length > 0 ? (
              <div className="mt-4 space-y-4">
                {changedRecommendations.map((item) => (
                  <ToolRecommendationCard key={item.toolId} item={item} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/55">
                Headline recommendations match your saved audit. Check savings and pricing above for financial
                impact.
              </p>
            )}
          </GlassCard>

          <GlassCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/85">Original saved report</p>
              <p className="mt-1 text-xs text-white/45">Snapshot from when you first completed the audit.</p>
            </div>
            <Link
              href={data.savedReportUrl}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0F19] transition hover:bg-white/90"
            >
              View saved report
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </GlassCard>
        </div>
      </main>
    </AppShell>
  );
}

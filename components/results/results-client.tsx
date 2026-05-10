"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, TriangleAlert, TrendingDown } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuditTopNav } from "@/components/audit/audit-top-nav";
import { GlassCard } from "@/components/audit/glass-card";
import type {
  AuditSessionPayload,
  ConfidenceLevel,
  RecommendationActionType,
  ToolAuditFinding,
} from "@/lib/audit-types";
import { loadAuditSessionPayload } from "@/lib/audit-persistence";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function actionBadgeTone(action: RecommendationActionType): string {
  switch (action) {
    case "Downgrade Plan":
      return "border-emerald-300/30 bg-emerald-400/15 text-emerald-100";
    case "Alternative Tool":
      return "border-violet-300/30 bg-violet-400/15 text-violet-100";
    case "Optimize Seats":
      return "border-blue-300/30 bg-blue-400/15 text-blue-100";
    case "Use Credits":
      return "border-cyan-300/30 bg-cyan-400/15 text-cyan-100";
    case "Reduce API Spend":
      return "border-amber-300/30 bg-amber-400/15 text-amber-100";
    default:
      return "border-white/20 bg-white/10 text-white/80";
  }
}

function confidenceTone(confidence: ConfidenceLevel): string {
  if (confidence === "High") return "text-emerald-200";
  if (confidence === "Medium") return "text-blue-200";
  return "text-amber-200";
}

function normalizeRecommendationBadges(
  badges: ToolAuditFinding["recommendationBadges"] | undefined,
  fallbackAction: RecommendationActionType,
): RecommendationActionType[] {
  if (Array.isArray(badges) && badges.length > 0) return badges;
  return [fallbackAction];
}

function normalizeFinding(finding: ToolAuditFinding): ToolAuditFinding {
  const actionType = finding.actionType ?? "Already Optimized";
  return {
    ...finding,
    currentTool: finding.currentTool ?? (finding as { toolName?: string }).toolName ?? "Unknown tool",
    currentPlan: finding.currentPlan ?? (finding as { currentPlanLabel?: string }).currentPlanLabel ?? "Current plan",
    recommendedTool: finding.recommendedTool ?? finding.currentTool ?? "Current tool",
    recommendedPlan:
      finding.recommendedPlan ??
      (finding as { recommendedPlanLabel?: string }).recommendedPlanLabel ??
      finding.currentPlan ??
      "Current plan",
    actionType,
    currentSpend:
      finding.currentSpend ??
      (finding as { monthlySpendReported?: number }).monthlySpendReported ??
      0,
    optimizedSpend:
      finding.optimizedSpend ??
      (finding as { monthlySpendAfterRecommendation?: number }).monthlySpendAfterRecommendation ??
      0,
    monthlySavings: finding.monthlySavings ?? 0,
    annualSavings: finding.annualSavings ?? Math.round((finding.monthlySavings ?? 0) * 12),
    confidenceLevel: finding.confidenceLevel ?? "Medium",
    reasoning:
      finding.reasoning ??
      (finding as { reasons?: string[] }).reasons ??
      ["No detailed reasoning available for this older report."],
    optimizationSummary:
      finding.optimizationSummary ??
      "This recommendation was loaded from an earlier report format.",
    potentialPricingAnomaly: Boolean(finding.potentialPricingAnomaly),
    recommendationBadges: normalizeRecommendationBadges(finding.recommendationBadges, actionType),
  };
}

function RecommendationCard({ finding }: { finding: ToolAuditFinding }) {
  return (
    <GlassCard className="space-y-6">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {finding.recommendationBadges.map((badge) => (
              <span
                key={`${finding.toolId}-${badge}`}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${actionBadgeTone(badge)}`}
              >
                {badge}
              </span>
            ))}
          </div>
          <h3 className="text-xl font-semibold text-white">{finding.currentTool}</h3>
          <p className="text-sm text-white/60">{finding.optimizationSummary}</p>
        </div>
        <div className="w-full max-w-[16rem] rounded-xl border border-white/10 bg-white/4 p-4 text-right">
          <p className="text-xs uppercase tracking-wider text-white/45">Monthly savings</p>
          <p className="mt-1 text-3xl font-semibold text-emerald-200">
            {formatCurrency(finding.monthlySavings)}
          </p>
          <p className="text-sm text-white/55">{formatCurrency(finding.annualSavings)}/year</p>
          <p className={`mt-3 text-xs font-medium ${confidenceTone(finding.confidenceLevel)}`}>
            Confidence: {finding.confidenceLevel}
          </p>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-white/4 p-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-white/45">Current setup</p>
          <p className="text-sm text-white/70">
            {finding.currentTool} <span className="text-white">{finding.currentPlan}</span>
          </p>
          <p className="text-sm text-white/55">
            Current spend: <span className="text-white/80">{formatCurrency(finding.currentSpend)}/month</span>
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-white/45">Recommended setup</p>
          <p className="text-sm text-white/70">
            {finding.recommendedTool} <span className="text-white">{finding.recommendedPlan}</span>
          </p>
          <p className="text-sm text-white/55">
            Action: <span className="text-white/80">{finding.actionType}</span>
          </p>
          <p className="text-sm text-white/55">
            Estimated optimized spend:{" "}
            <span className="text-white/80">~{formatCurrency(finding.optimizedSpend)}/month</span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-white/45">Reasoning</p>
        <ul className="space-y-2 text-sm text-white/70">
          {finding.reasoning.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-300/80" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {finding.potentialPricingAnomaly ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/25 bg-amber-400/10 p-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
          <p className="text-sm text-amber-100/90">
            Potential pricing anomaly detected. Validate API overuse, seat sprawl, billing setup,
            and unused subscriptions before renewing this configuration.
          </p>
        </div>
      ) : null}
    </GlassCard>
  );
}

export function ResultsClient() {
  const [phase, setPhase] = useState<"loading" | "empty" | "ready">("loading");
  const [payload, setPayload] = useState<AuditSessionPayload | null>(null);

  useEffect(() => {
    startTransition(() => {
      const loaded = loadAuditSessionPayload();
      if (!loaded) {
        setPhase("empty");
        return;
      }
      setPayload(loaded);
      setPhase("ready");
    });
  }, []);

  if (phase === "loading") {
    return (
      <AppShell>
        <AuditTopNav />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
          <Loader2 className="h-10 w-10 animate-spin text-white/40" />
          <p className="text-sm text-white/55">Preparing your report…</p>
        </div>
      </AppShell>
    );
  }

  if (phase === "empty" || !payload) {
    return (
      <AppShell>
        <AuditTopNav />
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-6 py-20 text-center">
          <GlassCard className="w-full space-y-4 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
              No report yet
            </p>
            <h1 className="text-2xl font-semibold">Run an audit first</h1>
            <p className="text-sm text-white/60">
              Complete the spend form and submit to see actionable recommendations.
            </p>
            <Link
              href="/audit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0F19] transition hover:bg-white/90"
            >
              Start audit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </GlassCard>
        </div>
      </AppShell>
    );
  }

  const { report } = payload;
  const safeFindings = (report.findings ?? []).map(normalizeFinding);
  const summaryBullets = report.summaryBullets ?? [];
  const executiveSummary =
    report.executiveSummary ??
    "Your spend profile has been analyzed against pricing benchmarks and optimization rules.";

  return (
    <AppShell>
      <AuditTopNav />
      <main className="mx-auto w-full max-w-6xl space-y-12 px-6 pb-24 pt-10 md:px-10 lg:px-16">
        <div className="space-y-3 text-center md:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-200/70">
            Audit complete
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Actionable optimization report
          </h1>
          <p className="max-w-3xl text-lg text-white/60">{executiveSummary}</p>
          <p className="text-sm text-white/45">
            Prepared for {report.companyName} · {report.role}
          </p>
          {payload.auditRowId ? (
            <p className="text-xs text-white/35">Saved as audit #{payload.auditRowId}</p>
          ) : null}
        </div>

        <GlassCard className="relative overflow-hidden border-emerald-400/20 bg-linear-to-br from-emerald-500/15 via-white/4 to-blue-500/10 p-8 md:p-10">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-200" />
                Estimated opportunity
              </div>
              <p className="text-sm text-white/55">Total monthly savings potential</p>
              <p className="text-5xl font-semibold tracking-tight md:text-6xl">
                {formatCurrency(report.totalMonthlySavings)}
                <span className="text-2xl font-medium text-white/45 md:text-3xl">/mo</span>
              </p>
              <p className="text-lg text-white/65">
                ~{formatCurrency(report.totalAnnualSavings)} annualized
              </p>
            </div>

            <div className="max-w-md space-y-3 text-sm text-white/60">
              <p className="font-medium text-white/80">Executive summary</p>
              <ul className="space-y-2">
                {summaryBullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/80" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </GlassCard>

        {(report.isMostlyOptimized ?? report.totalMonthlySavings < 25) ? (
          <GlassCard className="border-emerald-300/20 bg-emerald-400/10">
            <p className="text-lg font-medium text-emerald-100">
              Your current stack already appears cost-efficient.
            </p>
            <p className="mt-2 text-sm text-emerald-100/80">
              No major savings opportunities were detected beyond routine API and seat hygiene.
            </p>
          </GlassCard>
        ) : null}

        <section className="space-y-5">
          <h2 className="text-xl font-semibold text-white/90">Recommendations</h2>
          <div className="grid gap-5">
            {safeFindings.map((finding) => (
              <RecommendationCard key={finding.toolId} finding={finding} />
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-10 md:justify-between">
          <Link
            href="/audit"
            className="text-sm text-white/55 underline-offset-4 transition hover:text-white hover:underline"
          >
            Update inputs and rerun
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/10"
          >
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </AppShell>
  );
}

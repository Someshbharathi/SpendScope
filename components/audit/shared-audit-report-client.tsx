"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuditActionPlanCard } from "@/components/audit/audit-action-plan-card";
import { AuditTopNav } from "@/components/audit/audit-top-nav";
import { GlassCard } from "@/components/audit/glass-card";
import { SpendOverviewCharts } from "@/components/results/spend-overview-charts";
import type { AuditReport, UseCase } from "@/lib/audit-types";
import { normalizeFinding } from "@/lib/audit-report-normalize";
import { formatCurrency } from "@/lib/format-currency";

const USE_CASE_LABEL: Record<UseCase, string> = {
  coding: "Coding",
  writing: "Writing",
  research: "Research",
  mixed: "Mixed",
  data_analysis: "Data analysis",
};

export type SharedAuditReportProps = {
  companyName: string;
  role: string;
  teamSize: number;
  useCase: UseCase | null;
  report: AuditReport;
  generatedAtLabel: string;
};

export function SharedAuditReportClient({
  companyName,
  role,
  teamSize,
  useCase,
  report,
  generatedAtLabel,
}: SharedAuditReportProps) {
  const safeFindings = (report.findings ?? []).map(normalizeFinding);
  const executiveSummary =
    report.executiveSummary ??
    "Your spend profile has been analyzed against pricing benchmarks and optimization rules.";

  const totalMonthly = report.totalMonthlySavings;
  const totalAnnual = report.totalAnnualSavings;
  const totalCurrentSpend = safeFindings.reduce((sum, f) => sum + f.currentSpend, 0);
  const totalOptimizedSpend = Math.max(0, safeFindings.reduce((sum, f) => sum + f.optimizedSpend, 0));
  const noModeledSavings = (totalMonthly ?? 0) <= 0;
  const useCaseLabel = useCase ? USE_CASE_LABEL[useCase] : null;

  const execSnippet = executiveSummary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

  return (
    <AppShell>
      <AuditTopNav />
      <main className="relative mx-auto w-full max-w-xl px-6 pb-24 pt-8 md:max-w-3xl md:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[420px] max-w-3xl rounded-full bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.14),transparent_55%)] blur-2xl"
        />

        <header className="relative mb-10 space-y-4 border-b border-white/10 pb-10">
          <div className="flex flex-wrap items-center gap-2 text-violet-300/80">
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            <p className="text-xs font-medium uppercase tracking-[0.2em]">Shared report</p>
          </div>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
            AI Spend Audit Report
          </h1>
          <p className="text-sm text-white/45">Generated {generatedAtLabel}</p>
          <GlassCard className="border-white/10 bg-white/4 p-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Organization</dt>
                <dd className="mt-1 font-medium text-white/90">{companyName || "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Team size</dt>
                <dd className="mt-1 font-medium text-white/90">{teamSize} people</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Stakeholder role</dt>
                <dd className="mt-1 text-white/75">{role || "—"}</dd>
              </div>
              {useCaseLabel ? (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Primary use case</dt>
                  <dd className="mt-1 text-white/75">{useCaseLabel}</dd>
                </div>
              ) : null}
            </dl>
          </GlassCard>
        </header>

        <div className="relative rounded-2xl border border-white/10 bg-white/2 p-6 shadow-[0_0_80px_-24px_rgba(99,102,241,0.35)] backdrop-blur-sm sm:p-8 md:p-10">
          <header className="mb-10 space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300/75">Audit results</p>
            <div className="h-px w-14 rounded-full bg-linear-to-r from-violet-400 via-fuchsia-400 to-sky-400 opacity-90" />
            {noModeledSavings ? (
              <>
                <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                  Your stack looks efficient at retail pricing
                </h2>
                <p className="text-sm leading-relaxed text-white/55">
                  We didn&apos;t surface a material gap versus published pricing for what you entered—rerun when seats or
                  usage shifts meaningfully.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                  About{" "}
                  <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-sky-400 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(167,139,250,0.35)]">
                    {formatCurrency(totalMonthly ?? 0)}
                  </span>
                  <span className="text-white/90">/month</span> on the table
                </h2>
                <p className="text-sm leading-relaxed text-white/55">
                  {execSnippet || executiveSummary}{" "}
                  <span className="text-white/40">
                    Based on published retail benchmarks and the plans and seats you shared—not a vendor quote.
                  </span>
                </p>
              </>
            )}
          </header>

          <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4 text-center sm:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Total reported spend</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">{formatCurrency(totalCurrentSpend)}</p>
              <p className="text-xs text-white/40">Per month across enabled tools</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4 text-center sm:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Potential monthly savings</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-400">
                {formatCurrency(totalMonthly ?? 0)}
              </p>
              <p className="text-xs text-white/40">Retail benchmark opportunity</p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-center sm:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">Potential annual impact</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-200">
                {formatCurrency(totalAnnual ?? 0)}
              </p>
              <p className="text-xs text-emerald-200/50">If monthly improvements hold</p>
            </div>
          </div>

          <SpendOverviewCharts
            currentMonthly={totalCurrentSpend}
            optimizedMonthly={totalOptimizedSpend}
            monthlySavings={totalMonthly ?? 0}
            annualSavings={totalAnnual ?? 0}
          />

          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/45">Recommendations</h2>
              <p className="mt-1 text-xs text-white/35">
                Grounded in retail benchmarks—prioritized by impact on your stack.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {safeFindings.map((finding) => (
              <AuditActionPlanCard key={finding.toolId} finding={finding} teamSize={teamSize} />
            ))}
          </div>
        </div>

        <GlassCard className="relative mt-10 border-white/10 bg-white/4 p-6 text-center">
          <p className="text-sm font-medium text-white/90">Want to optimize your own AI stack?</p>
          <p className="mt-2 text-xs text-white/45">Run a fresh audit with your tools, seats, and spend.</p>
          <Link
            href="/audit"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0F19] transition hover:bg-white/95"
          >
            Run your own audit
            <ArrowRight className="h-4 w-4" />
          </Link>
        </GlassCard>

        <p className="relative mt-10 text-center text-[11px] leading-relaxed text-white/35">
          Recommendations use published retail benchmarks and the seats and plans in this audit—validate against invoices
          before renewal.
        </p>

        <div className="relative mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/10"
          >
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </AppShell>
  );
}

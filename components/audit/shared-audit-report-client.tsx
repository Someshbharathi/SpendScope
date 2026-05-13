"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Download,
  FileText,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuditActionPlanCard } from "@/components/audit/audit-action-plan-card";
import { AuditTopNav } from "@/components/audit/audit-top-nav";
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
  teamSize: number;
  useCase: UseCase | null;
  report: AuditReport;
  generatedAtLabel: string;
};

function MetaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid h-full min-h-20 grid-cols-[2.5rem_1fr] items-center gap-x-3 gap-y-0 rounded-2xl border border-white/10 bg-white/4 p-4 shadow-inner shadow-black/20">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-xl bg-violet-500/15 text-violet-300/90">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
      </div>
      <div className="min-w-0 self-center">
        <p className="text-[10px] font-semibold uppercase leading-none tracking-wider text-white/40">{label}</p>
        <p className="mt-0.5 wrap-break-word text-sm font-medium leading-snug text-white/90">{value}</p>
      </div>
    </div>
  );
}

export function SharedAuditReportClient({
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

  function handleDownloadPdf() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <AppShell>
      <AuditTopNav />
      <main className="relative mx-auto w-full max-w-3xl px-4 pb-28 pt-6 print:max-w-none print:px-4 print:pb-8 print:pt-4 sm:px-6 md:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-8 h-128 w-[min(100%,42rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_50%_20%,rgba(139,92,246,0.18),transparent_58%)] blur-3xl print:hidden"
        />

        <article className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-[linear-gradient(165deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.03)_28%,rgba(11,15,25,0.65)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_32px_100px_-28px_rgba(99,102,241,0.45)] print:overflow-visible print:[print-color-adjust:exact]">
          <div className="h-[3px] w-full bg-linear-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />

          <div className="space-y-12 px-5 py-9 print:space-y-8 sm:px-8 sm:py-11 md:px-10 md:py-12">
            {/* Cover */}
            <header className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-violet-200/85">
                    <FileText className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Shared report</span>
                  </div>
                  <div>
                    <h1 className="text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.35rem]">
                      AI Spend Audit Report
                    </h1>
                    <p className="mt-2 text-sm text-white/45">
                      Generated <span className="text-white/65">{generatedAtLabel}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <div className="w-full sm:w-auto sm:pt-1 sm:text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Snapshot</p>
                    <p className="mt-1 max-w-56 text-xs leading-relaxed text-white/50 sm:ml-auto">
                      Public link — organization and role are not shown. Benchmarks vs what was entered at audit time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    aria-label="Download report as PDF using your browser print dialog"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/95 shadow-sm transition hover:border-white/28 hover:bg-white/15 sm:w-auto print:hidden"
                  >
                    <Download className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    Download report
                  </button>
                  <p className="max-w-56 text-center text-[11px] leading-snug text-white/40 print:hidden sm:text-right">
                    In the print dialog, choose <span className="text-white/55">Save as PDF</span>.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetaTile icon={Users} label="Team size (declared)" value={`${teamSize} people`} />
                <MetaTile icon={Target} label="Primary use case" value={useCaseLabel ?? "—"} />
              </div>
            </header>

            <div className="h-px w-full bg-linear-to-r from-transparent via-white/15 to-transparent" aria-hidden />

            {/* Insight */}
            <section className="space-y-5" aria-labelledby="shared-result-heading">
              <div className="flex items-center gap-2 text-violet-300/80">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                <p id="shared-results-eyebrow" className="text-xs font-semibold uppercase tracking-[0.2em]">
                  Audit results
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-linear-to-br from-violet-500/12 via-white/4 to-cyan-500/10 p-6 print:overflow-visible sm:p-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" aria-hidden />
                <div className="relative border-l-2 border-violet-400/70 pl-5 sm:pl-6">
                  {noModeledSavings ? (
                    <>
                      <h2
                        id="shared-result-heading"
                        className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-[2rem]"
                      >
                        Your stack looks efficient at retail pricing
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
                        We didn&apos;t surface a material gap versus published pricing for what you entered—rerun when
                        seats or usage shifts meaningfully.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2
                        id="shared-result-heading"
                        className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-[2rem]"
                      >
                        About{" "}
                        <span className="bg-linear-to-r from-violet-300 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_32px_rgba(167,139,250,0.4)]">
                          {formatCurrency(totalMonthly ?? 0)}
                        </span>
                        <span className="text-white/90">/month</span> on the table
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
                        {execSnippet || executiveSummary}{" "}
                        <span className="text-white/40">
                          Based on published retail benchmarks and the plans and seats you shared—not a vendor quote.
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Total reported spend</p>
                  <p className="mt-1.5 text-xl font-semibold tabular-nums text-white">{formatCurrency(totalCurrentSpend)}</p>
                  <p className="mt-1 text-xs text-white/38">Per month across enabled tools</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Potential monthly savings
                  </p>
                  <p className="mt-1.5 text-xl font-semibold tabular-nums text-emerald-400">
                    {formatCurrency(totalMonthly ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-white/38">Retail benchmark opportunity</p>
                </div>
                <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/12 px-4 py-4 text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/75">
                    Potential annual impact
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums text-emerald-200">
                    {formatCurrency(totalAnnual ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-200/45">If monthly improvements hold</p>
                </div>
              </div>
            </section>

            <SpendOverviewCharts
              className="print:mb-6"
              currentMonthly={totalCurrentSpend}
              optimizedMonthly={totalOptimizedSpend}
              monthlySavings={totalMonthly ?? 0}
              annualSavings={totalAnnual ?? 0}
            />

            <section className="space-y-5 print:space-y-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/45">Recommendations</h2>
                <p className="mt-1.5 text-xs text-white/35">
                  Grounded in retail benchmarks—prioritized by impact on your stack.
                </p>
              </div>
              <div className="space-y-4">
                {safeFindings.map((finding) => (
                  <AuditActionPlanCard key={finding.toolId} finding={finding} teamSize={teamSize} />
                ))}
              </div>
            </section>
          </div>

          <footer className="border-t border-white/10 bg-black/25 px-5 py-9 sm:px-8 md:px-10">
            <div className="mx-auto max-w-lg text-center">
              <div className="print:hidden">
                <p className="text-base font-medium text-white/90">Want to optimize your own AI stack?</p>
                <p className="mt-2 text-sm text-white/45">Run a fresh audit with your tools, seats, and spend.</p>
                <Link
                  href="/audit"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#0B0F19] shadow-lg shadow-black/30 transition hover:bg-white/95 sm:w-auto"
                >
                  Run your own audit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mx-auto mt-8 max-w-md text-[11px] leading-relaxed text-white/35 print:mt-4">
                Recommendations use published retail benchmarks and the seats and plans in this audit—validate against
                invoices before renewal.
              </p>
              <div className="mt-8 flex justify-center print:hidden">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/10"
                >
                  Back to home
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </footer>
        </article>
      </main>
    </AppShell>
  );
}

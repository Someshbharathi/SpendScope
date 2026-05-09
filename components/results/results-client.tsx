"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, TrendingDown } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuditTopNav } from "@/components/audit/audit-top-nav";
import { GlassCard } from "@/components/audit/glass-card";
import type { AuditSessionPayload } from "@/lib/audit-types";
import { loadAuditSessionPayload } from "@/lib/audit-persistence";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
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
              Complete the spend form and submit—we&apos;ll show savings, tier fixes, and
              alternatives here.
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

  return (
    <AppShell>
      <AuditTopNav />
      <main className="mx-auto w-full max-w-5xl space-y-12 px-6 pb-24 pt-10 md:px-10 lg:px-16">
        <div className="space-y-3 text-center md:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-200/70">
            Audit complete
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Your savings snapshot
          </h1>
          <p className="max-w-2xl text-lg text-white/60">
            Benchmarked against published list pricing and deterministic rules—use this as a
            starting point for finance review.
          </p>
          {payload.auditRowId ? (
            <p className="text-xs text-white/40">Saved as audit #{payload.auditRowId}</p>
          ) : null}
        </div>

        <GlassCard className="relative overflow-hidden border-emerald-400/20 bg-linear-to-br from-emerald-500/15 via-white/4 to-blue-500/10 p-8 md:p-10">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-200" />
                Estimated opportunity
              </div>
              <p className="text-sm text-white/55">Total potential monthly savings</p>
              <p className="text-5xl font-semibold tracking-tight md:text-6xl">
                {formatCurrency(report.totalMonthlySavings)}
                <span className="text-2xl font-medium text-white/45 md:text-3xl">/mo</span>
              </p>
              <p className="text-lg text-white/65">
                ~{formatCurrency(report.totalAnnualSavings)} per year
              </p>
            </div>
            <div className="max-w-md space-y-3 text-sm text-white/60">
              <p className="font-medium text-white/80">Executive readout</p>
              <ul className="space-y-2">
                {report.summaryBullets.length ? (
                  report.summaryBullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/80" />
                      <span>{b}</span>
                    </li>
                  ))
                ) : (
                  <li>No extra portfolio notes—review per-tool cards below.</li>
                )}
              </ul>
            </div>
          </div>
        </GlassCard>

        <section className="space-y-5">
          <h2 className="text-xl font-semibold text-white/90">Per-tool recommendations</h2>
          <div className="grid gap-5">
            {report.findings.map((f) => (
              <GlassCard key={f.toolId} className="space-y-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{f.toolName}</h3>
                    <p className="mt-1 text-sm text-white/55">
                      Current: <span className="text-white/80">{f.currentPlanLabel}</span>
                      {f.recommendedPlanLabel ? (
                        <>
                          {" "}
                          → Recommended:{" "}
                          <span className="text-emerald-200/90">{f.recommendedPlanLabel}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-white/45">Savings</p>
                    <p className="text-2xl font-semibold text-emerald-200/90">
                      {formatCurrency(f.monthlySavings)}/mo
                    </p>
                    <p className="text-xs text-white/45">{formatCurrency(f.annualSavings)}/yr</p>
                  </div>
                </div>

                <div className="grid gap-4 rounded-xl border border-white/10 bg-white/4 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45">Spend</p>
                    <p className="mt-1 text-sm text-white/75">
                      Reported {formatCurrency(f.monthlySpendReported)}/mo
                    </p>
                    <p className="text-sm text-white/55">
                      After fixes ~{formatCurrency(f.monthlySpendAfterRecommendation)}/mo
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45">Reasoning</p>
                    <ul className="mt-2 space-y-2 text-sm text-white/70">
                      {f.reasons.map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-300/80" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {f.alternativeTool ? (
                  <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-4">
                    <p className="text-xs uppercase tracking-wider text-violet-100/70">
                      Alternative tool
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {f.alternativeTool.displayName}{" "}
                      <span className="font-normal text-white/55">
                        (~{formatCurrency(f.alternativeTool.estimatedMonthlySavings)}/mo est.)
                      </span>
                    </p>
                    <p className="mt-2 text-sm text-white/70">{f.alternativeTool.reason}</p>
                  </div>
                ) : null}
              </GlassCard>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-10 md:justify-between">
          <Link
            href="/audit"
            className="text-sm text-white/55 underline-offset-4 transition hover:text-white hover:underline"
          >
            Adjust inputs
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

"use client";

import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Download, Loader2, Share2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuditActionPlanCard } from "@/components/audit/audit-action-plan-card";
import { AuditTopNav } from "@/components/audit/audit-top-nav";
import { GlassCard } from "@/components/audit/glass-card";
import { SpendOverviewCharts } from "@/components/results/spend-overview-charts";
import type { AuditSessionPayload } from "@/lib/audit-types";
import { buildAuditSummaryContext } from "@/lib/audit-summary-context";
import { normalizeFinding } from "@/lib/audit-report-normalize";
import { generateFallbackSummary } from "@/lib/fallback-summary";
import { formatCurrency } from "@/lib/format-currency";
import { clearAuditFormStorage, loadAuditSessionPayload, saveAuditSessionPayload } from "@/lib/audit-persistence";

function ShareAuditReportButton({
  shareId,
  shareTitle,
  shareSummary,
  monthlySavings,
}: {
  shareId: string | null;
  shareTitle: string;
  shareSummary: string;
  monthlySavings: number;
}) {
  const [status, setStatus] = useState<"idle" | "link-copied" | "shared" | "unavailable">("idle");

  async function handleShare() {
    if (typeof window === "undefined") return;
    if (!shareId) {
      setStatus("unavailable");
      window.setTimeout(() => setStatus("idle"), 2500);
      return;
    }

    const shareUrl = `${window.location.origin}/audit/${shareId}`;
    const savingsLine =
      monthlySavings > 0
        ? `Potential opportunity: about ${formatCurrency(monthlySavings)}/month (directional).`
        : "No major savings gap modeled on this pass.";
    const text = [shareSummary.trim(), savingsLine, shareUrl].filter(Boolean).join("\n\n");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareSummary.trim()}\n\n${savingsLine}`,
          url: shareUrl,
        });
        setStatus("shared");
        window.setTimeout(() => setStatus("idle"), 2200);
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("link-copied");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setStatus("link-copied");
        window.setTimeout(() => setStatus("idle"), 2200);
      } catch {
        setStatus("idle");
      }
    }
  }

  const label =
    status === "link-copied"
      ? "Audit report link copied"
      : status === "shared"
        ? "Share sheet completed"
        : status === "unavailable"
          ? "Run a new audit to get a share link"
          : "Share report";

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={!shareId}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition enabled:hover:border-white/25 enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Share2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      {label}
    </button>
  );
}

function NotifyOptimizationForm({
  defaultEmail,
  shareId,
  personalizedExecutiveSummary,
  summaryReady,
  monthlySavings,
  annualSavings,
  topRecommendations,
}: {
  defaultEmail: string;
  shareId: string | null;
  /** Gemini/fallback personalized narrative — must match on-page Executive summary. */
  personalizedExecutiveSummary: string;
  /** When false, email button stays disabled until personalized brief is ready. */
  summaryReady: boolean;
  monthlySavings: number;
  annualSavings: number;
  topRecommendations: string[];
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!shareId) {
      setErrorMessage("Share link is not available. Run the audit again from the start.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          share_id: shareId,
          executive_summary: personalizedExecutiveSummary,
          monthly_savings: monthlySavings,
          annual_savings: annualSavings,
          top_recommendations: topRecommendations,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!res.ok) {
        setErrorMessage(payload.error ?? "Failed to send report. Please try again later.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage("Failed to send report. Please try again later.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-sm text-emerald-200/90" role="status">
        Audit report sent successfully — check your inbox for the full summary and link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="notify-email" className="text-xs font-medium text-white/55">
            Email
          </label>
          <input
            id="notify-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={status === "loading"}
            autoComplete="email"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/25 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !shareId || !summaryReady}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0F19] transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            "Email me the report"
          )}
        </button>
      </div>
      {status === "error" && errorMessage ? (
        <p className="text-sm text-rose-300/95" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {!shareId ? (
        <p className="text-xs text-white/45">
          Complete and save an audit to generate a share link — then you can email this report.
        </p>
      ) : null}
      {shareId && !summaryReady ? (
        <p className="text-xs text-white/45">
          Wait for your personalized executive summary to finish — we&apos;ll include it in the email body.
        </p>
      ) : null}
    </form>
  );
}

function AuditResultsReport({ payload }: { payload: AuditSessionPayload }) {
  const [fetchedAiSummary, setFetchedAiSummary] = useState<string | null>(null);
  const [aiFetchCompleted, setAiFetchCompleted] = useState(false);

  const cachedAiSummary = useMemo(() => {
    if (
      payload.aiExecutiveSummary &&
      payload.aiSummaryForSavedAt &&
      payload.aiSummaryForSavedAt === payload.savedAt
    ) {
      return payload.aiExecutiveSummary;
    }
    return null;
  }, [payload]);

  useEffect(() => {
    if (cachedAiSummary !== null) return;

    let cancelled = false;
    const ctx = buildAuditSummaryContext(payload);
    const ac = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/generate-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ctx),
          signal: ac.signal,
        });
        const data = (await res.json().catch(() => ({}))) as { summary?: unknown };
        const raw = typeof data.summary === "string" ? data.summary.trim() : "";
        const text = raw.length > 0 ? raw : generateFallbackSummary(ctx);
        if (cancelled) return;
        setFetchedAiSummary(text);
        saveAuditSessionPayload({
          ...payload,
          aiExecutiveSummary: text,
          aiSummaryForSavedAt: payload.savedAt,
        });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        const fallback = generateFallbackSummary(ctx);
        setFetchedAiSummary(fallback);
        saveAuditSessionPayload({
          ...payload,
          aiExecutiveSummary: fallback,
          aiSummaryForSavedAt: payload.savedAt,
        });
      } finally {
        if (!cancelled) setAiFetchCompleted(true);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [payload, cachedAiSummary]);

  const aiExecutiveNarrative = cachedAiSummary ?? fetchedAiSummary;
  const execSummaryReady = cachedAiSummary !== null || aiFetchCompleted;

  const { report } = payload;
  const safeFindings = (report.findings ?? []).map(normalizeFinding);
  const executiveSummary =
    report.executiveSummary ??
    "Your spend profile has been analyzed against pricing benchmarks and optimization rules.";

  const totalMonthly = report.totalMonthlySavings;
  const totalAnnual = report.totalAnnualSavings;
  const totalCurrentSpend = safeFindings.reduce((sum, f) => sum + f.currentSpend, 0);
  const totalOptimizedSpend = Math.max(0, safeFindings.reduce((sum, f) => sum + f.optimizedSpend, 0));
  const noModeledSavings = totalMonthly <= 0;

  const narrativeSource = aiExecutiveNarrative ?? executiveSummary;

  const topRecommendationsForEmail: string[] = (() => {
    const fromBullets = (report.summaryBullets ?? []).filter(
      (b): b is string => typeof b === "string" && b.trim().length > 0,
    );
    if (fromBullets.length > 0) return fromBullets.slice(0, 5);
    return [...safeFindings]
      .sort((a, b) => b.monthlySavings - a.monthlySavings)
      .slice(0, 5)
      .map((f) => f.oneSentenceReason || f.optimizationSummary)
      .filter((s) => s.trim().length > 0);
  })();

  function handleDownloadPdf() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <AppShell>
      <AuditTopNav />
      <main className="mx-auto w-full max-w-xl px-6 pb-24 pt-8 print:m-0 print:max-w-none print:bg-[#0B0F19] print:p-0 print:[print-color-adjust:exact] md:max-w-3xl md:px-8">
        <header className="relative mb-10 print:mb-6">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_70%_30%,rgba(139,92,246,0.35),rgba(56,189,248,0.12),transparent_65%)] blur-2xl print:hidden"
            aria-hidden
          />

          {noModeledSavings ? (
            <div className="relative pt-1">
              <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                Your stack looks efficient at retail pricing
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
                No major gap modeled against published list pricing for your current inputs.
              </p>
            </div>
          ) : (
            <div className="relative pt-1">
              <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                About{" "}
                <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-sky-400 bg-clip-text text-transparent">
                  {formatCurrency(totalMonthly)}
                </span>
                <span className="text-white">/month</span> on the table
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
                Modeled opportunity vs retail list prices for the tools, plans, and seats you entered—see the personalized
                brief below before per-tool actions.
              </p>
            </div>
          )}
        </header>

        <div className="mb-10 grid grid-cols-1 gap-3 print:mb-6 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Total reported spend</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">{formatCurrency(totalCurrentSpend)}</p>
            <p className="mt-1 text-xs text-white/40">Per month across enabled tools</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Potential monthly savings</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-400">{formatCurrency(totalMonthly)}</p>
            <p className="mt-1 text-xs text-white/40">Retail benchmark opportunity</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">Potential annual impact</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-200">{formatCurrency(totalAnnual)}</p>
            <p className="mt-1 text-xs text-emerald-200/50">If monthly improvements hold</p>
          </div>
        </div>

        <SpendOverviewCharts
          className="print:mb-6"
          currentMonthly={totalCurrentSpend}
          optimizedMonthly={totalOptimizedSpend}
          monthlySavings={totalMonthly}
          annualSavings={totalAnnual}
        />

        <section
          className="mb-10 rounded-xl border border-white/10 bg-white/3 p-5 shadow-inner shadow-black/20 print:mb-6 print:break-inside-avoid sm:p-6"
          aria-labelledby="personalized-summary-heading"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="personalized-summary-heading"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/90"
            >
              Personalized summary
            </h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/45">
              Brief
            </span>
          </div>
          {execSummaryReady ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {narrativeSource}{" "}
              <span className="text-slate-500">
                Based on published retail benchmarks and the plans and seats you shared—not a vendor quote.
              </span>
            </p>
          ) : (
            <div className="mt-4 space-y-2.5" aria-busy="true" aria-live="polite">
              <div className="h-3 w-full max-w-2xl animate-pulse rounded-md bg-white/10" />
              <div className="h-3 w-full max-w-xl animate-pulse rounded-md bg-white/10" />
              <div className="h-3 w-full max-w-lg animate-pulse rounded-md bg-white/10" />
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                Generating your personalized summary…
              </div>
            </div>
          )}
          <p className="mt-4 text-[11px] leading-snug text-slate-500">
            Narration only—savings and tool cards come from the deterministic audit engine.
          </p>
        </section>

        <div className="mb-4 flex items-end justify-between gap-4 print:mb-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/45">Recommendations</h2>
            <p className="mt-1 text-xs text-white/35">
              Grounded in retail benchmarks—prioritized by impact on your stack.
            </p>
          </div>
        </div>

        <div className="space-y-4 print:space-y-3">
          {safeFindings.map((finding) => (
            <AuditActionPlanCard key={finding.toolId} finding={finding} teamSize={payload.teamSize} />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 print:hidden sm:grid-cols-2">
          <ShareAuditReportButton
            shareId={payload.shareId}
            shareTitle="SpendScope AI spend audit"
            shareSummary={narrativeSource}
            monthlySavings={totalMonthly}
          />
          <button
            type="button"
            onClick={handleDownloadPdf}
            aria-label="Download report as PDF using your browser print dialog"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-semibold text-white/95 shadow-sm transition hover:border-white/28 hover:bg-white/15"
          >
            <Download className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            Download report
          </button>
        </div>

        <Link
          href="/audit"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 print:hidden"
        >
          Update inputs &amp; rerun audit
          <ArrowRight className="h-4 w-4" />
        </Link>

        <GlassCard className="mt-8 border-white/10 bg-white/4 p-5 print:hidden">
          <p className="text-sm font-medium text-white/85">
            We&apos;ll send a detailed copy of your audit report to your email.
          </p>
          <div className="mt-4">
            <NotifyOptimizationForm
              defaultEmail={payload.email}
              shareId={payload.shareId}
              personalizedExecutiveSummary={narrativeSource}
              summaryReady={execSummaryReady}
              monthlySavings={totalMonthly}
              annualSavings={totalAnnual}
              topRecommendations={topRecommendationsForEmail}
            />
          </div>
        </GlassCard>

        <p className="mx-auto mt-10 max-w-lg text-center text-[11px] leading-relaxed text-white/38">
          Recommendations use published retail benchmarks and the seats and plans you entered—validate against invoices
          before renewal.
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 border-t border-white/10 pt-8 print:hidden sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/"
            onClick={clearAuditFormStorage}
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
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">No report yet</p>
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

  return <AuditResultsReport key={payload.savedAt} payload={payload} />;
}

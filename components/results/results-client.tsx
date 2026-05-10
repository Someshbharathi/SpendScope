"use client";

import { startTransition, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Share2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuditActionPlanCard } from "@/components/audit/audit-action-plan-card";
import { AuditTopNav } from "@/components/audit/audit-top-nav";
import { GlassCard } from "@/components/audit/glass-card";
import { SpendOverviewCharts } from "@/components/results/spend-overview-charts";
import type { AuditSessionPayload } from "@/lib/audit-types";
import { normalizeFinding } from "@/lib/audit-report-normalize";
import { formatCurrency } from "@/lib/format-currency";
import { loadAuditSessionPayload } from "@/lib/audit-persistence";

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
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition enabled:hover:border-white/25 enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Share2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      {label}
    </button>
  );
}

function NotifyOptimizationForm({
  defaultEmail,
  shareId,
  executiveSummary,
  monthlySavings,
  annualSavings,
  topRecommendations,
}: {
  defaultEmail: string;
  shareId: string | null;
  executiveSummary: string;
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
          executive_summary: executiveSummary,
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
          disabled={status === "loading" || !shareId}
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
    </form>
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

  const { report } = payload;
  const safeFindings = (report.findings ?? []).map(normalizeFinding);
  const executiveSummary =
    report.executiveSummary ??
    "Your spend profile has been analyzed against pricing benchmarks and optimization rules.";

  const totalMonthly = report.totalMonthlySavings;
  const totalAnnual = report.totalAnnualSavings;
  const totalCurrentSpend = safeFindings.reduce((sum, f) => sum + f.currentSpend, 0);
  const totalOptimizedSpend = Math.max(0, safeFindings.reduce((sum, f) => sum + f.optimizedSpend, 0));
  const highSavings = totalMonthly >= 500;
  const noModeledSavings = totalMonthly <= 0;

  const execSnippet = executiveSummary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

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

  return (
    <AppShell>
      <AuditTopNav />
      <main className="mx-auto w-full max-w-xl px-6 pb-24 pt-8 md:max-w-3xl md:px-8">
        <header className="mb-10 space-y-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300/75">Audit results</p>
          {noModeledSavings ? (
            <>
              <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                Your stack looks efficient at retail pricing
              </h1>
              <p className="text-sm leading-relaxed text-white/55">
                We didn&apos;t surface a material gap versus published pricing for what you entered—rerun when seats or
                usage shifts meaningfully.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                About{" "}
                <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-sky-400 bg-clip-text text-transparent">
                  {formatCurrency(totalMonthly)}
                </span>
                <span className="text-white/90">/month</span> on the table
              </h1>
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
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-400">{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-white/40">Retail benchmark opportunity</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">Potential annual impact</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-200">{formatCurrency(totalAnnual)}</p>
            <p className="text-xs text-emerald-200/50">If monthly improvements hold</p>
          </div>
        </div>

        <SpendOverviewCharts
          currentMonthly={totalCurrentSpend}
          optimizedMonthly={totalOptimizedSpend}
          monthlySavings={totalMonthly}
          annualSavings={totalAnnual}
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
            <AuditActionPlanCard key={finding.toolId} finding={finding} teamSize={payload.teamSize} />
          ))}
        </div>

        <ShareAuditReportButton
          shareId={payload.shareId}
          shareTitle="SpendScope AI spend audit"
          shareSummary={execSnippet || executiveSummary}
          monthlySavings={totalMonthly}
        />

        <Link
          href="/audit"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
        >
          Update inputs &amp; rerun audit
          <ArrowRight className="h-4 w-4" />
        </Link>

        <GlassCard className="mt-8 border-white/10 bg-white/4 p-5">
          <p className="text-sm font-medium text-white/85">
            We&apos;ll send a detailed copy of your audit report to your email.
          </p>
          <div className="mt-4">
            <NotifyOptimizationForm
              defaultEmail={payload.email}
              shareId={payload.shareId}
              executiveSummary={executiveSummary}
              monthlySavings={totalMonthly}
              annualSavings={totalAnnual}
              topRecommendations={topRecommendationsForEmail}
            />
          </div>
        </GlassCard>

        {highSavings ? (
          <p className="mt-6 text-center text-sm">
            <Link
              href="/audit"
              className="font-medium text-cyan-300 underline-offset-2 transition hover:text-cyan-200 hover:underline"
            >
              Explore infrastructure credits (Credex)
            </Link>
          </p>
        ) : null}

        <p className="mt-10 max-w-lg mx-auto text-center text-[11px] leading-relaxed text-white/38">
          Recommendations use published retail benchmarks and the seats and plans you entered—validate against invoices
          before renewal.
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-center">
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

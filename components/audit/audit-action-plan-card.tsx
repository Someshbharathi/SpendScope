"use client";

import type { RecommendationActionType, ToolAuditFinding } from "@/lib/audit-types";

const ACTION_LABEL: Record<RecommendationActionType, string> = {
  "Downgrade Plan": "Downgrade plan",
  "Alternative Tool": "Alternative tool",
  "Optimize Seats": "Optimize seats",
  "Use Credits": "Credits & commits",
  "Reduce API Spend": "Reduce usage / API spend",
  "Already Optimized": "Already optimized",
};
import { formatCurrency } from "@/lib/format-currency";
import {
  narrativeFinancialContext,
  narrativePlanEyebrow,
  narrativeProblem,
  narrativeSeverityLabel,
  narrativeWhatToReview,
  savingsHeadline,
} from "@/lib/results-narrative";

function actionAccentClass(action: RecommendationActionType): string {
  switch (action) {
    case "Downgrade Plan":
      return "border-l-4 border-l-emerald-400";
    case "Alternative Tool":
      return "border-l-4 border-l-violet-400";
    case "Optimize Seats":
      return "border-l-4 border-l-blue-400";
    case "Use Credits":
      return "border-l-4 border-l-cyan-400";
    case "Reduce API Spend":
      return "border-l-4 border-l-amber-400";
    default:
      return "border-l-4 border-l-white/20";
  }
}

export function AuditActionPlanCard({
  finding,
  teamSize,
}: {
  finding: ToolAuditFinding;
  teamSize: number;
}) {
  const hasSavings = finding.monthlySavings > 0;
  const severity = narrativeSeverityLabel(finding.spendClassification);
  const eyebrow = narrativePlanEyebrow(finding);
  const checklist = narrativeWhatToReview(finding);

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/4 py-5 pl-5 pr-5 sm:pl-6 ${actionAccentClass(finding.actionType)}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">{eyebrow}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-white">{finding.currentTool}</h3>
            {finding.actionType !== "Already Optimized" && severity ? (
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/55">
                {severity}
              </span>
            ) : null}
          </div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">
            {ACTION_LABEL[finding.actionType]}
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          {hasSavings ? (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 sm:border-0 sm:bg-transparent sm:p-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/75">Potential savings</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
                Save ~{formatCurrency(finding.monthlySavings)}/mo
              </p>
              <p className="text-xs text-emerald-200/65">~{formatCurrency(finding.annualSavings)} per year</p>
            </div>
          ) : (
            <p className="text-sm font-medium leading-snug text-white/50">No major gap vs retail in this pass</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-5 border-t border-white/10 pt-5">
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">What we&apos;re seeing</p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{narrativeProblem(finding, teamSize)}</p>
        </section>

        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Financial context</p>
          <p className="mt-2 text-sm leading-relaxed text-white/65">{narrativeFinancialContext(finding)}</p>
        </section>

        {finding.optimizationSummary ? (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Recommendation</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{finding.optimizationSummary}</p>
          </section>
        ) : null}

        {finding.oneSentenceReason ? (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Summary</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{finding.oneSentenceReason}</p>
          </section>
        ) : null}

        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">What to review next</p>
          <ul className="mt-2 list-none space-y-2 text-sm leading-relaxed text-white/75">
            {checklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/70" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {finding.potentialPricingAnomaly ? (
        <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
          This line stands out vs typical retail—reconcile invoices, API usage, and seat assignments before you renew.
        </p>
      ) : null}

      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Current vs recommended</p>
        {finding.actionType === "Already Optimized" ? (
          <div className="mt-3 max-w-md rounded-lg border border-white/10 bg-white/5 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Current setup</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">
              {formatCurrency(finding.currentSpend)}
              <span className="text-xs font-normal text-white/45">/mo</span>
            </p>
            <p className="mt-1 text-xs text-white/45">{finding.currentPlan}</p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Current setup</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                {formatCurrency(finding.currentSpend)}
                <span className="text-xs font-normal text-white/45">/mo</span>
              </p>
              <p className="mt-1 text-xs text-white/45">{finding.currentTool} · {finding.currentPlan}</p>
            </div>
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">Recommended</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-300">
                ~{formatCurrency(finding.optimizedSpend)}
                <span className="text-xs font-normal text-emerald-200/65">/mo</span>
              </p>
              <p className="mt-1 text-xs text-emerald-200/70">
                {finding.recommendedTool} · {finding.recommendedPlan}
              </p>
            </div>
          </div>
        )}
      </div>

      {hasSavings ? (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-100/95">
            {savingsHeadline(finding.monthlySavings, finding.annualSavings)}
          </p>
          <p className="mt-1 text-xs text-emerald-200/55">Directional estimate from retail benchmarks—not a quote.</p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { startTransition, useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuditTopNav } from "@/components/audit/audit-top-nav";
import { GlassCard } from "@/components/audit/glass-card";
import type {
  AuditDimensionSummary,
  AuditSessionPayload,
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

function formatYAxisTick(v: number): string {
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  if (v >= 1) return formatCurrency(v);
  return "$0";
}

function clientToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function SpendOverviewCharts({
  currentMonthly,
  optimizedMonthly,
  monthlySavings,
  annualSavings,
}: {
  currentMonthly: number;
  optimizedMonthly: number;
  monthlySavings: number;
  annualSavings: number;
}) {
  const gid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  const max = Math.max(currentMonthly, optimizedMonthly, 1);
  const currentPct = Math.min(100, Math.round((currentMonthly / max) * 100));
  const afterPct = Math.min(100, Math.round((optimizedMonthly / max) * 100));

  const W = 560;
  const H = 248;
  const padL = 56;
  const padR = 14;
  const padT = 44;
  const padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const baselineY = padT + chartH;

  const yMax = Math.max(12 * currentMonthly, 12 * optimizedMonthly, 1) * 1.06;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const xAt = (i: number) => padL + (i / 11) * chartW;
  const yAt = (cumulative: number) => baselineY - (cumulative / yMax) * chartH;

  const currentPts: string[] = [];
  const optPts: string[] = [];
  for (let i = 0; i < 12; i++) {
    const cumC = (i + 1) * currentMonthly;
    const cumO = (i + 1) * optimizedMonthly;
    currentPts.push(`${xAt(i)},${yAt(cumC)}`);
    optPts.push(`${xAt(i)},${yAt(cumO)}`);
  }
  const currentLine = currentPts.join(" ");
  const optLine = optPts.join(" ");

  const optimizedAreaUnder =
    optPts.length >= 12 ? `${padL},${baselineY} ${optLine} ${padL + chartW},${baselineY}` : "";

  let savingsBand = "";
  if (monthlySavings > 0 && currentPts.length === 12 && optPts.length === 12) {
    const forward = currentPts.join(" ");
    const backward = [...optPts].reverse().join(" ");
    savingsBand = `${forward} ${backward}`;
  }

  const gridTicks = 5;
  const gridLines: { y: number; label: string }[] = [];
  for (let g = 0; g < gridTicks; g++) {
    const v = (g / (gridTicks - 1)) * yMax;
    gridLines.push({ y: yAt(v), label: formatYAxisTick(v) });
  }

  function setHoverFromClient(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const p = clientToSvgPoint(svg, clientX, clientY);
    if (!p) return;
    if (p.x < padL || p.x > padL + chartW || p.y < padT || p.y > baselineY) {
      setHoverMonth(null);
      return;
    }
    const t = (p.x - padL) / chartW;
    const idx = Math.min(11, Math.max(0, Math.round(t * 11)));
    setHoverMonth(idx);
  }

  return (
    <section
      className="mb-10 rounded-xl border border-white/10 bg-white/4 p-5"
      aria-label="Spend and modeled savings overview"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Spend vs modeled after</p>
      <p className="mt-1 text-xs leading-relaxed text-white/45">
        Stack-wide reported monthly spend vs modeled monthly run-rate after the recommendations below.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-1.5 flex justify-between gap-2 text-xs">
            <span className="text-white/55">Current (reported)</span>
            <span className="shrink-0 tabular-nums font-medium text-white/90">{formatCurrency(currentMonthly)}/mo</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white/45 transition-[width] duration-500"
              style={{ width: `${currentPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between gap-2 text-xs">
            <span className="text-white/55">After (modeled)</span>
            <span className="shrink-0 tabular-nums font-medium text-emerald-300">{formatCurrency(optimizedMonthly)}/mo</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400/90 transition-[width] duration-500"
              style={{ width: `${afterPct}%` }}
            />
          </div>
        </div>
      </div>

      {monthlySavings > 0 ? (
        <p className="mt-4 text-center text-xs text-white/50">
          Modeled gap:{" "}
          <span className="font-semibold text-emerald-300">{formatCurrency(monthlySavings)}/mo</span>
          {" · "}
          <span className="text-white/45">{formatCurrency(annualSavings)} over 12 mo</span>
        </p>
      ) : (
        <p className="mt-4 text-center text-xs text-white/45">No modeled monthly gap for this audit snapshot.</p>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Cumulative spend (12 months)
        </p>
        <p className="mt-1 text-xs text-white/45">
          Straight-line model: same monthly spend each month, stacked through December. Shaded band is modeled savings
          vs staying on today&apos;s trajectory.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" aria-hidden />
            Current trajectory
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
            Optimized path
          </span>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="mt-4 h-auto w-full max-w-full touch-none"
          role="img"
          aria-label="Twelve month cumulative spend: current versus optimized"
        >
          <title>Twelve month cumulative spend: current versus optimized</title>
          <defs>
            <linearGradient id={`trajOptFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {gridLines.map(({ y, label }, g) => (
            <g key={`grid-${g}`}>
              <line
                x1={padL}
                y1={y}
                x2={padL + chartW}
                y2={y}
                stroke="rgb(255 255 255 / 0.08)"
                strokeWidth="1"
                strokeDasharray="4 5"
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.38)"
                fontSize="10"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {label}
              </text>
            </g>
          ))}

          <line
            x1={padL}
            y1={baselineY}
            x2={padL + chartW}
            y2={baselineY}
            stroke="rgb(255 255 255 / 0.14)"
            strokeWidth="1"
          />

          {monthlySavings > 0 && savingsBand ? (
            <polygon fill="rgb(34 197 94 / 0.14)" points={savingsBand} />
          ) : null}

          {optimizedAreaUnder ? (
            <polygon fill={`url(#trajOptFill-${gid})`} points={optimizedAreaUnder} />
          ) : null}

          <polyline
            fill="none"
            stroke="rgb(148 163 184)"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={currentLine}
          />
          <polyline
            fill="none"
            stroke="rgb(56 189 248)"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={optLine}
          />

          {hoverMonth !== null ? (
            (() => {
              const hx = xAt(hoverMonth);
              const cumC = (hoverMonth + 1) * currentMonthly;
              const cumO = (hoverMonth + 1) * optimizedMonthly;
              const hyC = yAt(cumC);
              const hyO = yAt(cumO);
              const tooltipLeft = hx > padL + chartW * 0.55;
              const tx = tooltipLeft ? hx - 156 : hx + 10;
              const ty = Math.max(padT + 2, Math.min(hyC, hyO) - 54);
              const curRounded = Math.round(cumC);
              const optRounded = Math.round(cumO);
              return (
                <g pointerEvents="none">
                  <line
                    x1={hx}
                    y1={padT}
                    x2={hx}
                    y2={baselineY}
                    stroke="rgba(255,255,255,0.42)"
                    strokeWidth="1"
                  />
                  <circle cx={hx} cy={hyC} r="5" fill="#0b0f14" stroke="rgb(148 163 184)" strokeWidth="2" />
                  <circle cx={hx} cy={hyO} r="5" fill="#0b0f14" stroke="rgb(56 189 248)" strokeWidth="2" />
                  <g transform={`translate(${tx}, ${ty})`}>
                    <rect
                      width="152"
                      height="74"
                      rx="8"
                      fill="rgba(15, 20, 30, 0.96)"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="1"
                    />
                    <text x="10" y="20" fill="#ffffff" fontSize="12" fontWeight="600" fontFamily="ui-sans-serif, system-ui, sans-serif">
                      {months[hoverMonth]}
                    </text>
                    <text
                      x="10"
                      y="38"
                      fill="rgba(226,232,240,0.8)"
                      fontSize="10"
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                    >
                      {`Current trajectory: ${curRounded.toLocaleString("en-US")}`}
                    </text>
                    <text
                      x="10"
                      y="54"
                      fill="rgb(125 211 252)"
                      fontSize="10"
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                    >
                      {`Optimized path: ${optRounded.toLocaleString("en-US")}`}
                    </text>
                  </g>
                </g>
              );
            })()
          ) : null}

          {months.map((m, i) => (
            <text
              key={m}
              x={xAt(i)}
              y={H - 10}
              textAnchor="middle"
              fill="rgba(255,255,255,0.38)"
              fontSize="9"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {m}
            </text>
          ))}

          <rect
            x={padL}
            y={padT}
            width={chartW}
            height={chartH}
            fill="transparent"
            className="cursor-crosshair"
            onMouseMove={(e) => setHoverFromClient(e.clientX, e.clientY)}
            onMouseLeave={() => setHoverMonth(null)}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (t) setHoverFromClient(t.clientX, t.clientY);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (t) setHoverFromClient(t.clientX, t.clientY);
            }}
            onTouchEnd={() => setHoverMonth(null)}
          />
        </svg>
      </div>
    </section>
  );
}

/** Left accent on action cards — matches mockup differentiation. */
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

function isDryPricingWorksheetLine(line: string): boolean {
  const t = line.trim();
  if (/^List math:/i.test(t)) return true;
  if (/^Downgrade target at list:/i.test(t)) return true;
  if (/^Vendor list benchmark:/i.test(t)) return true;
  if (/^Comparable list spend for this configuration/i.test(t)) return true;
  if (/^See vendor list pricing:/i.test(t)) return true;
  return false;
}

/** One neutral line above the plan comparison — no marketing headline. */
function alternativePanelIntro(action: RecommendationActionType): string {
  switch (action) {
    case "Downgrade Plan":
      return "Same vendor — a plan that fits how many seats you actually need.";
    case "Alternative Tool":
      return "Different vendor or plan. Figures compare list pricing for the alternative to your reported spend.";
    case "Optimize Seats":
      return 'Paid seats exceed team size: the "After" column reflects fewer seats at the implied per-seat rate you reported.';
    case "Use Credits":
      return "Effective spend after credits, commits, and usage controls vs paying full retail run-rate.";
    case "Reduce API Spend":
      return 'Reported spend above list benchmark: the modeled "After" run-rate assumes usage and billing hygiene.';
    default:
      return "No stronger change modeled at public list rates for this line item.";
  }
}

/** Bottom line: direct, imperative — not a button, plain copy. */
function imperativeCallout(finding: ToolAuditFinding): string | null {
  if (finding.actionType === "Already Optimized") return null;
  switch (finding.actionType) {
    case "Downgrade Plan":
      return `A move to ${finding.recommendedPlan} may fit better than ${finding.currentPlan} at published list rates for your seats — worth confirming before renewal.`;
    case "Alternative Tool":
      return `${finding.recommendedTool} is worth a look for this workload; list pricing may sit more comfortably than your current line.`;
    case "Optimize Seats":
      return "If paid seats exceed active headcount, trimming to match can lower cost without changing vendors.";
    case "Use Credits":
      return "Credits, commits, and billing hygiene can bring effective spend closer to list — useful to review before the next invoice.";
    case "Reduce API Spend":
      return "Usage, add-ons, and API spend are the usual levers when run-rate sits above list benchmark — a good topic for your next finance pass.";
    default:
      return null;
  }
}

/** Up to two short lines: what’s wrong with the current plan (or why it’s fine). */
function actionPlanWhyLines(finding: ToolAuditFinding): string[] {
  if (finding.actionType === "Already Optimized") {
    const lines = [
      "No meaningful list-price gap vs your reported spend and seat count.",
      "Revisit at renewal if usage or team size shifts materially.",
    ];
    if (
      finding.spendClassification &&
      finding.spendClassification !== "Already Optimized" &&
      finding.benchmarkSpendMonthly != null
    ) {
      lines[0] = `Spend runs above the ~${formatCurrency(finding.benchmarkSpendMonthly)}/mo list benchmark — we didn’t model a stronger same-vendor lever.`;
    }
    return lines;
  }
  const out: string[] = [];
  const summary = finding.optimizationSummary?.trim();
  if (summary && !isDryPricingWorksheetLine(summary)) out.push(summary);
  for (const r of finding.reasoning) {
    if (!r || isDryPricingWorksheetLine(r)) continue;
    if (out.length >= 2) break;
    if (r !== out[0]) out.push(r);
  }
  if (out.length === 0 && finding.oneSentenceReason && !isDryPricingWorksheetLine(finding.oneSentenceReason)) {
    out.push(finding.oneSentenceReason);
  }
  if (out.length === 0) {
    out.push(
      `Your ${finding.currentPlan} line looks heavier than typical list pricing for this seat count — there’s room to tighten.`,
    );
  }
  if (out.length === 1 && finding.monthlySavings > 0) {
    out.push("Act before the next renewal so the lower run-rate sticks.");
  }
  return out.slice(0, 2);
}

function defaultDimensions(): AuditDimensionSummary {
  return {
    planSuitability: "Evaluation not available for this report version.",
    cheaperSameVendor: "—",
    alternativeTool: "—",
    creditsVsRetail: "—",
  };
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
  const reasoning =
    finding.reasoning ??
    (finding as { reasons?: string[] }).reasons ??
    ["No detailed reasoning available for this older report."];
  const oneSentenceReason =
    finding.oneSentenceReason ??
    (Array.isArray(reasoning) && reasoning[0] ? reasoning[0] : finding.optimizationSummary ?? "");

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
    benchmarkSpendMonthly: finding.benchmarkSpendMonthly ?? null,
    spendRatio: finding.spendRatio ?? null,
    spendClassification: finding.spendClassification ?? "Already Optimized",
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
    oneSentenceReason,
    reasoning,
    optimizationSummary:
      finding.optimizationSummary ??
      "This recommendation was loaded from an earlier report format.",
    dimensions: finding.dimensions ?? defaultDimensions(),
    potentialPricingAnomaly: Boolean(finding.potentialPricingAnomaly),
    recommendationBadges: normalizeRecommendationBadges(finding.recommendationBadges, actionType),
  };
}

function ActionPlanCard({ finding }: { finding: ToolAuditFinding }) {
  const hasSavings = finding.monthlySavings > 0;
  const why = actionPlanWhyLines(finding);
  const panelIntro = alternativePanelIntro(finding.actionType);
  const demand = imperativeCallout(finding);

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/4 py-5 pl-5 pr-5 sm:pl-6 ${actionAccentClass(finding.actionType)}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-white">{finding.currentTool}</h3>
          <p className="text-sm text-white/50">
            Current: <span className="text-white/80">{finding.currentPlan}</span>
            {finding.benchmarkSpendMonthly != null ? (
              <>
                {" "}
                · List benchmark ~{formatCurrency(finding.benchmarkSpendMonthly)}/mo
              </>
            ) : null}
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          {hasSavings ? (
            <p className="text-lg font-semibold tabular-nums text-emerald-400">
              −{formatCurrency(finding.monthlySavings)}/mo
            </p>
          ) : (
            <p className="text-sm font-medium text-white/40">$0 /mo</p>
          )}
          {hasSavings ? (
            <p className="text-xs text-white/40">{formatCurrency(finding.annualSavings)} saved / yr</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        {why.map((line) => (
          <p key={line} className="text-sm leading-relaxed text-white/65">
            {line}
          </p>
        ))}
        {finding.potentialPricingAnomaly ? (
          <p className="text-xs font-medium text-amber-200/90">
            Flag: reconcile this line item against invoices, API overages, and seat assignments before renewal.
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/3 px-4 py-3">
        <p className="text-xs leading-relaxed text-white/55">{panelIntro}</p>

        {finding.actionType === "Already Optimized" ? (
          <p className="mt-3 text-sm font-medium text-white/75">
            {finding.currentTool} · {finding.currentPlan} — ~{formatCurrency(finding.currentSpend)}/mo
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm font-medium text-white/90">
              {finding.recommendedTool} · {finding.recommendedPlan}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Today</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-white/80">
                  {formatCurrency(finding.currentSpend)}
                  <span className="text-xs font-normal text-white/45">/mo</span>
                </p>
                <p className="text-[11px] text-white/45">{finding.currentPlan}</p>
              </div>
              <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">After</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-300">
                  ~{formatCurrency(finding.optimizedSpend)}
                  <span className="text-xs font-normal text-emerald-200/70">/mo</span>
                </p>
                <p className="text-[11px] text-emerald-200/65">{finding.recommendedPlan}</p>
              </div>
            </div>
            {hasSavings ? (
              <p className="mt-3 text-xs leading-relaxed text-white/55">
                <span className="font-semibold text-emerald-300">~{formatCurrency(finding.monthlySavings)}/mo</span>{" "}
                modeled vs staying on today&apos;s run-rate (list-based estimate).
              </p>
            ) : null}
          </>
        )}
      </div>

      {demand ? (
        <p className="mt-4 border-t border-white/10 pt-4 text-sm font-medium leading-relaxed text-white/65">
          {demand}
        </p>
      ) : null}
    </div>
  );
}

function NotifyOptimizationForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    console.log("[Credex] Notify optimization signup", { email: trimmed });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-sm text-emerald-200/90">
        You&apos;re on the list — we&apos;ll notify you when new optimizations match your stack.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/25"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0F19] transition hover:bg-white/95"
      >
        Notify me
      </button>
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
  const pricingAsOf = report.pricingDataAsOf ?? "—";
  const pricingRef = report.pricingDataReference ?? "See PRICING_DATA.md for vendor URLs and list prices.";

  const totalMonthly = report.totalMonthlySavings;
  const totalAnnual = report.totalAnnualSavings;
  const totalCurrentSpend = safeFindings.reduce((sum, f) => sum + f.currentSpend, 0);
  const totalOptimizedSpend = Math.max(0, safeFindings.reduce((sum, f) => sum + f.optimizedSpend, 0));
  const lowSavings = totalMonthly < 100;
  const highSavings = totalMonthly >= 500;

  const execSnippet = executiveSummary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

  return (
    <AppShell>
      <AuditTopNav />
      <main className="mx-auto w-full max-w-xl px-6 pb-24 pt-8 md:max-w-3xl md:px-8">
        <header className="mb-10 space-y-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300/75">Audit results</p>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
            You can save{" "}
            <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-sky-400 bg-clip-text text-transparent">
              {formatCurrency(totalMonthly)}
            </span>
            <span className="text-white/90">/month</span>
          </h1>
          <p className="text-sm leading-relaxed text-white/55">{execSnippet || executiveSummary}</p>
        </header>

        <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Current spend</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">{formatCurrency(totalCurrentSpend)}</p>
            <p className="text-xs text-white/40">per month (reported)</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Monthly savings</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-400">{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-white/40">modeled optimized</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">Annual savings</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-200">{formatCurrency(totalAnnual)}</p>
            <p className="text-xs text-emerald-200/50">12-mo run-rate</p>
          </div>
        </div>

        <SpendOverviewCharts
          currentMonthly={totalCurrentSpend}
          optimizedMonthly={totalOptimizedSpend}
          monthlySavings={totalMonthly}
          annualSavings={totalAnnual}
        />

        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/45">Action plan</h2>
        </div>

        <div className="space-y-4">
          {safeFindings.map((finding) => (
            <ActionPlanCard key={finding.toolId} finding={finding} />
          ))}
        </div>

        <Link
          href="/audit"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
        >
          Update inputs &amp; rerun audit
          <ArrowRight className="h-4 w-4" />
        </Link>

        {lowSavings ? (
          <GlassCard className="mt-8 border-white/10 bg-white/4 p-5">
            <p className="text-sm font-medium text-white/85">Stay on the list</p>
            <p className="mt-1 text-xs text-white/50">
              We&apos;ll email when new benchmarks fit your stack. Low modeled savings means we&apos;re not inflating
              numbers.
            </p>
            <div className="mt-4">
              <NotifyOptimizationForm defaultEmail={payload.email} />
            </div>
          </GlassCard>
        ) : null}

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

        <p className="mt-10 text-center text-[11px] leading-relaxed text-white/30">
          Benchmarks as of {pricingAsOf}. {pricingRef}
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/audit"
            className="text-center text-sm text-white/50 underline-offset-4 transition hover:text-white hover:underline sm:text-left"
          >
            Edit audit inputs
          </Link>
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

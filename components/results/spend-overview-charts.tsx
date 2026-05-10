"use client";

import { useId, useRef, useState } from "react";

import { formatCurrency } from "@/lib/format-currency";

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

export function SpendOverviewCharts({
  currentMonthly,
  optimizedMonthly,
  monthlySavings,
  annualSavings,
  className,
}: {
  currentMonthly: number;
  optimizedMonthly: number;
  monthlySavings: number;
  annualSavings: number;
  className?: string;
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
      className={`mb-10 rounded-xl border border-white/10 bg-white/4 p-5 print:break-inside-auto print:border-white/15 print:bg-white/5 print:[print-color-adjust:exact] ${className ?? ""}`.trim()}
      aria-label="Spend outlook"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Spend outlook</p>
      <p className="mt-1 text-xs leading-relaxed text-white/45">
        How your reported stack compares to an optimized retail run-rate—same methodology finance teams use for renewal
        prep.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-1.5 flex justify-between gap-2 text-xs">
            <span className="text-white/55">Your stack today</span>
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
            <span className="text-white/55">Optimized estimate</span>
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
        <p className="mt-4 text-center text-sm text-white/55">
          <span className="font-medium text-emerald-300/95">Potential opportunity:</span> save about{" "}
          <span className="font-semibold tabular-nums text-emerald-300">{formatCurrency(monthlySavings)}</span>/month (
          <span className="tabular-nums text-white/50">{formatCurrency(annualSavings)}</span> over 12 months at current
          trajectory).
        </p>
      ) : (
        <p className="mt-4 text-center text-xs text-white/45">
          No material gap surfaced between reported spend and this retail benchmark pass.
        </p>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Cumulative spend (12 months)
        </p>
        <p className="mt-1 text-xs text-white/45">
          Same monthly cadence through year-end—useful for directional planning, not a forecast.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" aria-hidden />
            Reported trajectory
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
            Optimized trajectory
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
                      {`Reported: ${curRounded.toLocaleString("en-US")}`}
                    </text>
                    <text
                      x="10"
                      y="54"
                      fill="rgb(125 211 252)"
                      fontSize="10"
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                    >
                      {`Optimized estimate: ${optRounded.toLocaleString("en-US")}`}
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

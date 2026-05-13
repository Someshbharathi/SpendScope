"use client";

import { GlassModal } from "@/components/ui/glass-modal";

const BENCHMARK_TOOLS = [
  "Cursor",
  "ChatGPT",
  "Claude",
  "OpenAI API",
  "Anthropic API",
  "GitHub Copilot",
  "Gemini",
  "Windsurf",
] as const;

const ANALYSIS_CARDS = [
  {
    title: "Plan Fit Analysis",
    body: "We evaluate whether your subscription tier matches your team size and usage pattern.",
  },
  {
    title: "Overspending Detection",
    body: "We compare your spend against benchmark pricing ranges for similar teams and workflows.",
  },
  {
    title: "Alternative Tool Recommendations",
    body: "We evaluate lower-cost tools with similar capabilities for your use case.",
  },
] as const;

type BenchmarkingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function BenchmarkingModal({ open, onClose }: BenchmarkingModalProps) {
  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="How SpendScope Benchmarks AI Spend"
      size="lg"
    >
      <div className="space-y-8 text-sm leading-relaxed text-white/75">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
            Pricing benchmark sources
          </h3>
          <p>
            SpendScope compares your AI tooling costs against publicly available pricing from official
            vendor pricing pages.
          </p>
          <div className="flex flex-wrap gap-2">
            {BENCHMARK_TOOLS.map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100/90"
              >
                {tool}
              </span>
            ))}
          </div>
          <p className="text-xs text-white/50">
            Pricing references are updated regularly using official vendor pricing documentation.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
            What we analyze
          </h3>
          <div className="grid gap-3 sm:grid-cols-1">
            {ANALYSIS_CARDS.map((card, i) => (
              <div
                key={card.title}
                className="rounded-xl border border-white/10 bg-white/4 p-4 shadow-inner shadow-black/20 ring-1 ring-emerald-500/10 sm:p-5"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-xs font-semibold text-emerald-300">
                    {i + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-white">{card.title}</h4>
                </div>
                <p className="pl-8 text-white/70">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-4 sm:p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
            Savings estimates
          </h3>
          <p>
            Savings projections are based on public pricing, benchmark assumptions, and common startup
            spending patterns.
          </p>
          <p className="text-xs text-white/45">
            Actual enterprise contracts and API usage may vary.
          </p>
        </section>

        <section
          className="rounded-xl border border-emerald-400/25 bg-emerald-500/8 p-4 sm:p-5"
          aria-label="Important note"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/90">
            Important note
          </p>
          <p className="mt-3 text-sm leading-relaxed text-emerald-50/95">
            SpendScope uses deterministic benchmark logic for pricing analysis and savings calculations.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            AI is only used for personalized executive summaries — not financial calculations.
          </p>
        </section>
      </div>
    </GlassModal>
  );
}

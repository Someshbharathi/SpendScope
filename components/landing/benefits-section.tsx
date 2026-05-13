"use client";

import { Eye, Layers, LineChart, TrendingDown } from "lucide-react";
import { motion } from "motion/react";

const benefits = [
  {
    title: "AI Spend Visibility",
    description:
      "See modeled spend for the tools, plans, and seats you enter—compared to published list benchmarks, not live billing feeds.",
    Icon: Eye,
    color: "text-blue-300",
    glow: "from-blue-500/50",
  },
  {
    title: "Cost Optimization",
    description:
      "Spot when reported run-rate drifts above list expectations so you can ask better questions before renewal—directional, not a quote.",
    Icon: TrendingDown,
    color: "text-violet-300",
    glow: "from-violet-500/50",
  },
  {
    title: "Tool Consolidation",
    description:
      "When multiple assistants are enabled with overlapping seats, the audit highlights overlap patterns worth reconciling with your team.",
    Icon: Layers,
    color: "text-fuchsia-300",
    glow: "from-fuchsia-500/50",
  },
  {
    title: "Annual Savings Insights",
    description:
      "Monthly and annual savings are modeled from benchmarks and your inputs—useful for internal prep, then validate against invoices.",
    Icon: LineChart,
    color: "text-emerald-300",
    glow: "from-emerald-500/50",
  },
];

export function BenefitsSection() {
  return (
    <section id="benefits" className="px-6 py-24 md:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-16 text-center md:text-left"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-200/70">Why teams use SpendScope</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Clarity before the renewal email</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/65 md:mx-0">
            A fast audit from what you already know—no connector required—so finance and eng can share one picture.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-linear-to-br ${benefit.glow} to-transparent blur-3xl`}
                aria-hidden
              />
              <div className="relative space-y-4">
                <div className={`inline-flex rounded-xl border border-white/10 bg-white/5 p-3 ${benefit.color}`}>
                  <benefit.Icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="text-xl font-semibold text-white">{benefit.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

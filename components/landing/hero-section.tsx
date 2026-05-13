"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { motion } from "motion/react";

const expenses = [
  { label: "ChatGPT", value: 84, color: "bg-blue-400" },
  { label: "Claude", value: 66, color: "bg-violet-400" },
  { label: "Cursor", value: 42, color: "bg-fuchsia-400" },
];

export function HeroSection() {
  return (
    <section
      id="product"
      className="flex min-h-screen items-center px-6 pt-28 md:px-10 md:pt-32 lg:px-16"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-16 py-24 md:grid-cols-2 md:gap-20 lg:gap-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-8 text-center md:text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-xs text-blue-100">
            <Zap className="h-3.5 w-3.5" />
            Benchmark-backed audit in minutes
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-tight tracking-tight md:mx-0 md:text-7xl">
            Stop{" "}
            <span className="bg-linear-to-r from-blue-300 to-violet-300 bg-clip-text text-transparent">
              Overspending
            </span>{" "}
            on AI Tools
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-white/70 md:mx-0 md:text-xl">
            Enter the AI tools, plans, and seats you pay for. SpendScope compares your
            inputs to published list benchmarks, highlights overlap risk, and estimates
            savings—no billing connector or workspace access required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <Link
              href="/audit"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0F19] shadow-[0_0_30px_rgba(255,255,255,0.35)] transition hover:-translate-y-px hover:bg-white/95"
            >
              Run Free Audit
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/example-report.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/15"
            >
              See Example Report
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: "easeOut", delay: 0.1 }}
          className="relative mx-auto w-full max-w-2xl md:mx-0 md:max-w-none"
        >
          <div className="absolute inset-0 -z-10 translate-x-8 translate-y-9 rounded-3xl bg-linear-to-br from-blue-500/25 via-violet-500/10 to-fuchsia-500/20 blur-3xl" />
          <div
            className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_35px_90px_rgba(21,29,64,0.6)] backdrop-blur-2xl"
            style={{ transform: "perspective(1000px) rotateY(-12deg) rotateX(4deg)" }}
          >
            <div className="rounded-2xl border border-white/10 bg-[#111829]/80 p-7 lg:p-8">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Total AI Spend
                  </p>
                  <p className="mt-2 text-3xl font-semibold">$12,450</p>
                </div>
                <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  +18.2% YoY
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-white/75">Top Expenses</p>
                {expenses.map((expense) => (
                  <div key={expense.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>{expense.label}</span>
                      <span>{expense.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${expense.color}`}
                        style={{ width: `${expense.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 rounded-2xl border border-violet-300/20 bg-linear-to-r from-violet-500/15 to-blue-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-violet-100/70">
                  Potential savings found
                </p>
                <p className="mt-2 text-2xl font-semibold text-violet-100">$3,240</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { Eye, Layers, LineChart, TrendingDown } from "lucide-react";
import { motion } from "motion/react";

const benefits = [
  {
    title: "AI Spend Visibility",
    description:
      "Get a unified view of every AI subscription, license owner, and usage trend across your stack.",
    Icon: Eye,
    color: "text-blue-300",
    glow: "from-blue-500/50",
  },
  {
    title: "Cost Optimization",
    description:
      "Surface underutilized seats and right-size plans before invoices quietly compound month over month.",
    Icon: TrendingDown,
    color: "text-violet-300",
    glow: "from-violet-500/50",
  },
  {
    title: "Tool Consolidation",
    description:
      "Identify overlapping AI apps and consolidate teams onto fewer, higher-value tools without disruption.",
    Icon: Layers,
    color: "text-fuchsia-300",
    glow: "from-fuchsia-500/50",
  },
  {
    title: "Annual Savings Insights",
    description:
      "Model yearly savings opportunities with practical recommendations your finance team can execute quickly.",
    Icon: LineChart,
    color: "text-emerald-300",
    glow: "from-emerald-500/50",
  },
];

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="px-6 py-24 md:px-10 lg:px-16"
    >
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Everything you need to tame AI sprawl
          </h2>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-2">
          {benefits.map(({ title, description, Icon, color, glow }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-xl"
            >
              <div
                className={`pointer-events-none absolute right-0 top-0 h-28 w-28 bg-gradient-to-bl ${glow} to-transparent opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100`}
              />
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">{title}</h3>
              <p className="text-sm leading-7 text-white/65">{description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

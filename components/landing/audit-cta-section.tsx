"use client";

import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

export function AuditCtaSection() {
  return (
    <section className="relative px-4 py-24 md:px-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/20 blur-[160px]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-8 py-14 text-center backdrop-blur-2xl md:px-16 xl:py-16"
      >
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-violet-300/25 bg-violet-400/15 text-violet-200">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
          Find hidden AI costs in under 60 seconds
        </h3>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
          Securely connect your Google Workspace or financial stack. We&apos;ll
          automatically identify unused licenses and suggest optimization
          strategies.
        </p>
        <Link
          href="/audit"
          className="mt-9 inline-flex rounded-full bg-gradient-to-r from-blue-400 to-violet-400 px-8 py-3 text-sm font-semibold text-white shadow-[0_0_35px_rgba(121,141,255,0.55)] transition hover:translate-y-[-1px]"
        >
          Run Free Spend Audit
        </Link>
        <p className="mt-4 text-xs text-white/55">
          No credit card required. Read-only secure access.
        </p>
      </motion.div>
    </section>
  );
}

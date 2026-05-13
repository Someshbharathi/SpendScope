"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { Logo } from "./logo";
import { BenchmarkingModal } from "./benchmarking-modal";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Benefits", href: "#benefits" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed inset-x-0 top-0 z-50 px-6 py-4 md:px-10 lg:px-16"
      >
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-white/10 bg-white/5 px-6 py-3 backdrop-blur-xl">
          <Logo />
          <div className="hidden items-center gap-7 text-sm text-white/75 md:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBenchmarkOpen(true)}
            className="shrink-0 rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:border-emerald-400/25 hover:bg-white/15"
          >
            View Benchmarking
          </button>
        </nav>
      </motion.header>
      <BenchmarkingModal open={benchmarkOpen} onClose={() => setBenchmarkOpen(false)} />
    </>
  );
}

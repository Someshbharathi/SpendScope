"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { Logo } from "./logo";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Benefits", href: "#benefits" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  return (
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
        <Link
          href="/audit"
          className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Get Started
        </Link>
      </nav>
    </motion.header>
  );
}

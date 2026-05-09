import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/landing/logo";

export function AuditTopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F19]/70 px-6 py-4 backdrop-blur-xl md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <Logo />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>
    </header>
  );
}

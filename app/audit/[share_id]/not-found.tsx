import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuditTopNav } from "@/components/audit/audit-top-nav";
import { GlassCard } from "@/components/audit/glass-card";

export default function SharedAuditNotFound() {
  return (
    <AppShell>
      <AuditTopNav />
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <GlassCard className="w-full space-y-4 border-white/10 bg-white/4 p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">Shared report</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">This audit report could not be found</h1>
          <p className="text-sm leading-relaxed text-white/55">
            The link may be wrong, expired, or the report may have been removed. Ask whoever shared it for an updated
            link—or run your own audit.
          </p>
          <Link
            href="/audit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0F19] transition hover:bg-white/90"
          >
            Run new audit
            <ArrowRight className="h-4 w-4" />
          </Link>
        </GlassCard>
      </div>
    </AppShell>
  );
}

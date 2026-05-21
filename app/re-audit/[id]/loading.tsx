import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuditTopNav } from "@/components/audit/audit-top-nav";

export default function ReauditLoading() {
  return (
    <AppShell>
      <AuditTopNav />
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
        <Loader2 className="h-10 w-10 animate-spin text-white/40" />
        <p className="text-sm text-white/55">Loading re-audit comparison…</p>
      </div>
    </AppShell>
  );
}

import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { AuditForm } from "@/components/audit/audit-form";
import { AuditTopNav } from "@/components/audit/audit-top-nav";

export const metadata: Metadata = {
  title: "Run Audit | SpendScope",
  description: "Submit your AI tool spend and receive savings recommendations.",
};

export default function AuditPage() {
  return (
    <AppShell>
      <AuditTopNav />
      <AuditForm />
    </AppShell>
  );
}

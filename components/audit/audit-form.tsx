"use client";

import { useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { GlassCard } from "@/components/audit/glass-card";
import { usePersistedAuditForm } from "@/hooks/use-persisted-audit-form";
import type { AuditFormValues, ToolId } from "@/lib/audit-types";
import { TOOL_IDS, USE_CASES } from "@/lib/audit-types";
import { buildAuditInsertPayload, generateShareId, insertAuditRow } from "@/lib/audit-db";
import { runAuditEngine } from "@/lib/audit-engine";
import { auditFormSchema } from "@/lib/audit-form-schema";
import {
  getDefaultAuditFormValues,
  saveAuditSessionPayload,
} from "@/lib/audit-persistence";
import { TOOL_PRICING } from "@/lib/pricing";
import { createClient } from "@/utils/supabase/client";

const useCaseLabel: Record<(typeof USE_CASES)[number], string> = {
  coding: "Coding",
  writing: "Writing",
  research: "Research",
  mixed: "Mixed",
  data_analysis: "Data analysis",
};

function formatUseCase(u: AuditFormValues["useCase"]): string {
  return useCaseLabel[u];
}

export function AuditForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<AuditFormValues>({
    defaultValues: getDefaultAuditFormValues(),
    mode: "onChange",
  });

  const hydrated = usePersistedAuditForm(form);

  const { isSubmitting, errors } = form.formState;

  const watchedTools =
    useWatch({ control: form.control, name: "tools" }) ??
    getDefaultAuditFormValues().tools;
  const email = useWatch({ control: form.control, name: "email" });
  const companyName = useWatch({ control: form.control, name: "companyName" });
  const role = useWatch({ control: form.control, name: "role" });
  const teamSize = useWatch({ control: form.control, name: "teamSize" });

  const anyEnabled = TOOL_IDS.some((id) => watchedTools[id]?.enabled);
  const teamSizeValid =
    typeof teamSize === "number" && Number.isFinite(teamSize) && teamSize >= 1;
  const emailValid = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const companyNameValid =
    typeof companyName === "string" && companyName.trim().length > 0;
  const roleValid = typeof role === "string" && role.trim().length > 0;

  const canSubmit =
    hydrated &&
    anyEnabled &&
    teamSizeValid &&
    emailValid &&
    companyNameValid &&
    roleValid &&
    !isSubmitting;

  async function onSubmit(values: AuditFormValues) {
    setSubmitError(null);
    const parsed = auditFormSchema.safeParse(values);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setSubmitError(first?.message ?? "Please fix the form errors.");
      return;
    }

    const report = runAuditEngine(parsed.data);
    const shareId = generateShareId();
    const payload = buildAuditInsertPayload(parsed.data, report, shareId);

    try {
      const supabase = createClient();
      console.log("FORM VALUES", parsed.data);
      console.log("TOOLS", payload.tools_json.enabledTools);
      console.log("AUDIT RESULTS", report);
      console.log("FINAL PAYLOAD", payload);

      const insertResult = await insertAuditRow(supabase, payload);
      if (!insertResult.ok) {
        console.error("SUPABASE INSERT ERROR", insertResult.message);
        setSubmitError(insertResult.message || "Could not save audit. Try again.");
        return;
      }
      console.log("SUPABASE INSERT SUCCESS", {
        id: insertResult.id,
        share_id: insertResult.shareId,
      });

      saveAuditSessionPayload({
        version: 1,
        savedAt: new Date().toISOString(),
        email: parsed.data.email,
        companyName: parsed.data.companyName,
        role: parsed.data.role,
        teamSize: parsed.data.teamSize,
        useCase: parsed.data.useCase,
        tools: parsed.data.tools,
        report,
        auditRowId: insertResult.id,
        shareId: insertResult.shareId,
      });

      router.push("/results");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setSubmitError(message);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
        <Loader2 className="h-10 w-10 animate-spin text-white/40" />
        <p className="text-sm text-white/55">Loading your saved inputs…</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto w-full max-w-5xl space-y-10 px-6 pb-24 pt-10 md:px-10 lg:px-16"
    >
      <div className="space-y-4 text-center md:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-200/70">
          SpendScope audit
        </p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Map your AI stack
        </h1>
        <p className="max-w-2xl text-lg text-white/65">
          Tell us who you are and what you pay. We&apos;ll benchmark tiers, spot sprawl, and
          estimate savings—then store the run for your workspace.
        </p>
      </div>

      <GlassCard className="space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="email" className="text-sm font-medium text-white/80">
              Work email
            </label>
            <input
              id="email"
              type="email"
              placeholder="e.g. you@company.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none ring-blue-400/0 transition placeholder:text-white/35 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/25"
              {...form.register("email", {
                required: "Email is required",
                validate: (v) =>
                  (typeof v === "string" &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) ||
                  "Enter a valid email",
              })}
            />
            {errors.email ? (
              <p className="text-sm text-rose-300/90">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="companyName" className="text-sm font-medium text-white/80">
              Company name
            </label>
            <input
              id="companyName"
              type="text"
              placeholder="e.g. Acme Labs"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none ring-blue-400/0 transition placeholder:text-white/35 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/25"
              {...form.register("companyName", {
                required: "Company name is required",
                validate: (v) =>
                  (typeof v === "string" && v.trim().length > 0) ||
                  "Company name is required",
              })}
            />
            {errors.companyName ? (
              <p className="text-sm text-rose-300/90">{errors.companyName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="role" className="text-sm font-medium text-white/80">
              Your role in the company
            </label>
            <input
              id="role"
              type="text"
              placeholder="e.g. Engineering Manager"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none ring-blue-400/0 transition placeholder:text-white/35 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/25"
              {...form.register("role", {
                required: "Role is required",
                validate: (v) =>
                  (typeof v === "string" && v.trim().length > 0) || "Role is required",
              })}
            />
            {errors.role ? (
              <p className="text-sm text-rose-300/90">{errors.role.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="teamSize" className="text-sm font-medium text-white/80">
              Team size
            </label>
            <input
              id="teamSize"
              type="number"
              min={1}
              placeholder="e.g. 12"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none ring-blue-400/0 transition placeholder:text-white/35 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/25"
              {...form.register("teamSize", {
                valueAsNumber: true,
                validate: (v) =>
                  (typeof v === "number" && Number.isFinite(v) && v >= 1) ||
                  "Team size must be at least 1",
              })}
            />
            {errors.teamSize ? (
              <p className="text-sm text-rose-300/90">{errors.teamSize.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="useCase" className="text-sm font-medium text-white/80">
              Primary use case
            </label>
            <select
              id="useCase"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none transition focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/25"
              {...form.register("useCase")}
            >
              {USE_CASES.map((u) => (
                <option key={u} value={u} className="bg-[#111829]">
                  {formatUseCase(u)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-white/90">Tools & spend</h2>
        <div className="grid gap-5">
          {TOOL_IDS.map((toolId) => (
            <ToolCard key={toolId} toolId={toolId} control={form.control} errors={errors} />
          ))}
        </div>
      </div>

      {submitError ? (
        <GlassCard className="border-rose-400/25 bg-rose-500/10">
          <p className="text-sm text-rose-100/90">{submitError}</p>
        </GlassCard>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/50">
          {anyEnabled
            ? `${TOOL_IDS.filter((id) => watchedTools[id]?.enabled).length} tool(s) enabled`
            : "Enable at least one tool to continue."}
          {!emailValid ? " · Enter valid email." : null}
          {!companyNameValid ? " · Enter company name." : null}
          {!roleValid ? " · Enter your role." : null}
          {!teamSizeValid ? " · Enter a valid team size." : null}
        </p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#0B0F19] shadow-[0_0_28px_rgba(255,255,255,0.25)] transition enabled:hover:-translate-y-0.5 enabled:hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving &amp; analyzing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Run audit
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ToolCard({
  toolId,
  control,
  errors,
}: {
  toolId: ToolId;
  control: Control<AuditFormValues>;
  errors: FieldErrors<AuditFormValues>;
}) {
  const pricing = TOOL_PRICING[toolId];

  return (
    <Controller
      control={control}
      name={`tools.${toolId}.enabled`}
      render={({ field: enabledField }) => (
        <GlassCard
          className={`space-y-6 transition-opacity duration-300 ${enabledField.value ? "ring-1 ring-white/15" : "opacity-80"}`}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-semibold">{pricing.displayName}</p>
              <p className="text-sm text-white/50">Plan, seats, and billed spend</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabledField.value}
              onClick={() => enabledField.onChange(!enabledField.value)}
              className={`relative h-9 w-16 shrink-0 rounded-full border transition ${
                enabledField.value
                  ? "border-emerald-400/40 bg-emerald-400/20"
                  : "border-white/15 bg-white/5"
              }`}
            >
              <span
                className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${
                  enabledField.value ? "left-8" : "left-1"
                }`}
              />
            </button>
          </div>

          <div
            className={`grid gap-6 md:grid-cols-3 ${
              enabledField.value ? "" : "pointer-events-none opacity-40"
            }`}
          >
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-white/45">
                Plan
              </label>
              <Controller
                control={control}
                name={`tools.${toolId}.planId`}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/40"
                  >
                    {pricing.plans.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#111829]">
                        {p.label}
                        {p.monthlyPerSeat !== null
                          ? ` — $${p.monthlyPerSeat}/seat`
                          : " — Custom"}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.tools?.[toolId]?.planId ? (
                <p className="text-xs text-rose-300/90">
                  {errors.tools[toolId]?.planId?.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-white/45">
                Monthly spend (USD)
              </label>
              <Controller
                control={control}
                name={`tools.${toolId}.monthlySpend`}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    step="1"
                    placeholder="e.g. 480"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-blue-400/40"
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === "" ? 0 : Number(v));
                    }}
                  />
                )}
              />
              {errors.tools?.[toolId]?.monthlySpend ? (
                <p className="text-xs text-rose-300/90">
                  {errors.tools[toolId]?.monthlySpend?.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-white/45">
                Seats
              </label>
              <Controller
                control={control}
                name={`tools.${toolId}.seats`}
                render={({ field }) => (
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 8"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-blue-400/40"
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === "" ? 1 : Number(v));
                    }}
                  />
                )}
              />
              {errors.tools?.[toolId]?.seats ? (
                <p className="text-xs text-rose-300/90">
                  {errors.tools[toolId]?.seats?.message}
                </p>
              ) : null}
            </div>
          </div>
        </GlassCard>
      )}
    />
  );
}

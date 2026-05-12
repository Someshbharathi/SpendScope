import type { AuditFormValues, AuditReport, AuditSessionPayload } from "./audit-types";
import { TOOL_IDS } from "./audit-types";
import { getDefaultPlanId, getPlan } from "./pricing";

export const AUDIT_FORM_STORAGE_KEY = "spendscope:audit-form:v1";
export const AUDIT_SESSION_STORAGE_KEY = "spendscope:audit-result:v1";

export function getDefaultAuditFormValues(): AuditFormValues {
  const tools = {} as AuditFormValues["tools"];
  for (const id of TOOL_IDS) {
    tools[id] = {
      enabled: false,
      planId: getDefaultPlanId(id),
      monthlySpend: "" as unknown as number,
      seats: "" as unknown as number,
    };
  }
  return {
    email: "",
    companyName: "",
    role: "",
    teamSize: 5,
    useCase: "mixed",
    tools,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeTools(raw: unknown): AuditFormValues["tools"] {
  const defaults = getDefaultAuditFormValues().tools;
  if (!isRecord(raw)) return defaults;

  const out = { ...defaults };
  for (const id of TOOL_IDS) {
    const t = raw[id];
    if (!isRecord(t)) continue;
    const enabled = typeof t.enabled === "boolean" ? t.enabled : defaults[id].enabled;
    const rawPlan = typeof t.planId === "string" ? t.planId : defaults[id].planId;
    const planId = getPlan(id, rawPlan) ? rawPlan : getDefaultPlanId(id);
    const monthlySpend =
      typeof t.monthlySpend === "number" && Number.isFinite(t.monthlySpend)
        ? Math.max(0, t.monthlySpend)
        : defaults[id].monthlySpend;
    const seats =
      typeof t.seats === "number" && Number.isFinite(t.seats)
        ? Math.max(1, Math.round(t.seats))
        : defaults[id].seats;
    out[id] = { enabled, planId, monthlySpend, seats };
  }
  return out;
}

function sanitizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function parseAuditFormFromStorage(raw: string): AuditFormValues | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return null;

    const teamSizeRaw = data.teamSize;
    const teamSize =
      typeof teamSizeRaw === "number" && Number.isFinite(teamSizeRaw)
        ? Math.max(1, Math.round(teamSizeRaw))
        : getDefaultAuditFormValues().teamSize;

    const useCaseRaw = data.useCase;
    const useCase =
      useCaseRaw === "coding" ||
      useCaseRaw === "writing" ||
      useCaseRaw === "research" ||
      useCaseRaw === "mixed" ||
      useCaseRaw === "data_analysis"
        ? useCaseRaw
        : getDefaultAuditFormValues().useCase;

    return {
      email: sanitizeText(data.email, getDefaultAuditFormValues().email),
      companyName: sanitizeText(data.companyName, getDefaultAuditFormValues().companyName),
      role: sanitizeText(data.role, getDefaultAuditFormValues().role),
      teamSize,
      useCase,
      tools: mergeTools(data.tools),
    };
  } catch {
    return null;
  }
}

export function loadAuditFormFromStorage(): AuditFormValues {
  if (typeof window === "undefined") return getDefaultAuditFormValues();
  try {
    const raw = window.localStorage.getItem(AUDIT_FORM_STORAGE_KEY);
    if (!raw) return getDefaultAuditFormValues();
    return parseAuditFormFromStorage(raw) ?? getDefaultAuditFormValues();
  } catch {
    return getDefaultAuditFormValues();
  }
}

export function saveAuditFormToStorage(values: AuditFormValues): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUDIT_FORM_STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* quota / private mode */
  }
}

export function clearAuditFormStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUDIT_FORM_STORAGE_KEY);
  } catch {
    /* private mode / storage unavailable */
  }
}

export function saveAuditSessionPayload(payload: AuditSessionPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(AUDIT_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* */
  }
}

export function loadAuditSessionPayload(): AuditSessionPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(AUDIT_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return null;
    if (data.version !== 1) return null;
    if (typeof data.savedAt !== "string") return null;
    const email = sanitizeText(data.email, "");
    if (!email) return null;
    const companyName = sanitizeText(data.companyName, "");
    const role = sanitizeText(data.role, "");
    if (!companyName || !role) return null;
    if (typeof data.teamSize !== "number") return null;
    const useCase = data.useCase;
    if (
      useCase !== "coding" &&
      useCase !== "writing" &&
      useCase !== "research" &&
      useCase !== "mixed" &&
      useCase !== "data_analysis"
    ) {
      return null;
    }
    if (!isRecord(data.tools)) return null;
    const tools = mergeTools(data.tools);
    if (!isRecord(data.report)) return null;
    // Trust report shape at runtime for MVP; engine output is always self-produced
    const report = data.report as unknown as AuditReport;
    const auditRowId =
      data.auditRowId === null || typeof data.auditRowId === "string"
        ? data.auditRowId
        : null;
    const aiExecutiveSummary =
      typeof data.aiExecutiveSummary === "string" && data.aiExecutiveSummary.trim().length > 0
        ? data.aiExecutiveSummary.trim()
        : undefined;
    const aiSummaryForSavedAt =
      typeof data.aiSummaryForSavedAt === "string" && data.aiSummaryForSavedAt.trim().length > 0
        ? data.aiSummaryForSavedAt.trim()
        : undefined;

    return {
      version: 1,
      savedAt: data.savedAt,
      email,
      companyName,
      role,
      teamSize: data.teamSize,
      useCase,
      tools,
      report,
      auditRowId,
      shareId:
        data.shareId === null || typeof data.shareId === "string" ? data.shareId : null,
      ...(aiExecutiveSummary !== undefined ? { aiExecutiveSummary } : {}),
      ...(aiSummaryForSavedAt !== undefined ? { aiSummaryForSavedAt } : {}),
    };
  } catch {
    return null;
  }
}

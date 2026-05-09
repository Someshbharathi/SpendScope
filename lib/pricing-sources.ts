import type { ToolId } from "./audit-types";

/** Align with PRICING_DATA.md — update when vendors change list prices. */
export const PRICING_DATA_AS_OF_ISO = "2026-05-09";

export const PRICING_REFERENCE =
  "Benchmarks use retail list prices documented in PRICING_DATA.md and vendor pricing pages as of the submission week.";

export const VENDOR_PRICING_PAGE: Record<ToolId, string> = {
  chatgpt: "https://openai.com/chatgpt/pricing/",
  claude: "https://www.anthropic.com/pricing",
  cursor: "https://cursor.com/pricing",
  copilot: "https://github.com/features/copilot/plans",
  gemini: "https://gemini.google/subscriptions/",
};

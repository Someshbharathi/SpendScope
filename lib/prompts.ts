import type { AuditSummaryContext } from "./audit-summary-context";

/**
 * Builds the user prompt for Gemini executive summary generation.
 * Deterministic figures are embedded explicitly — the model must not invent amounts.
 */
export function buildExecutiveSummaryPrompt(context: AuditSummaryContext): string {
  const toolsJson = JSON.stringify(context.tools, null, 2);
  const recommendationsJson = JSON.stringify(context.recommendations, null, 2);

  return `You are a finance-minded SaaS advisor writing a short executive summary for a startup leadership audience.

## Ground truth (deterministic audit engine — authoritative)
These figures are final. Do NOT change, reinterpret, or invent savings, prices, or benchmarks.

- Organization headcount used for context: ${context.companySize} people
- Primary use case: ${context.useCase}
- Total reported AI tooling spend (modeled): $${context.totalMonthlySpend.toFixed(2)}/month
- Total modeled monthly savings opportunity: $${context.estimatedMonthlySavings.toFixed(2)}/month
- Total modeled annual savings opportunity: $${context.estimatedAnnualSavings.toFixed(2)}/year
- Optimization signal (categorical): ${context.optimizationLevel}
- Engine-generated executive line (align with this, do not contradict): ${context.deterministicExecutiveSummary}

### Summary bullets from engine
${context.summaryBullets.map((b) => `- ${b}`).join("\n") || "(none)"}

### Tool-level signals (reported spend and modeled actions — authoritative)
${toolsJson}

### Recommendation themes (authoritative themes only)
${recommendationsJson}

### Pricing reference
${context.pricingReferenceNote}

## Your task
Write ONE cohesive executive summary paragraph of roughly 80–120 words.

Style:
- Professional, trustworthy, intelligent; startup/SaaS tone without hype
- Explain overspending or alignment patterns only as implied by the data above
- Reference optimization opportunities consistent with the modeled savings — never exaggerate
- Sound like a careful finance advisor; acknowledge uncertainty where appropriate (benchmarks vs invoices)

Hard rules:
- Do NOT invent dollar amounts not listed in Ground truth
- Do NOT contradict totalMonthlySpend, estimatedMonthlySavings, estimatedAnnualSavings, or optimizationLevel framing
- Do NOT claim vendor-specific pricing beyond what tool labels imply
- Use neutral language when savings are low or zero — avoid implying large wins

Output ONLY the summary paragraph — no title, no bullet points, no preamble.`;
}

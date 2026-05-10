import type { AuditSummaryContext } from "./audit-summary-context";

function roundUsd(n: number): string {
  return Math.round((n + Number.EPSILON) * 100) / 100 === Math.round(n)
    ? String(Math.round(n))
    : (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}

/**
 * Deterministic fallback when Gemini is unavailable or fails.
 * Uses only figures already present in the audit context (no new math).
 */
export function generateFallbackSummary(context: AuditSummaryContext): string {
  const monthly = context.estimatedMonthlySavings;
  const annual = context.estimatedAnnualSavings;
  const spend = context.totalMonthlySpend;

  if (context.optimizationLevel === "highly_optimized" || monthly < 25) {
    return (
      "Your AI stack shows moderate optimization opportunities based on current retail pricing benchmarks and the usage patterns you shared. " +
      "Modeled spend sits broadly in line with published list expectations for your inputs—revisit this view when seats, plans, or workloads shift materially."
    );
  }

  if (context.optimizationLevel === "billing_review_suggested") {
    return (
      `Reported run-rate (~$${roundUsd(spend)}/month across enabled tools) suggests a billing and usage reconciliation pass may be worthwhile before renewal. ` +
      `The deterministic model flags roughly $${roundUsd(monthly)}/month (~$${roundUsd(annual)}/year) in potential improvements against retail benchmarks—validate against invoices, API line items, and seat allocation rather than treating figures as quotes.`
    );
  }

  if (context.optimizationLevel === "significant_opportunity") {
    return (
      `Across your enabled stack, modeled opportunities land around $${roundUsd(monthly)}/month (~$${roundUsd(annual)}/year) versus retail list benchmarks for the seats and plans entered—worth prioritizing before your next renewal cycle. ` +
      "Focus on tier fit, add-ons, and seat alignment; benchmarks are directional and should be triangulated with actual billing."
    );
  }

  return (
    `Your AI tooling footprint (~$${roundUsd(spend)}/month reported) leaves room for targeted improvements consistent with a roughly $${roundUsd(monthly)}/month (~$${roundUsd(annual)}/year) modeled opportunity against published list pricing. ` +
    "Most teams capture value through plan right-sizing, usage governance, and invoice review—treat these figures as directional, not vendor commitments."
  );
}

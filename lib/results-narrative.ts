import type { SpendClassification, ToolAuditFinding } from "./audit-types";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Human “typical range” band around list benchmark (not shown as raw math to users). */
export function typicalMonthlyBandMidpoint(benchmark: number): { low: number; high: number } {
  const low = Math.max(0, Math.round(benchmark * 0.82));
  const high = Math.round(benchmark * 1.18);
  return { low, high };
}

export function formatTypicalBand(benchmark: number): string {
  const { low, high } = typicalMonthlyBandMidpoint(benchmark);
  return `${fmt(low)}–${fmt(high)}`;
}

function seatPhrase(teamSize: number | undefined): string {
  if (teamSize != null && teamSize > 0) {
    return `teams your size (${teamSize} people in your audit)`;
  }
  return "teams with a similar footprint";
}

/** A: Problem — what looks off and why it matters emotionally / financially. */
export function narrativeProblem(f: ToolAuditFinding, teamSize?: number): string {
  const tool = f.currentTool;
  const plan = f.currentPlan;
  const bench = f.benchmarkSpendMonthly;
  const ratio = f.spendRatio;

  if (f.actionType === "Already Optimized") {
    if (ratio !== null && bench !== null && bench > 0 && ratio < 0.82) {
      return `${tool} spend looks lower than we’d expect at standard retail for ${plan}. That usually means consolidated billing, discounts, or fewer paid seats than declared — worth a quick invoice check.`;
    }
    if (ratio !== null && bench !== null && bench > 0 && ratio <= 1.05) {
      return `${tool} on ${plan} looks reasonably aligned with typical retail pricing for ${seatPhrase(teamSize)}—nothing urgent surfaced in this pass.`;
    }
    return `${tool} fits what we typically see for ${plan} at published rates. We didn’t find a strong same-vendor downgrade at retail pricing.`;
  }

  if (f.potentialPricingAnomaly || f.spendClassification === "Potential Billing Anomaly") {
    return `Your ${tool} bill is unusually high versus standard retail for this configuration—often billing sprawl, API overages, or seat mismatch rather than “wrong vendor.”`;
  }

  if (f.actionType === "Optimize Seats") {
    return `Paid seats appear misaligned with how your org actually uses ${tool}—a common source of quiet overspend without changing vendors.`;
  }

  if (f.actionType === "Downgrade Plan") {
    return `You may be paying for a tier above what standard retail suggests for how ${tool} is used—many teams can step down without losing core workflows.`;
  }

  if (f.actionType === "Alternative Tool") {
    return `For how you work, a comparable tool may hit the same outcomes at a lower retail run-rate than ${tool} today.`;
  }

  if (ratio !== null && bench !== null && bench > 0 && ratio >= 1.35) {
    return `${tool} spend is materially above what most ${plan} setups pay at list pricing—usually worth reviewing usage, add-ons, and renewal economics before scaling further.`;
  }

  return `${tool} spend looks elevated compared with typical retail for ${plan}. That pattern usually traces back to usage spikes, unused seats, or plan tier mismatch—not a single bad choice.`;
}

/** B: Financial context — typical range + trust without exposing raw benchmark jargon. */
export function narrativeFinancialContext(f: ToolAuditFinding): string {
  const bench = f.benchmarkSpendMonthly;
  const plan = f.currentPlan;

  if (bench === null || bench <= 0) {
    return `Based on current published pricing, we couldn’t pin a tight retail range for ${plan}—treat the optimized estimate as directional and validate against your contract.`;
  }

  const band = formatTypicalBand(bench);
  return `Using published retail pricing for ${plan}, comparable setups often land around ${band}/month before heavy API usage or enterprise add-ons. Your inputs are compared to that baseline—not a guarantee of what you’ll pay on renewal.`;
}

/** C: What to review — short checklist; trust line added once in UI. */
export function narrativeWhatToReview(f: ToolAuditFinding): string[] {
  switch (f.actionType) {
    case "Already Optimized":
      return [
        "Before renewal: confirm seats and add-ons still match real adoption.",
        "If spend shifts materially, rerun this audit with updated numbers.",
      ];
    case "Reduce API Spend":
      return [
        "Usage & API: quotas, routing, and caching—often faster ROI than switching vendors.",
        "Seats & invoices: confirm billed seats match people actually signing in.",
      ];
    case "Use Credits":
      return [
        "Credits & commits: ask about startup programs or annual commits before accepting rack-rate renewal.",
        "Line-item audit: API, seats, and add-ons—remove stacked charges you no longer need.",
      ];
    case "Optimize Seats":
      return [
        "Seat hygiene: paid seats vs. weekly active users—trim before tier upgrades.",
      ];
    case "Downgrade Plan":
      return [
        "Tier fit: confirm which features you’ll renew for vs. “nice to have.”",
        "Billing shape: team vs. individual plans vs. how adoption actually looks.",
      ];
    case "Alternative Tool":
      return [
        "Run a focused pilot on one workflow before a full switch.",
      ];
    default:
      return ["Renewal scope: seats, add-ons, and whether usage still justifies the tier."];
  }
}

/** Short headline for card eyebrow (plan + soft signal, no raw ratio). */
export function narrativePlanEyebrow(f: ToolAuditFinding): string {
  if (f.actionType === "Already Optimized") {
    return `${f.currentPlan} · Looks competitive at retail`;
  }
  if (f.potentialPricingAnomaly) {
    return `${f.currentPlan} · Worth a billing pass`;
  }
  return `${f.currentPlan} · Opportunity surfaced`;
}

/** Map classification to friendly urgency for anomaly stripe */
export function narrativeSeverityLabel(c: SpendClassification): string | null {
  if (c === "Potential Billing Anomaly") return "High priority review";
  if (c === "Significant Overspending" || c === "Moderate Overspending") return "Moderate opportunity";
  if (c === "Mild Optimization Opportunity") return "Light-touch optimization";
  return null;
}

export function savingsHeadline(monthly: number, annual: number): string {
  if (monthly <= 0) return "";
  return `Save ~${fmt(monthly)}/month (~${fmt(annual)}/year)`;
}

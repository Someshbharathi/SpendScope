import { describe, expect, it } from "vitest";

import { runAuditEngine } from "../lib/audit-engine";
import type { AuditFormValues, ToolId, ToolFormValues, UseCase } from "../lib/audit-types";
import { expectedMonthlyTotal } from "../lib/pricing";

function disabledTool(planId = "free"): ToolFormValues {
  return {
    enabled: false,
    planId,
    monthlySpend: 0,
    seats: 1,
  };
}

function buildForm({
  useCase = "coding",
  teamSize = 3,
}: {
  useCase?: UseCase;
  teamSize?: number;
} = {}): AuditFormValues {
  return {
    email: "finance@spendscope.test",
    companyName: "SpendScope Labs",
    role: "Finance Lead",
    teamSize,
    useCase,
    tools: {
      chatgpt: disabledTool("free"),
      claude: disabledTool("free"),
      cursor: disabledTool("hobby"),
      copilot: disabledTool("free"),
      gemini: disabledTool("free"),
    },
  };
}

/** List benchmark monthly total from current `TOOL_PRICING` (same source as the engine). */
function listBenchmark(toolId: ToolId, planId: string, seats: number): number {
  const total = expectedMonthlyTotal(toolId, planId, seats);
  if (total === null || total <= 0) {
    throw new Error(`Expected computable list benchmark for ${toolId}/${planId} × ${seats} seats`);
  }
  return total;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function runSingleToolCase(
  toolId: ToolId,
  config: { planId: string; monthlySpend: number; seats: number },
  options?: { useCase?: UseCase; teamSize?: number },
) {
  const form = buildForm(options);
  form.tools[toolId] = {
    enabled: true,
    planId: config.planId,
    monthlySpend: config.monthlySpend,
    seats: config.seats,
  };
  const report = runAuditEngine(form);
  const finding = report.findings[0];
  expect(report.findings).toHaveLength(1);
  expect(finding).toBeDefined();
  return { report, finding: finding! };
}

describe("runAuditEngine deterministic pricing behavior", () => {
  it("classifies an optimized spend scenario as already optimized", () => {
    const seats = 3;
    const benchmark = listBenchmark("cursor", "pro", seats);
    const { report, finding } = runSingleToolCase("cursor", {
      planId: "pro",
      seats,
      monthlySpend: benchmark,
    });

    expect(finding.benchmarkSpendMonthly).toBe(benchmark);
    expect(finding.spendRatio).toBe(1);
    expect(finding.spendClassification).toBe("Already Optimized");
    expect(finding.actionType).toBe("Already Optimized");
    expect(report.totalMonthlySavings).toBe(0);
  });

  it("detects moderate overspending and recommends reducing API spend", () => {
    const seats = 3;
    const benchmark = listBenchmark("cursor", "pro", seats);
    const spend = round2(benchmark * 1.67);
    const { finding } = runSingleToolCase("cursor", {
      planId: "pro",
      seats,
      monthlySpend: spend,
    });

    expect(finding.benchmarkSpendMonthly).toBe(benchmark);
    expect(finding.spendRatio).toBe(1.67);
    expect(finding.spendClassification).toBe("Moderate Overspending");
    expect(finding.actionType).toBe("Reduce API Spend");
    expect(finding.monthlySavings).toBeGreaterThan(10);
  });

  it("flags major overspending as a potential billing anomaly with credit-focused action", () => {
    const seats = 1;
    const benchmark = listBenchmark("cursor", "pro", seats);
    const spend = 500;
    const { finding } = runSingleToolCase("cursor", {
      planId: "pro",
      seats,
      monthlySpend: spend,
    });

    expect(finding.benchmarkSpendMonthly).toBe(benchmark);
    expect(finding.spendRatio).toBe(round2(spend / benchmark));
    expect(finding.spendClassification).toBe("Potential Billing Anomaly");
    expect(finding.actionType).toBe("Use Credits");
    expect(finding.potentialPricingAnomaly).toBe(true);
    expect(finding.confidenceLevel).toBe("High");
  });

  it("handles zero-spend free tier input as already optimized with no savings", () => {
    const { report, finding } = runSingleToolCase("chatgpt", {
      planId: "free",
      seats: 1,
      monthlySpend: 0,
    });

    expect(finding.benchmarkSpendMonthly).toBeNull();
    expect(finding.spendRatio).toBeNull();
    expect(finding.spendClassification).toBe("Already Optimized");
    expect(finding.actionType).toBe("Already Optimized");
    expect(report.totalMonthlySavings).toBe(0);
  });

  it("normalizes invalid negative spend and seat input without crashing", () => {
    const seats = 1;
    const benchmark = listBenchmark("cursor", "pro", seats);
    const { report, finding } = runSingleToolCase(
      "cursor",
      {
        planId: "pro",
        seats: -2,
        monthlySpend: -50,
      },
      {
        teamSize: 1,
      },
    );

    expect(finding.benchmarkSpendMonthly).toBe(benchmark);
    expect(finding.currentSpend).toBe(0);
    expect(finding.spendRatio).toBe(0);
    expect(finding.actionType).toBe("Already Optimized");
    expect(report.totalMonthlySavings).toBe(0);
  });
});

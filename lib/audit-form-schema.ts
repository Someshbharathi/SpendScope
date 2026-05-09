import { z } from "zod";

import { TOOL_IDS } from "./audit-types";
import { getPlan } from "./pricing";

const useCaseSchema = z.union([
  z.literal("coding"),
  z.literal("writing"),
  z.literal("research"),
  z.literal("mixed"),
  z.literal("data_analysis"),
]);

const toolShape = z.object({
  enabled: z.boolean(),
  planId: z.string().min(1, "Select a plan"),
  monthlySpend: z.number().min(0, "Spend cannot be negative"),
  seats: z
    .number()
    .min(1, "At least 1 seat")
    .max(50000, "Seat count too large"),
});

export const auditFormSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email"),
    companyName: z
      .string()
      .trim()
      .min(1, "Company name is required")
      .max(120, "Company name is too long"),
    role: z
      .string()
      .trim()
      .min(1, "Role is required")
      .max(120, "Role is too long"),
    teamSize: z
      .number()
      .min(1, "Team size must be at least 1")
      .max(500000, "Team size too large"),
    useCase: useCaseSchema,
    tools: z.object({
      chatgpt: toolShape,
      claude: toolShape,
      cursor: toolShape,
      copilot: toolShape,
      gemini: toolShape,
    }),
  })
  .superRefine((data, ctx) => {
    const anyEnabled = TOOL_IDS.some((id) => data.tools[id].enabled);
    if (!anyEnabled) {
      ctx.addIssue({
        code: "custom",
        message: "Enable at least one AI tool to run an audit.",
      });
    }

    for (const id of TOOL_IDS) {
      const row = data.tools[id];
      if (!row.enabled) continue;
      if (!getPlan(id, row.planId)) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid plan for this tool.",
          path: ["tools", id, "planId"],
        });
      }
    }
  });

export type AuditFormSchemaValues = z.infer<typeof auditFormSchema>;

import { GoogleGenerativeAI } from "@google/generative-ai";

import type { AuditSummaryContext } from "./audit-summary-context";
import { buildExecutiveSummaryPrompt } from "./prompts";

const MODEL_ID = "gemini-1.5-flash";

function sanitizeModelOutput(raw: string): string {
  const cleaned = raw
    .replace(/^[\s"'`*]+|[\s"'`*]+$/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return cleaned.slice(0, 3500);
}

/**
 * Calls Gemini to produce an executive summary. Throws on configuration or empty response.
 * Callers should catch and use {@link generateFallbackSummary}.
 */
export async function generateExecutiveSummaryWithGemini(context: AuditSummaryContext): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_ID });
  const prompt = buildExecutiveSummaryPrompt(context);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 512,
      temperature: 0.55,
    },
  });

  const text = result.response.text();
  const trimmed = sanitizeModelOutput(text ?? "");
  if (!trimmed) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  return trimmed;
}

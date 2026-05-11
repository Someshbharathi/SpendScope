# PROMPTS

## Overview

SpendScope was built AI-assisted, not AI-authored. Day-to-day work split cleanly between **deterministic product logic** (pricing benchmarks, savings estimates, spend classifications, recommendation actions) and **LLM-assisted acceleration** (scaffolding UI, debugging unfamiliar stack issues, and generating a single optional executive narrative after the audit engine had already produced numbers).

**Tools used**

| Tool            |     Role                                                                                     |
| ----------      | -------------------------------------------------------------------------------------------- |
| **Cursor**      | Primary IDE assistant: components, routes, Supabase wiring, refactors, test scaffolding, docs. |
| **ChatGPT**     | Occasional second opinion: RLS semantics, error-message interpretation, checklist-style planning. |
| **Gemini API**  | One production path: `buildExecutiveSummaryPrompt` → `generateExecutiveSummaryWithGemini` (`gemini-1.5-flash`), invoked from `POST/    api                 generate-summary`. |

**Where AI accelerated development**

- Boilerplate Next.js App Router pages and Tailwind layouts
- Faster iteration on form state and results UI
- Narrowing down Supabase policy mistakes and env misreads (not a substitute for reading logs)

**Where deterministic engineering was preferred**

- **Pricing calculations and savings logic were intentionally not delegated to AI.** They live in `lib/pricing.ts` and `lib/audit-engine.ts`, are covered by `tests/audit-engine.test.ts`, and feed structured context into Gemini only *after* the math is fixed.
- 
- AI was mainly used for: **UI generation / scaffolding**, **debugging assistance**, **executive summary generation** (bounded narrative), and **documentation support**—not for financial truth.

---

## 1. Gemini Executive Summary Prompt

Production prompting is centralized in `lib/prompts.ts` via `buildExecutiveSummaryPrompt(context)`. The client builds `AuditSummaryContext` with `buildAuditSummaryContext` (`lib/audit-summary-context.ts`), `POST`s JSON to `/api/generate-summary`, the route validates with `auditSummaryContextSchema`, then calls Gemini; on any failure it returns `generateFallbackSummary` (`lib/fallback-summary.ts`).

### Prompt text (production template)

The following is the **actual** template string returned by `buildExecutiveSummaryPrompt` (placeholders shown as interpolated values at runtime):

```text
You are a finance-minded SaaS advisor writing a short executive summary for a startup leadership audience.

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

Output ONLY the summary paragraph — no title, no bullet points, no preamble.
```

In code, `toolsJson` and `recommendationsJson` are `JSON.stringify(..., null, 2)` of `context.tools` and `context.recommendations` (see `lib/prompts.ts`).

### Why it was structured that way

- **“Ground truth” block first:** Models drift toward plausible finance prose; anchoring authoritative numbers up front reduces invented totals (it does not eliminate tone problems, but it helps).
- **Embedded engine line + bullets + JSON signals:** Gives the model constrained vocabulary aligned with what the UI already shows, instead of asking it to “re-audit” the stack.
- **Explicit anti-hype rules:** Spend optimization demos tend to sound like sales copy; the hard rules push neutral language when savings are small—this was refined after summaries occasionally *felt* bigger than the modeled deltas.
- **Single paragraph, 80–120 words:** Keeps the UI readable and avoids bullet spam that duplicates the results page.

### Model/runtime settings (`lib/gemini.ts`)

- **`gemini-1.5-flash`** — fast enough for interactive results.
- **`temperature: 0.55`** — small amount of variation for readability without going fully stochastic.
- **`maxOutputTokens: 512`** — enough for one paragraph; discourages rambling.
- **`sanitizeModelOutput`** — trims markdown-ish wrapping and caps length defensively.

### What was refined during testing

- Stronger **“do not invent dollars”** and **“neutral when low/zero savings”** language after spot-checking summaries against `estimatedMonthlySavings`.
- Tightening alignment with **`deterministicExecutiveSummary`** so Gemini does not contradict the engine’s own headline.
- **Output cleanup** (quotes, backticks, extra newlines) when the model formatted like a document instead of plain text.

### Why deterministic calculations were separated from AI generation

Financial recommendations need a defensible answer to “how did you get this number?” If the LLM computes savings, the answer is effectively “the model said so,” which is not acceptable for benchmarks tied to assignment expectations and for regression testing. Separating roles makes the system **explainable** (code + tests) and lets AI add **narrative polish** only.

### Why fallback summaries were added

External APIs fail (missing `GEMINI_API_KEY`, quota, empty response). The product still needs a coherent paragraph. `generateFallbackSummary` uses **only existing context fields**—no new math—and branches on `optimizationLevel` derived deterministically from the report (`lib/audit-summary-context.ts`). The API route (`app/api/generate-summary/route.ts`) always precomputes fallback before calling Gemini so failures degrade gracefully; the results client also applies fallback client-side if the response body is empty.

---

## 2. Audit Recommendation Prompt Experiments

Early in development, before the audit engine hardened, I experimented with **LLM-first recommendations**: paste structured tool/plan/spend JSON into ChatGPT or a throwaway Gemini prompt and ask for “top optimizations,” “estimated monthly savings,” and “next actions.”

### Why that seemed useful

- **Speed:** You can demo a “consultant” voice in an afternoon.
- **Flexibility:** The model can phrase actions for many vendors without enumerating every rule in code.
- **Assignment overlap:** The brief mentions AI + optimization; an LLM-heavy approach *looks* aligned at first glance.

### What broke in practice

- **Inconsistent savings:** Re-running similar inputs produced different dollar ranges; nothing to unit test.
- **Broken seat math:** In one representative failure, the model implied a large savings opportunity by **mixing per-seat list pricing with total team spend** (treating a multi-seat stack like a single-seat quote). The paragraph read confidently, but the arithmetic did not survive a spreadsheet check.
- **Over-specific vendor claims:** The model occasionally named discounts, contract levers, or “typical enterprise” pricing that were not in our benchmark table—fine for fiction, bad for a benchmark-driven product.

### Why deterministic benchmark logic replaced it

The shipped design computes benchmarks and classifications in TypeScript (`runAuditEngine` path in `lib/audit-engine.ts`), emits structured findings, and only then optionally calls Gemini for wording. That replacement trades **flexible natural language generation** for **repeatable behavior** we could lock with Vitest scenarios (see `tests/audit-engine.test.ts` and `TESTS.md`).

### Concrete example of incorrect financial reasoning (LLM path)

During an experiment, I gave the model a small stack with **moderate** modeled gap vs list price. The response recommended an aggressive plan downgrade and cited a **specific monthly savings figure** that did not match either (a) user-entered spend or (b) our list benchmark total—it was essentially a hallucinated “savings line item” that sounded audit-like. That was the point I stopped using the LLM for quantitative recommendations entirely.

---

## 3. Cursor Development Prompts

Cursor prompts were iterative and conversational—not a single “mega prompt” checked into the repo. Below are **representative intents** that matched real files and flows, and what still needed human cleanup.

### Landing page

- **Intent:** “Next.js App Router landing: hero, benefits, FAQ, CTA to `/audit`, dark SaaS styling with Tailwind; no external UI kit.”
- **Why it worked:** Fast layout scaffolding (`app/page.tsx`, `components/landing/*`).
- **Manual corrections:** Spacing/typography tuning, copy tone, ensuring links match actual routes, removing generic sections that did not fit SpendScope.

### Audit form

- **Intent:** “Multi-tool audit form: toggles per vendor, plan select tied to pricing table, spend + seats, validation-friendly state.”
- **Why it worked:** Accelerated component structure (`components/audit/audit-form.tsx`, schema in `lib/audit-form-schema.ts`).
- **Manual corrections:** Wiring to real `TOOL_PRICING` shapes, persistence hooks (`hooks/use-persisted-audit-form.ts`), and edge cases (disabled tools, zero spend).

### Supabase integration

- **Intent:** “Supabase client/server helpers, insert audit row payload, fetch by `share_id` for public page.”
- **Why it worked:** Boilerplate for `utils/supabase/*`, `lib/audit-db.ts`, `lib/audit-share-fetch.ts`.
- **Manual corrections:** **RLS policies** and insert/select permissions—Cursor could suggest policy *shapes*, but the truth was in Supabase logs and policy testing, not in generated code alone.

### Shareable reports (`/audit/[share_id]`)

- **Intent:** “Dynamic route public read-only report; validate UUID; not-found UX.”
- **Why it worked:** Route skeleton (`app/audit/[share_id]/page.tsx`) and loading states.
- **Manual corrections:** Data shape guards, aligning client expectations with JSON columns, share ID validation (`isValidShareIdFormat`).

### Email workflows (Resend)

- **Intent:** “API route to email HTML report; escape user fields; env-based from address.”
- **Why it worked:** Faster plumbing (`app/api/send-report/route.ts`, `lib/email/*`).
- **Manual corrections:** HTML safety (`lib/email/escape-html.ts`), production URL helpers (`lib/email/site-url.ts`), and verifying Resend domain configuration outside the IDE.

### CI workflow setup

- **Intent:** “GitHub Actions: Node 20, npm ci/install, lint, tsc, build on PR/push to main.”
- **Why it worked:** Straightforward YAML (`.github/workflows/ci.yml`).
- **Manual corrections:** Cache strategy, aligning scripts with `package.json`, fixing failures exposed only on Linux CI.

### Results page refinement

- **Intent:** “Client results view: charts/cards, executive summary area, async Gemini fetch with fallback.”
- **Why it worked:** Rapid UI iteration (`components/results/results-client.tsx`).
- **Manual corrections:** Fetch lifecycle (abort/cancel), caching AI summary against `savedAt`, and ensuring displayed numbers always come from `payload.report`, not from model text.

---

## 4. UI / UX Prompting

### SaaS-style layouts and dark dashboard feel

Early prompts were broad (“build a modern SaaS landing page”). Those produced **generic** hero sections and neon gradients that did not match a finance-adjacent tone.

**Evolution:** Prompts became specific: “dark background, restrained accent, Stripe/Vercel-like spacing, readable max-width columns, fewer decorative blobs, more typographic hierarchy.” That reduced rework.

### Recommendation cards and results readability

**Problem:** Initial outputs stacked dense text and duplicated metrics already shown elsewhere.

**Refinement:** Prompts explicitly asked for **card hierarchy** (title + primary metric + short rationale), consistent padding, and mobile stacking. Manual passes still mattered—Tailwind class soup is easy to generate and hard to keep consistent without a human design pass.

### Premium product feel

Cursor was helpful for **component micro-interactions** (hover, borders, subtle glass). The “premium” bar was ultimately set by **manual consolidation**: shared primitives (`glass-card`, app shell), tightening copy, and aligning the results page with the deterministic findings so the UI did not oversell what the engine computed.

---

## 5. Debugging Prompts

### Supabase RLS / insert failures

- **Prompt pattern:** “Postgres RLS error on insert … here is table DDL and policy SQL … client uses anon key …”
- **What AI suggested:** Policy examples (`INSERT` + `SELECT` for returning rows), explanations of `USING` vs `WITH CHECK`.
- **What worked:** Turning ambiguous errors into a short checklist of policy cases to verify against `insertAuditRow`.
- **What needed manual work:** Reproducing with a minimal payload matching `buildAuditInsertPayload`, and validating the **exact** policy match for anonymous website writes—AI could not see the live project settings.

### Environment variables (`GEMINI_API_KEY`, Supabase keys)

- **Prompt pattern:** “`GEMINI_API_KEY_NOT_CONFIGURED` in server route locally but set in `.env.local` …”
- **What worked:** Reminders about server-only env vars, restarting dev server, Vercel project settings for production.
- **Manual:** Confirming which vars are `NEXT_PUBLIC_*` vs server-only; Next’s runtime boundaries are easy to misread once, regardless of assistant quality.

### Routing / share pages

- **Prompt pattern:** “`/audit/[share_id]` 404 for valid UUID …”
- **What worked:** Checking dynamic segment setup, `not-found.tsx`, and fetch conditions.
- **Manual:** Tracing whether the row existed (persistence/RLS), not just the route file.

### Recommendation logic “looks wrong”

- **Prompt pattern:** “Given benchmark X and spend Y, should classification be Z?”
- **What worked:** Reasoning about ratios and thresholds as a sounding board.
- **Manual:** Changing constants and adding Vitest cases—AI is a poor source of truth for numeric policy.

### Email configuration

- **Prompt pattern:** “Resend 403 / domain not verified …”
- **What worked:** High-level checklist (DNS, domain, API key scopes).
- **Manual:** Provider dashboard verification; no shortcut there.

---

## 6. What Did Not Work Well

### AI-generated savings estimates (experimental)

Even with “be conservative” instructions, models **invented** savings pathways that did not follow from list benchmarks. That was the core failure mode that motivated deterministic pricing.

### Generic recommendations

LLM outputs tended toward **template advice** (“negotiate with vendors,” “review usage”) without tying tightly to the modeled actions—readable, but not better than structured engine copy—and impossible to regression test.

### Overconfident financial tone

Summaries sometimes read like a board memo guaranteeing outcomes, especially when real savings were small. Prompt hard rules and post-generation review addressed part of this; **fallback copy** handled the rest when Gemini felt unreliable.

### Overly verbose summaries

Higher temperature / loose instructions produced multi-paragraph responses that fought the UI. Fixing with: explicit **single paragraph** instruction, `maxOutputTokens`, and `sanitizeModelOutput`.

### UI outputs lacking responsiveness

Broad Cursor prompts generated desktop-first layouts. Manual grid/flex tuning and breakpoint passes were still required for smaller screens.

### Refinement pattern that actually worked

When AI failed, the pattern was: **tighten prompt constraints** → **add deterministic guardrails** → **move the responsibility out of the LLM** (the permanent fix for finance logic).

---

## 7. Final Prompting Philosophy

AI tools were best where the cost of a mistake was low: scaffolding, styling iteration, and explaining unfamiliar infrastructure errors. They were worst where mistakes look credible: **currency math**, **policy thresholds**, and anything a user might screenshot to finance.

Deterministic systems were more reliable whenever we needed **repeatability**, **tests**, and **defensible outputs**—which is why pricing and audit recommendations stayed in code, while Gemini was limited to a **bounded narrative** layered on top.

Balancing AI assistance with engineering judgment meant treating the LLM as **a UX layer for language**, not a decision engine—and being willing to delete prompt-heavy approaches when they could not meet that bar.

For financial recommendation systems, **explainable logic** is not optional: stakeholders ask “why,” regulators and partners ask “how,” and future-you asks “what changed between releases?” Code can answer those questions; prompt traces alone cannot.

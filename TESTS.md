# TESTS

## Overview

SpendScope uses deterministic unit tests to validate audit-engine outcomes independently from UI and AI summary generation.  
The strategy is to test pricing math and recommendation rules directly in `runAuditEngine()` so outputs remain transparent, repeatable, and financially defensible.

This test suite focuses on:

- automated unit testing of core audit logic
- deterministic audit engine validation (same input -> same output)
- recommendation accuracy across realistic spend scenarios
- pricing benchmark and savings estimation correctness
- edge-case handling (zero spend and invalid negative inputs)

Audit calculations are tested separately from the frontend because assignment-critical logic (benchmarks, spend classification, and action recommendations) lives in pure TypeScript functions and must remain predictable regardless of rendering concerns.

## Test Framework

- **Framework:** Vitest
- **Primary test location:** `tests/audit-engine.test.ts`
- **Execution command:** `npm run test`

### Commands

```bash
npm run test
npm run lint
npm run build
```

## Automated Audit Engine Tests

All automated tests below are implemented in `tests/audit-engine.test.ts` and run against the real `lib/audit-engine.ts` logic.

| Test File | What It Covers | Input Scenario | Expected Result |
| --------- | -------------- | -------------- | --------------- |
| `tests/audit-engine.test.ts` | Optimized spend classification | Cursor Pro, 3 seats, `$60/mo` spend | Benchmark resolves to `$60`, classified as `Already Optimized`, savings = `$0` |
| `tests/audit-engine.test.ts` | Moderate overspending detection + recommendation | Cursor Pro, 3 seats, `$100/mo` spend | Ratio `1.67x`, classification `Moderate Overspending`, action `Reduce API Spend`, savings above threshold |
| `tests/audit-engine.test.ts` | Major overspending anomaly behavior | Cursor Pro, 1 seat, `$500/mo` spend | Ratio `25x`, classification `Potential Billing Anomaly`, action `Use Credits`, anomaly flag set |
| `tests/audit-engine.test.ts` | Zero-spend / free-tier handling | ChatGPT Free, 1 seat, `$0/mo` spend | Benchmark not forced for free tier, classified `Already Optimized`, no savings modeled |
| `tests/audit-engine.test.ts` | Invalid/edge-case input normalization | Cursor Pro, negative seats and spend (`-2`, `-$50`) | Engine gracefully normalizes to seat floor and non-negative spend; no crash; deterministic output |

## Required Test Cases Coverage

The current test suite validates the assignment-required audit behaviors:

- **Pricing benchmark calculations:** verifies benchmark totals (for example, Cursor Pro at `$20/seat` with 3 seats -> `$60` benchmark)
- **Seat-based pricing logic:** benchmark uses seat count, including normalization floor for invalid seat input
- **Overspending threshold detection:** checks moderate and anomaly-level spend ratio classification
- **Recommendation generation:** validates `Already Optimized`, `Reduce API Spend`, and `Use Credits` action outputs
- **Savings estimation:** confirms monthly savings values are deterministic and threshold-aware
- **Optimization classifications:** covers optimized, moderate overspending, and potential billing anomaly states

Concrete examples included in automated tests:

- Cursor Pro with 3 seats and `$100` spend
- ChatGPT Free plan with `$0` spend
- Overspending detection above benchmark ratios
- Already optimized baseline behavior
- Invalid input handling with graceful normalization

## Running Tests

```bash
npm run test
```

Additional quality checks used in this project:

```bash
npm run lint
npm run build
```

CI is configured to validate linting, tests, TypeScript checks, and production builds automatically.  
Tests are designed specifically for deterministic audit-logic validation so recommendation and pricing behavior remain stable.

## CI/CD Validation

GitHub Actions workflow: `.github/workflows/ci.yml`

On push and pull requests to `main`, CI runs:

- `npm install`
- `npm run lint` (ESLint)
- `npm run test` (Vitest — audit engine)
- `npx tsc --noEmit` (TypeScript validation)
- `npm run build` (production build check)

This ensures code quality and production readiness checks execute automatically on the main branch workflow.

## Final Verification

- Audit engine outputs were manually cross-checked against list-price benchmark math in `lib/pricing.ts`.
- Recommendation outputs were reviewed for financial realism (optimized, moderate overspending, anomaly handling).
- Edge cases (free tier and invalid negative input) were verified for graceful deterministic handling.

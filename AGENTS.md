# AGENTS.md

## Project Overview

SpendScope is an AI spend audit platform designed for startups, engineering teams, and AI-heavy workflows.

The application helps users:

* analyze AI tooling costs
* detect overspending
* compare benchmark pricing
* identify optimization opportunities
* generate shareable audit reports

The platform combines:

* deterministic pricing logic
* benchmark-based recommendations
* AI-generated executive summaries

---

## Core Stack

* Next.js App Router
* TypeScript
* Tailwind CSS
* Supabase
* Gemini API
* Resend
* Vercel

---

## Engineering Principles

### Deterministic Financial Logic

All pricing calculations, savings estimates, and recommendations should remain deterministic and benchmark-driven.

AI should NOT:

* invent pricing logic
* generate financial calculations
* modify benchmark assumptions automatically

AI is only used for:

* personalized executive summaries
* narrative explanations

---

## Important Project Areas

### Audit Engine

Location:

```txt id="m4x8q2"
lib/audit-engine.ts
```

Responsibilities:

* overspending detection
* benchmark comparisons
* optimization recommendations
* savings calculations

Requirements:

* calculations must remain explainable
* recommendations should be financially defensible
* benchmark logic should stay transparent

---

### Pricing Benchmarks

Locations:

```txt id="n7p2v5"
lib/pricing.ts
PRICING_DATA.md
```

Pricing data should:

* align with public vendor pricing pages
* remain easy to update
* avoid undocumented assumptions

---

### AI Summary System

Locations:

```txt id="p1x8m4"
lib/gemini.ts
lib/prompts.ts
lib/fallback-summary.ts
```

Requirements:

* summaries should remain concise and professional
* avoid exaggerated savings claims
* graceful fallback summaries must always exist

---

## UI / UX Guidelines

The product should maintain:

* clean SaaS-style design
* dark dashboard aesthetic
* responsive layouts
* lightweight interactions
* benchmark transparency

Avoid:

* cluttered dashboards
* excessive animations
* unnecessary complexity

---

## Public Report Guidelines

Public reports should:

* focus on savings and recommendations
* avoid exposing sensitive identifying information
* remain easy to share publicly

---

## Deployment

Hosted on:

```txt id="q4n8v1"
Vercel
```

Important environment variables:

```txt id="r7m2x5"
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
GEMINI_API_KEY
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
```

---

## Testing

Audit engine tests are located in:

```txt id="s3v7p2"
tests/audit-engine.test.ts
```

CI workflow:

```txt id="t9x1m6"
.github/workflows/ci.yml
```

Any audit engine changes should preserve:

* benchmark consistency
* recommendation quality
* existing test behavior

---

## Security Notes

This project is intentionally designed as an MVP.

Current tradeoffs:

* lightweight abuse protection
* public share IDs
* simplified Supabase access patterns

Future production improvements may include:

* stricter RLS policies
* authenticated ownership checks
* signed report tokens
* stronger rate limiting

---

## Contributor Guidance

When modifying the project:

* prioritize trust and clarity
* keep recommendations realistic
* avoid overengineering
* maintain deterministic audit behavior
* preserve production stability

This project values:

* explainability
* product clarity
* startup MVP execution
* practical engineering decisions

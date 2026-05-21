# ROUND2_DEVLOG.md

## 2026-05-20 09:00 — Started Round 2 planning

Spent the first 30–40 mins reading the assignment carefully instead of jumping into code immediately. Round 2 felt more architecture-heavy than Round 1, so I wanted to avoid building something messy under time pressure.

Decided early to reuse the existing audit engine instead of creating a second “re-audit” system.

---

## 2026-05-20 10:05 — Added pricing snapshot persistence

Started with the database layer first.

Added a `pricing_snapshot` JSON field so every audit stores the exact benchmark pricing used during generation. This became the base for detecting future pricing changes.

Also updated Supabase policies and insert flow to support the new column cleanly.

---

## 2026-05-20 11:10 — First detect-changes endpoint prototype

Built the initial `/api/detect-changes` route.

Started with very basic comparison logic:

* stored pricing snapshot
  vs
* current TOOL_PRICING config

Temporarily changed Cursor Pro pricing locally just to verify detection was actually working.

---

## 2026-05-20 12:15 — Realized some logic was too vendor-specific

A few parts of the comparison flow accidentally assumed vendors like Cursor and ChatGPT directly.

Refactored the pricing comparison system so:

* labels
* plans
* affected tools
* summaries

all come dynamically from `TOOL_PRICING`.

Wanted future tools to work automatically without rewriting the detection pipeline again.

---

## 2026-05-20 13:20 — Re-audit generation working

Successfully reran stored audits using current benchmark pricing and generated old vs new comparison results.

Big decision here was reusing the existing audit engine instead of creating duplicate recommendation logic.

This kept the behavior deterministic and avoided maintaining two different systems.

---

## 2026-05-20 14:05 — Hit first annoying debugging issue

The diff output was technically correct, but it was showing way too much unchanged information.

Spent around 25–30 mins cleaning up the comparison output so only meaningful changes show up.

Made the results feel more like an actual report instead of raw debugging JSON.

---

## 2026-05-20 15:10 — Started notification email flow

Integrated Resend into the pricing-change workflow.

Initially I was sending one email per affected audit, but then re-read the assignment and noticed they specifically mentioned avoiding notification spam.

Refactored the flow to group audits by email and send one consolidated notification instead.

---

## 2026-05-20 16:20 — Consolidated emails finally working

Grouped multiple affected audits under one email successfully.

The email now dynamically includes:

* changed pricing
* affected audits
* savings changes
* re-audit links

Also made sure failures in one email do not crash the whole detection flow.

---

## 2026-05-20 17:30 — Built the re-audit diff page

Created `/re-audit/[id]`.

The page:

* loads the original audit
* reruns the audit engine with current pricing
* compares old vs new results
* highlights savings and recommendation changes

Kept the UI intentionally simple and report-oriented instead of building charts or dashboards.

---

## 2026-05-20 18:45 — CI suddenly started failing

GitHub Actions started failing after pricing benchmark updates.

Spent a while debugging before realizing older tests still expected outdated Cursor pricing values.

Updated tests to align with the centralized pricing config instead of hardcoded assumptions.

---

## 2026-05-20 20:00 — Preview deployment issues

Preview deployment initially broke because `NEXT_PUBLIC_APP_URL` was still pointing to localhost.

Emails were generating broken re-audit links even though localhost testing worked fine.

Updated preview environment variables and redeployed.

---

## 2026-05-20 21:10 — End-to-end testing

Ran the full reviewer flow several times:

* create audit
* save pricing snapshot
* modify benchmark pricing
* trigger detect-changes
* receive consolidated email
* open re-audit link
* verify comparison page

This was the first point where the entire flow worked properly end-to-end.

---

## 2026-05-20 22:40 — Considered automated pricing scraping

Thought about building automatic vendor pricing scraping, but decided against it.

Given the 36-hour limit, centralized benchmark configs felt safer and more deterministic than brittle parsers against pricing pages.

Kept pricing updates manual through `TOOL_PRICING`.

---

## 2026-05-21 00:15 — Final cleanup phase

Focused mostly on:

* edge cases
* invalid IDs
* missing snapshots
* email failure handling
* loading states
* CI stability

Avoided adding extra features at this point because the core workflow was already complete.

---

## 2026-05-21 02:00 — PR docs and review prep

Started writing:

* ROUND2_PR.md
* ROUND2_DEVLOG.md
* ROUND2_REFLECTION.md

Tried to keep the explanations honest and focused on engineering decisions instead of making the project sound bigger than it is.

---

## 2026-05-21 09:20 — Final verification before submission

Did one final full-flow test on the preview deployment:

* audit creation
* pricing change detection
* consolidated email
* re-audit comparison page
* CI checks

Everything working consistently now. Main focus at this point is keeping the submission stable instead of continuing to add features.

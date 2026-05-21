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

Preview deployment was working partially, but I noticed some routes behaved differently compared to localhost. The biggest issue was around re-audit links and environment variables. `NEXT_PUBLIC_APP_URL` was still pointing to localhost in Preview, which caused generated links inside emails to break even though the flow worked locally. Spent some time checking Vercel environment configs and redeploying until the preview build matched local behavior properly.

---

## 2026-05-20 21:10 — Started making a domain for the site

Decided to set up a proper domain for email delivery after realizing Resend testing mode only allows sending emails to my own address. Since reviewers might test using different emails, I wanted the notification flow to work realistically. Started configuring Cloudflare DNS records for Resend domain verification. This was my first time doing a full email domain setup manually, so I had to carefully check DKIM, SPF, and MX records multiple times.

---

## 2026-05-20 22:40 — Rectified deployment and configuration issues

Most of the deployment issues ended up being environment-related rather than code-related. Fixed incorrect app URLs, redeployed Preview builds, and verified that API routes were using the correct server-side environment variables. Also cleaned up a few edge cases where failed reruns or missing snapshots could cause confusing API responses.Lost one hour

---

## 2026-05-21 06:15 — Reviewed remaining tasks and found a major deployment blocker

Started reviewing the final submission checklist and realized the `/api/detect-changes` endpoint was still failing on the deployed Preview environment even though it worked locally. After debugging for a while, I found that the `SUPABASE_SERVICE_ROLE_KEY` was missing in Vercel Preview environment variables. At the same time, the email domain verification was still propagating, so the notification system could not yet send emails to external recipients. This ended up becoming the biggest blocker during the final stretch.

---

## 2026-05-21 08:00 — Fixed the `/api/detect-changes` deployment issue

Added the missing service role key to Vercel Preview variables and triggered a fresh redeploy. After that, the detection route finally started working correctly on the deployed environment instead of throwing configuration errors. Retested the entire flow again:

* create audit
* modify pricing
* trigger detect-changes
* generate rerun
* send notification email

This was probably the most relieving point of the whole Round 2 process because the full pipeline was finally stable outside localhost.

---

## 2026-05-21 09:20 — Final docs and domain verification waiting

At this point most of the engineering work was done, so I focused on preparing the required submission documents and doing final cleanup. The only thing still pending was DNS propagation for the Resend domain verification, which can take some time depending on the provider. Apart from that, CI was green, Preview deployment was stable, and the re-audit workflow was functioning end-to-end. Still the domain is not created so i am probably not able to submit on time.
I need a domain because the resend requires a domain verification for sending emails to everyone instead on one person. Resend is in test mode right now which send mails to only one mail.

---
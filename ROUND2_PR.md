# Round 2 — Pricing change detection, re-audit, and notifications

## What this PR does

This PR adds the Round 2 “pricing drift” loop on top of the existing SpendScope MVP.

When someone completes an audit, we now persist a **`pricing_snapshot`** (full copy of `TOOL_PRICING` + metadata) alongside `tools_json` and `results_json` in Supabase. Later, a server route can compare that snapshot to the **current** benchmark table, re-run the deterministic audit engine on the same inputs, and surface what changed.

Concretely:

- **`pricing_snapshot` on insert** — every new audit row stores the benchmark catalog as it existed at save time (`lib/audit-db.ts`, `buildAuditPricingSnapshot()`).
- **`GET /api/detect-changes`** — scans stored audits (service role), detects list-price diffs, re-runs the engine, builds diff objects, and optionally sends notification emails (`app/api/detect-changes/route.ts`).
- **Consolidated pricing-change emails** — one Resend message per user email, grouping all affected audits (`lib/detect-changes-notify.ts`, `lib/email/send-pricing-change-notification-email.ts`).
- **`/re-audit/[id]` comparison page** — public diff view (id = share UUID) showing pricing changes, savings before/after, and recommendation deltas (`app/re-audit/[id]`, `components/re-audit/reaudit-comparison-view.tsx`).

Detection, labels, and email copy are **catalog-driven** (`TOOL_PRICING`, `getConfiguredToolIds()`, enriched change objects). No per-vendor hardcoding in the Round 2 pipeline.

---

## Why

Round 1 gave us a one-shot audit against “today’s” benchmarks. That’s fine for a demo, but list prices move. Without a snapshot, we can’t tell whether an old report is stale because **inputs** changed or because **our benchmark table** changed.

The assignment asked for a lightweight way to:

1. Know which stored audits are affected when benchmarks update.
2. Re-run recommendations without re-entering the form.
3. Notify users with enough context to understand what moved.
4. Show a readable before/after view—not just raw JSON.

I kept everything on the existing engine and Supabase model instead of bolting on a second pricing system or a full notification platform.

---

## How it works

### 1. Persistence (write path)

On form submit, `buildAuditInsertPayload()` attaches `pricing_snapshot: buildAuditPricingSnapshot()`—a deep clone of `TOOL_PRICING` plus `pricingDataAsOf` / vendor reference metadata. Share links still use `share_id`; the internal DB `id` stays server-side.

Inserts avoid `.select()` after write so anon RLS doesn’t block saves (no `RETURNING` row for the client—that’s intentional from Round 1 RLS work).

### 2. Pricing change detection (read path)

`GET /api/detect-changes`:

1. Loads audits in pages of 500 via **service role** (bypasses RLS—anon can’t table-scan).
2. For each row, `diffSnapshotToolsAgainstCurrent()` compares `pricing_snapshot.tools` to live `TOOL_PRICING` (plan IDs on both sides, `monthlyPerSeat` only).
3. Rows with **no** price diff are skipped.
4. For affected rows, `parseAuditRowToFormValues()` rebuilds inputs from `tools_json`, then `runAuditEngine()` produces a fresh report.
5. `buildReauditDiff()` compares old `results_json` vs new output (savings deltas, recommendation fingerprints, affected tool labels from the change list).

Skipped safely: null/missing snapshots, unparseable form data, invalid/missing `share_id`, invalid email.

### 3. Notification emails

After detection, `sendPricingChangeNotifications()` groups rows by normalized email and sends **one** consolidated message per address through Resend. Each audit block includes dynamic pricing lines, savings before/after, and a link to `/re-audit/{share_id}` (built with `NEXT_PUBLIC_APP_URL` when set).

Per-recipient send failures are caught and logged; the API still returns JSON with a `notifications` summary.

### 4. Re-audit diff page

`/re-audit/[id]` loads the audit through the existing `get_audit_by_share_id` RPC (anon-safe), rebuilds the same payload as detect-changes, and renders a simple comparison UI—no second engine implementation. `loading.tsx` and `not-found.tsx` cover slow/invalid links.

### Supabase / RLS note

Migrations under `supabase/migrations/` enable RLS on `audits`, add `get_audit_by_share_id`, and require `pricing_snapshot` on anon inserts. These need to be applied in the target project before Round 2 behavior works in production.

---

## What I cut

- **Cron / scheduled workers** — detect-changes is manual (`GET /api/detect-changes`). Good enough for the assignment; didn’t want to fake a scheduler we wouldn’t operate.
- **Vendor price scraping** — benchmarks still update manually in `lib/pricing.ts` / `PRICING_DATA.md`. Snapshots make drift detectable; they don’t automate procurement of new list prices.
- **Admin dashboard** — no internal UI to browse affected audits. The API JSON + email + re-audit page are the workflow.
- **Persisting re-audit results** — the comparison page re-runs the engine on load; we don’t write updated `results_json` back to Supabase (avoids overwriting the historical record without an explicit “save” action).
- **Per-audit emails** — explicitly one consolidated email per user to avoid spam when someone ran multiple audits.
- **Auth on detect-changes** — only rate limiting + env-gated Resend. A shared secret or admin gate felt out of scope for 36 hours.
- **Fancy diff UI** — cards and text comparisons only; no charts, timelines, or enterprise notification preferences/unsubscribe flows.

---

## How to test manually

**Prereqs:** `.env.local` with Supabase keys, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (optional for email), `NEXT_PUBLIC_APP_URL` (for correct links). Apply SQL migrations in Supabase if the hosted DB isn’t migrated yet.

1. **Baseline audit**  
   Run a normal audit at `/audit`, submit with at least one paid tool enabled. Confirm the row in Supabase has `pricing_snapshot`, `tools_json`, `results_json`, `share_id`, `email`.

2. **Change a benchmark**  
   Edit `monthlyPerSeat` for a plan in `lib/pricing.ts` (e.g. Cursor Pro).

3. **Trigger detection**  
   `GET http://localhost:3000/api/detect-changes`  
   Expect `{ audits: [...], notifications: { ... } }`. Only changed rows should appear. Check `reaudit_url` uses your app origin.

4. **Email (if Resend configured)**  
   Use one email across two audits to verify **one** inbox message listing both. Click “View updated audit” per section.

5. **Diff page**  
   Open `/re-audit/{share_id}` from the email or API response (use **share_id**, not the internal DB uuid). Confirm pricing lines, savings before/after/delta, and recommendation blocks for tools that actually changed.

6. **Regression**  
   Share report still works: `/audit/{share_id}` shows the **original** saved snapshot. Re-audit shows the **recomputed** view.

7. **CI locally**  
   `npm test && npm run lint && npx tsc --noEmit && npm run build`

---

## What's tested

- **`tests/audit-engine.test.ts`** — engine classification cases; benchmarks derived via `expectedMonthlyTotal()` from `TOOL_PRICING` so tests don’t rot when list prices change.
- **TypeScript** — `tsc` in CI.
- **Lint + production build** — GitHub Actions workflow (`.github/workflows/ci.yml`).

**Not covered by automated tests (manual / API verification only):**

- `/api/detect-changes` end-to-end (needs service role + seeded DB).
- Resend email HTML rendering and delivery.
- `/re-audit/[id]` page and RPC fetch path.
- `pricing-snapshot-diff` unit tests (logic is straightforward but currently exercised through manual runs).

---

## Open questions / risks

- **Public `GET /api/detect-changes`** — anyone who can hit the URL can trigger a full-table scan and, if Resend is configured, send real emails. Fine for a class demo with a secret URL; I’d protect this before treating it as production infrastructure (shared secret, Vercel protection, or move to a cron with auth).

- **Service role on Vercel** — detect-changes hard-depends on `SUPABASE_SERVICE_ROLE_KEY`. Missing env → 503. That’s correct but easy to misconfigure on deploy.

- **Legacy audits without `pricing_snapshot`** — silently excluded from detection. Expected, but there’s no admin report of “skipped N rows.”

- **Serverless scan cost/latency** — paginating 500 rows per loop is OK for MVP volume; a large `audits` table on a cold serverless function could time out or get expensive. No incremental cursor or “only rows since date X” yet.

- **URL param naming** — route is `/re-audit/[id]` but the value is the **share UUID**, not the Postgres primary key. Documented in code comments; reviewers may need a one-line explanation in the demo.

- **Recommendation engine heuristics** — Round 2 diff UI is dynamic for **pricing**; core `audit-engine.ts` still has some tool-specific recommendation shortcuts (pre-existing). Pricing notifications don’t hardcode vendors, but cross-tool suggestions aren’t fully data-driven.

- **In-memory rate limits** — detect-changes rate limiting is per warm instance, not global.

- **Email link vs saved report** — saved share page still shows old `results_json`; re-audit shows recomputed numbers. That’s by design, but users could confuse the two without reading the banner on the comparison page.

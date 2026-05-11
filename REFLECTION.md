# REFLECTION

## 1. The hardest bug I hit this week and how I debugged it

Honestly, the worst bug wasn’t something that blew up the terminal. It was Supabase RLS blocking inserts into `audits` while the app still looked fine on the surface.

I’d run an audit, the engine would compute everything, and the results page would render because that path mostly lives in client state and the deterministic engine output. Saving was a different story. The insert from the browser would fail with one of those vague Postgres policy errors—sometimes “permission denied,” sometimes the RLS wording—and I wouldn’t always notice right away. The moment it really hurt was when I tried the public share flow: `/audit/[share_id]` would come back empty or useless because nothing had actually persisted, or `fetchAuditByShareId` had nothing real to read.

I wasted a chunk of time assuming I messed up env vars. I re-checked `NEXT_PUBLIC_SUPABASE_URL`, stared at the anon key, even rotated keys once (which didn’t help, because that wasn’t the problem). The table and columns were right; the payload matched what `buildAuditInsertPayload` builds. What I hadn’t fully internalized yet was that my policies didn’t match an anonymous “save from the website” flow.

Once I stopped treating it like a secrets issue, I reproduced the insert with a minimal row, read Supabase logs, and compared policies to what `insertAuditRow` needs—insert plus a returning `select` for `id` and `share_id`. The fix was boring in a good way: adjust RLS so inserts are allowed the way the anon client actually writes, and keep reads tight so share pages only pull the row for that UUID, not the whole table.

What stuck with me is how easy it is for the UI to lie. React can feel “done” while the database quietly says no. After that, I debug persistence first when something looks flaky, not last.

---

## 2. A decision I reversed mid-week and what made me reverse it

I started the week tempted to let the model do more of the “product.” The assignment talks about AI and recommendations in the same breath, and the lazy version of SpendScope is basically: dump the form into Gemini, ask for savings + actions + a paragraph, ship it. You get a demo fast, and the text always sounds confident.

That confidence was the problem. I’d rerun the same-ish inputs and get different savings. A recommendation would disagree with basic seat math. If someone asked, “Where did this dollar amount come from?” I didn’t have a clean answer—just a model trace. I also realized I couldn’t lock the behavior in with tests the way I wanted, because the output wasn’t a pure function of inputs.

So I backed up and split the work the way the codebase reads now: benchmarks and math stay in TypeScript (`pricing` + the audit engine), recommendations stay rule-based, and Gemini only runs after the numbers are fixed—mostly for the executive summary, with the prompt basically yelling “do not invent dollars.” More typing, slower feature count, but I can point at code. I added Vitest around the engine so “moderate overspending” vs “billing anomaly” isn’t vibes, it’s something I can regress.

Tradeoff is real: I spent time wiring thresholds and copy instead of shipping flashy AI features. For a spend tool, though, I’d rather be a little boring and explainable than impressive and wrong.

---

## 3. What I would build in Week 2 if I had more time

Week 1 was about proving the loop: form → audit → results → save → share → email. Week 2, if I had it, would be less about new surfaces and more about making someone want to come back.

I’d want a simple history view—not enterprise BI, just “last few audits” with modeled savings and classifications over time so you can see if things drift month to month. Right now it’s mostly a snapshot product.

Pricing would get attention too. The benchmarks are static, which is fine for an assignment, but in real life vendor pages move. I’d want a lightweight way to refresh `pricing-sources`-style data and tests that fail loudly if a list price change breaks assumptions in the engine (thresholds like minimum savings to recommend a change are easy to accidentally make nonsense).

I’d also try a CSV import path before I’d touch live billing APIs. Real integrations are a project; a structured upload still lets finance-ish people bring real numbers without me pretending I’m Stripe.

Exports and sharing would get polish—PDF that matches the email HTML better, maybe optional password on a share link if people get nervous about UUID links being “public by default.” And I’d like a clearer “why did you label this an anomaly?” panel, because we already encode those rules; showing the inputs that flipped the classification would help trust.

---

## 4. How I used AI tools during development

I lived in Cursor for most of the coding. It was good at scaffolding pages, nudging TypeScript when I was tired, and churning through Tailwind tweaks. I still read everything before I kept it—mostly because Next in this repo isn’t the same as the Next.js patterns I have memorized, and because it’s easy to get plausible-looking code that’s subtly wrong.

I used ChatGPT here and there like a search engine with patience: RLS questions, “what does this error even mean,” turning a wall of logs into a short checklist. Not something I’d copy a whole feature from without stepping through it line by line.

Gemini went in late, on purpose, through the Google SDK and `gemini-1.5-flash`. The important part for the assignment: I did **not** let AI do the pricing math or the audit rules. Savings, benchmarks, and what recommendation you get stay deterministic in `audit-engine.ts` so a human can argue with the logic. AI is for wording around numbers we already computed, and the prompt tries hard to keep it from freelancing new dollar amounts.

That boundary mattered in practice. I had at least one case where the summary *felt* like “big savings” even when the engine only showed a modest monthly delta—tone running ahead of data. I caught it because I was comparing the paragraph to what the results page already showed from the engine, then I tightened the prompt language around low/zero savings and leaned on fallback copy when the model felt hypey.

So: AI sped up typing and helped me unstuck, but anything that could become a financial claim stayed code-first.

---

## 5. Self-rating

| Category | Rating | Explanation |
| -------- | ------ | ----------- |
| Discipline | 7 | I shipped in slices and kept a devlog, but Day 1 slipped for family reasons so the week wasn’t perfectly even. |
| Code quality | 7 | The engine being testable helps a lot; persistence and error messaging are the places I’d still tighten if I had another pass. |
| Design sense | 8 | I’m happy with how the dark SaaS UI and report layout read—clean enough without building a whole design system. |
| Problem-solving | 7 | Splitting deterministic vs narrative work helped; I lost time early chasing the wrong theory on Supabase before RLS clicked. |
| Entrepreneurial thinking | 7 | I biased toward shareable reports, email, and a story finance folks could trust instead of stacking half-finished features. |

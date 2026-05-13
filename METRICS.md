# Metrics

SpendScope is still a thin audit MVP. The numbers I care about are the ones that say “did this help someone finish something useful, and did it travel?”—not raw traffic for its own sake.

## North Star metric

**Completed audits** — form submitted, engine ran, results showed up, and (when persistence behaves) the run saved.

I picked that because everything else is noise if people bounce halfway. Shares and emails are nice, but a share from someone who never finished is often just me testing a route. Completion is the cleanest “did the product do its job?” signal at this stage.

## Three input metrics I’d actually watch

**1. Audit completion rate**  
People who meaningfully start `/audit` vs people who submit. If starts are high and finishes are low, I’m not looking at Twitter—I’m looking at the form and the copy above it.

**2. Share link behavior**  
Of finished audits, how many end up with a **share_id** in the wild, or (if we instrument it) a “copy link” click? That’s a rough read on whether people are **willing to attach their name** to the output.

**3. Email report sends**  
Resend firing on real runs. Stronger intent than a page view—someone wanted this in an inbox, theirs or someone else’s.

Completion feeds the top of the funnel; shares and emails tell you if finished audits **reproduce** eyeballs without paying for them.

## Instrumentation (when I get around to it)

Rough order I’d add events:

1. **`audit_started`** — e.g. first real interaction on the form, not just the page load.
2. **`audit_submitted`** — validation passed, engine path kicked off.
3. **`audit_completed`** — results view has a real payload (client-side is fine for now).
4. **`share_link_copied`** / **`report_emailed`** — the two obvious CTAs on results.

Early funnels that matter: **landing → started → completed**, then **completed → share or email**. I’d ignore fancy heatmaps until those don’t look embarrassing.

## Pivot threshold

First few weeks I’m treating as **truth-seeking**, not a growth hack scoreboard.

**Actually worrying:** completion under **~25%** among people you personally nudged to try it—that usually means too much friction or a muddy promise.

**Also worrying:** lots of finishes, **almost no shares**, from real startups who aren’t shy people. Then the report probably doesn’t feel **forwardable**, or they don’t trust it enough to stake reputation on it.

**If everyone says** “your benchmarks don’t apply to us” because they’re all on heavy enterprise deals, the product story probably needs **CSV or invoice-ish inputs**—not another hero image.

**Might be fine:** one-and-done usage if we’re honest that this is **renewal prep**, not a daily dashboard—then the question is whether anything brings them back quarterly.

**Actually good:** someone DMs “can I run this every quarter?” without you pitching them. That’s the first whisper of **habit**.

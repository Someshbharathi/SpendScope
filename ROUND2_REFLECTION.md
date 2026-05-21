# ROUND2_REFLECTION.md

## 1. What was the most uncomfortable trade-off you made because of the time pressure?

The biggest trade-off I made was deciding not to build automatic pricing scraping from vendor websites. Initially I thought it would make the project feel more “complete,” but the more I looked into it, the more risky it felt for a 36-hour assignment. Every pricing page is structured differently, and I didn’t want the entire re-audit workflow depending on fragile parsers that could randomly break.

Instead, I focused on making the core flow reliable:

* storing pricing snapshots
* detecting benchmark changes
* rerunning audits
* generating diffs
* sending consolidated emails

The assignment allowed manual pricing updates, so I treated automated syncing as something that belongs after the core system is stable. It felt uncomfortable leaving out automation, but I think prioritizing reliability over extra features was the right call here.

---

## 2. If we extended the deadline by another 24 hours right now, what’s the first thing you’d do?

The first thing I’d improve is the `/api/detect-changes` workflow around scheduling and security.

Right now it’s manually triggered because I wanted to make sure the actual re-audit flow worked correctly first before adding more infrastructure. If I had another day, I’d move it behind a protected internal route and add scheduled execution using something like Vercel Cron or GitHub Actions.

I’d also add:

* notification history tracking
* better retry handling for failed emails
* idempotency checks to avoid duplicate notifications
* better logging around skipped audits and failed reruns

Most of the current implementation focuses on correctness and simplicity first. The next step would definitely be making the system more production-ready operationally.

---

## 3. Looking back at your Round 1 codebase as a now-experienced user of it: what’s one thing your Round 1 self made harder for your Round 2 self?

One thing my Round 1 self definitely underestimated was how important centralized configuration would become later. Round 1 was mostly focused on generating a one-time audit report, so I didn’t think deeply about future re-audits, pricing comparisons, or notification workflows.

When I started Round 2, I realized some parts of the logic still indirectly assumed specific tools and vendors. That made the first version of the pricing-change flow harder to generalize cleanly.

I ended up refactoring a lot of the comparison pipeline so things like:

* tool labels
* pricing plans
* affected tools
* summaries

all come dynamically from `TOOL_PRICING` instead of scattered assumptions.

In hindsight, designing the system to be more configuration-driven from the beginning would have saved a lot of cleanup work during Round 2.

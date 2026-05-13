# DEVLOG

---

## Day 1 — 2026-05-06

Since I was busy taking care of my father, I did not get time to check my email that day.  
Because of that, I could not start the project on the first day.

---

## Day 2 — 2026-05-07

### Hours worked
2–3 hours

### What I did
- Checked the assignment email and understood the project requirements
- Started planning the overall architecture and development flow
- Researched the required tech stack and deployment flow
- Decided to use:
  - Next.js (App Router + TypeScript)
  - Tailwind CSS
  - Supabase
  - Vercel deployment
- Planned the overall user flow:
  - Landing page
  - Audit form
  - Audit engine
  - Results page
  - Shareable audit reports

### What I learned
- Supabase project setup and database structure
- Vercel deployment workflow
- SaaS product architecture planning
- AI spend optimization product concepts

### Blockers / What I'm stuck on
- Understanding how to structure the audit recommendation logic realistically

### Plan for tomorrow
- Create the Next.js project structure
- Configure Supabase integration
- Build the landing page UI
- Set up GitHub repository and deployment flow

---

## Day 3 — 2026-05-08

### Hours worked
6–7 hours

### What I did
- Created the Next.js TypeScript project
- Configured Tailwind CSS and base project structure
- Set up Supabase project and database tables
- Connected Supabase with the Next.js application
- Created reusable folder structure:
  - components
  - lib
  - types
  - tests
- Built the landing page UI
- Designed a modern dark SaaS-style interface inspired by Stripe and Vercel
- Implemented responsive layouts and improved overall page scaling
- Fixed layout issues related to centering and spacing
- Connected the project to GitHub

### What I learned
- Supabase environment variable configuration
- Database table setup and JSON storage
- SaaS landing page design patterns
- Responsive UI structuring in Tailwind CSS
- Git and GitHub workflow

### Blockers / What I'm stuck on
- Row Level Security (RLS) issues while inserting audit data into Supabase
- Understanding better ways to structure audit recommendation data

### Plan for tomorrow
- Build the audit form page
- Implement the audit engine logic
- Create the audit results page
- Improve recommendation quality and savings calculations

---

## Day 4 — 2026-05-09

### Hours worked
7–8 hours

### What I did
- Built the AI spend audit form page
- Added support for:
  - ChatGPT
  - Claude
  - Cursor
  - GitHub Copilot
  - Gemini
- Implemented tool toggles, plan selection, spend inputs, and seat inputs
- Built the core audit engine logic
- Added benchmark-based pricing comparisons
- Implemented:
  - overspending detection
  - plan optimization logic
  - recommendation generation
  - estimated savings calculations
- Built the audit results page
- Added:
  - executive summaries
  - optimization recommendations
  - confidence levels
  - benchmark reasoning
  - savings breakdown cards
- Improved recommendation realism and financial reasoning
- Fixed Supabase insert flow and audit persistence
- Generated share IDs for saved audits
- Improved UI polish and card layouts

### What I learned
- Financial recommendation logic design
- Benchmark-based pricing evaluation
- JSON-based audit result storage
- Realistic SaaS audit UX patterns
- Structuring defensible optimization recommendations

### Blockers / What I'm stuck on
- Fine-tuning recommendation thresholds for realistic savings detection
- Improving edge-case handling for unusual pricing inputs

### Plan for tomorrow
- Add public shareable audit pages
- Improve audit result accuracy
- Add Open Graph metadata
- Write documentation files
- Add testing and deployment polish
- Finalize the project for submission

---

## Day 5 — 2026-05-10

### Hours worked
7 hours

### What I did
- Implemented public shareable audit report pages using dynamic routing
- Added `/audit/[share_id]` public report flow
- Connected shared reports with Supabase persistence
- Implemented copy share link functionality
- Added email delivery flow for audit reports
- Integrated Resend for transactional email sending
- Added downloadable audit report support
- Implemented AI-generated personalized executive summaries
- Integrated Gemini API for executive summary generation
- Added graceful fallback summaries for API failures
- Improved recommendation messaging and financial reasoning tone
- Refined audit result explanations to feel more consultant-style and trustworthy
- Improved savings framing and optimization narrative
- Added GitHub Actions CI workflow
- Created architecture documentation and Mermaid system flowchart
- Improved production-level project structure and documentation organization
- Polished UI consistency and report readability

### What I learned
- Gemini API integration and prompt engineering
- Transactional email workflows using Resend
- Public report sharing architecture in Next.js
- Dynamic routing and read-only report rendering
- CI/CD workflows using GitHub Actions
- Executive-style financial summary generation
- SaaS product documentation structuring
- Fallback handling for external AI APIs

### Blockers / What I'm stuck on
- Fine-tuning AI-generated summaries for maximum consistency
- Improving edge-case handling for unusual audit inputs
- Finalizing documentation and production polish

### Plan for tomorrow
- Complete remaining documentation files
- Add screenshots and deployment links to README
- Finalize TESTS.md and REFLECTION.md
- Verify full production flow end-to-end
- Final deployment and submission polish
- Finalize the project for submission

---

## Day 6 — 2026-05-11

**Hours worked:** 5

**What I did:**
- Added GitHub Actions CI workflow for automated linting, TypeScript checks, and production builds
- Completed major documentation files:
  - ARCHITECTURE.md
  - PROMPTS.md
  - REFLECTION.md
  - TESTS.md
- Added Mermaid architecture flowchart documentation
- Improved landing page layout and overall SaaS UI consistency
- Added screenshots and deployment-related updates to README
- Fixed download report page layout and improved PDF export experience
- Added Vercel Analytics integration
- Improved responsiveness and polished multiple UI sections across the application
- I apologize for integrating the CI workflow later in the development timeline. My initial focus was on stabilizing the core MVP features, audit engine, and    deployment flow before automating validation checks. Once the primary functionality was completed and tested, I added the GitHub Actions workflow to handle linting, automated tests, TypeScript checks, and production build verification.


**What I learned:**
- How CI workflows improve production confidence and code quality
- How architecture documentation helps communicate engineering decisions
- How deployment preparation requires additional cleanup and production checks
- How polished UI consistency improves perceived SaaS quality

**Blockers / what I'm stuck on:**
- Minor deployment testing inconsistencies
- Final production polish before public deployment

**Plan for tomorrow:**
- Improve results page interactions and audit UX
- Add benchmark explanation modal
- Improve public report sharing experience
- Continue deployment testing and cleanup
  
---

## Day 7 — 2026-05-12

**Hours worked:** 5

**What I did:**
- Improved results page UI and corrected multiple layout inconsistencies
- Fixed button interaction issues on the audit results page
- Refined recommendation cards and savings display sections
- Corrected multiple results-page behaviors and recommendation outputs
- Improved audit form numeric input behavior for cleaner UX
- Fixed leading zero issue in monthly spend and seat input fields
- Added example public report support
- Improved shareable report experience and public audit flow
- Continued polishing SaaS dashboard styling and responsiveness
- Performed additional deployment testing and production cleanup

**What I learned:**
- How small UX issues significantly affect SaaS product quality
- How recommendation wording impacts perceived financial credibility
- How public report sharing improves virality and product trust
- How deployment testing exposes production-specific issues
- How polished interactions improve overall product professionalism

**Blockers / what I'm stuck on:**
- Fine-tuning recommendation wording and benchmark explanations
- Minor edge-case handling on the results page

**Plan for tomorrow:**
- Add benchmark explanation modal
- Add entrepreneurial documentation files
- Perform final project review against assignment requirements
- Improve production readiness and cleanup
- Finalize deployment and submission polish

---

## Day 8 — 2026-05-13

**Hours worked:** 4

**What I did:**
- Added “See Benchmarking” modal popup with detailed benchmark explanations
- Improved transparency around pricing comparisons and audit reasoning
- Added all entrepreneurial documentation files:
  - GTM.md
  - ECONOMICS.md
  - USER_INTERVIEWS.md
  - LANDING_COPY.md
  - METRICS.md
- Performed multiple final project audits against assignment requirements
- Improved documentation consistency and production-readiness explanations
- Added lightweight API abuse protection for:
  - AI summary generation
  - email report APIs
- Removed debug logs and performed final cleanup
- Improved consistency between landing page messaging and actual MVP functionality
- Added documentation explaining MVP-stage Supabase security tradeoffs
- Updated CI workflow to include automated test execution
- Fixed README deployment URL and environment variable documentation
- Improved public share report privacy handling
- Added final fixes and production cleanup before submission
- Verified deployment environment configuration and GitHub Actions status

**What I learned:**
- How entrepreneurial thinking and engineering quality complement each other in SaaS products
- How reviewer trust depends heavily on honest documentation and realistic claims
- How benchmark transparency improves credibility in financial recommendation systems
- How lightweight production safeguards improve MVP reliability
- How final production polish significantly affects perceived product quality

**Blockers / what I'm stuck on:**
- No major blockers remaining
- Remaining work is limited to final submission verification and minor polish

**Plan for tomorrow:**
- Perform one final production test pass
- Verify all deployment links and documentation
- Double-check CI/build/test status
- Final repository cleanup
- Submit the project
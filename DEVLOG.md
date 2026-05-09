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
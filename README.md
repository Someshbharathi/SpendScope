# SpendScope

SpendScope is an AI spend optimization platform that helps startups and small teams analyze their AI tooling costs, identify overspending, and discover realistic savings opportunities. Users can audit tools like ChatGPT, Claude, Cursor, GitHub Copilot, and Gemini based on pricing benchmarks, seat counts, and usage patterns.

The platform generates actionable recommendations, estimated monthly and annual savings, downloadable reports, public shareable audit links, and email-delivered audit summaries. The goal is to make AI cost optimization simple, transparent, and financially defensible for growing teams.

---

# Live Demo

Deployed URL:  
https://your-vercel-url.vercel.app

---

# Features

- AI spend audit engine
- Benchmark-based pricing analysis
- Overspending detection
- Tool and plan optimization recommendations
- Monthly and annual savings estimation
- Shareable public audit reports
- Email delivery of audit reports
- Downloadable audit reports
- Responsive modern SaaS UI
- Supabase-backed audit persistence

---

# Supported Tools

- ChatGPT
- Claude
- Cursor
- GitHub Copilot
- Gemini (Google AI)

---

# Tech Stack

## Frontend
- Next.js 15
- TypeScript
- Tailwind CSS

## Backend / Infrastructure
- Supabase
- Resend
- Vercel

---

# Screenshots

## Landing Page
(Add screenshot here)

## Audit Form
(Add screenshot here)

## Audit Results Page
(Add screenshot here)

## Shareable Audit Report
(Add screenshot here)

---

# Quick Start

## 1. Clone the repository

```bash
git clone https://github.com/your-username/SpendScope.git
cd SpendScope
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. Run locally

```bash
npm run dev
```

Visit:
```
http://localhost:3000
```

---

# Deployment

The application is deployed using Vercel.

To deploy:

```bash
vercel
```

Production environment variables should be configured inside the Vercel dashboard.

---

# Audit Engine Logic

The audit engine evaluates:

- Whether the current plan matches the user's seat count and usage
- If a cheaper plan exists from the same vendor
- If a better-value alternative tool exists
- If pricing significantly exceeds expected retail benchmarks
- Potential monthly and annual savings opportunities

Recommendations are benchmark-driven and designed to feel financially realistic rather than exaggerated.

---

# Shareable Reports

Each completed audit generates:
- a unique public report URL
- downloadable report support
- email-delivered summaries

Example:
```
/audit/[share_id]
```

---

# Decisions & Trade-offs

## 1. Used deterministic pricing logic instead of AI-generated recommendations
This keeps recommendations transparent, explainable, and financially defensible.

## 2. Chose Supabase over a custom backend
Supabase accelerated development speed while still supporting scalable storage and public sharing functionality.

## 3. Implemented shareable links instead of authentication
Authentication was intentionally skipped to keep the MVP frictionless and focused on audit delivery.

## 4. Used public pricing benchmarks instead of live API billing integrations
Direct billing integrations would significantly increase complexity and implementation time for the MVP.

## 5. Sent email summaries with share links instead of generating complex PDF exports initially
This simplified the email flow and improved development speed while still delivering a professional user experience.

---

# Future Improvements

- Live billing integrations
- AI-generated optimization explanations
- Team collaboration dashboards
- Historical audit tracking
- Smarter usage analytics
- Enterprise reporting workflows

---

# Author

Somesh Bharathi
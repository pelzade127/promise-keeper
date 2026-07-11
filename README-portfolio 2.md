<div align="center">

# 🌸 Bloom

### A calm, pastel debt-payoff & savings co-pilot

Bloom turns a messy pile of debts, bills, and goals into a single, clear, month-by-month plan — with a real debt-free date you can watch move. Built to feel supportive and non-shaming, like a financial co-pilot rather than a budgeting punishment tool.

[**Live demo →**](https://bloom-app-topaz.vercel.app)

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_Auth-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## About

Most budgeting apps tell you *what you did wrong*. Bloom focuses on the one thing that keeps people going: a visible finish line. You enter your income, bills, debts, and savings goals once, and Bloom computes an exact month-by-month payoff plan — what to pay, when, which debt gets the extra money, how much interest you'll save, and your estimated debt-free date. Savings grow on the same timeline, so paying down debt and building a cushion stop feeling like a tradeoff you have to guess at.

It's designed to be flexible: switch strategies anytime, adjust how your spare money is split between debt and savings, reorder priorities, or build a fully custom plan as life changes.

<!-- Add a screenshot to make the repo shine:
1. Take a screenshot of the dashboard
2. Save it as docs/screenshot.png
3. Uncomment the line below
-->
<!-- ![Bloom dashboard](docs/screenshot.png) -->

## Features

- **Six payoff strategies, one engine** — debt snowball, avalanche, a tunable snowball↔avalanche **blend**, cash-flow (highest-minimum-first), interest-cost (most expensive debt first), and a fully custom order.
- **Month-by-month plan** — exactly what to pay on each debt every month, with running balances and per-debt payoff milestones.
- **Strategy comparison** — the same numbers across every strategy, with clear "least interest" and "fastest" markers so the tradeoffs are obvious.
- **Debt + savings on one timeline** — a single slider splits your monthly surplus between extra debt payments and savings; the dual-trajectory chart shows both at once.
- **Live what-ifs** — every edit recomputes the whole plan instantly.
- **Monthly check-in** — the first time you open the app in a new month, Bloom asks "did this go as planned?" and updates your balances with one tap — or your real numbers — and quietly catches up several months at once if you've been away.
- **Accounts & sync** — email/password sign-in; your data saves automatically and follows you across devices.
- **Installable PWA** — add it to a phone home screen and it opens full-screen like a native app.
- **Supportive by design** — soft pastel UI, encouraging copy, and a gentle "no room right now, and that's okay" mode when money is tight instead of an error.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS, custom pastel design system |
| Charts | Recharts |
| Icons | Lucide |
| Backend | Supabase (PostgreSQL + Auth) |
| Security | Postgres Row Level Security |
| Hosting | Vercel (frontend), Supabase (database) |
| Offline / install | vite-plugin-pwa (Workbox service worker) |

## How it works

The payoff math lives in a single **pure, deterministic engine** — a monthly simulation that accrues interest, pays minimums, then routes the leftover budget to one target debt according to the chosen strategy, rolling freed-up payments forward (the snowball effect). Because it's a pure function, the UI runs it client-side for instant feedback, and the same logic could run anywhere.

Persistence is **frontend-direct to Supabase** — no separate API server to host. Each user's income, debts, expenses, and plan settings live in Postgres, protected by Row Level Security so a signed-in user can only ever read or write their own rows. Edits auto-save with a short debounce.

```
React app ──► Supabase Auth (email/password)
          └─► Supabase Postgres (RLS-protected)  ◄── one row-set per user
   │
   └─ payoff engine (pure TS-style module, runs in the browser)
```

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org) (LTS).

```bash
git clone https://github.com/pelzade127/bloom-app.git
cd bloom-app
npm install
```

**Connect a free Supabase project:**

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the contents of [`supabase-schema.sql`](supabase-schema.sql) to create the tables and security policies.
   *(Upgrading a database created before the monthly check-in feature? Also run [`supabase-migration-add-plan-month.sql`](supabase-migration-add-plan-month.sql).)*
3. *(Optional, for friction-free sign-up)* In **Authentication → Sign In / Providers → Email**, turn off **Confirm email**.
4. Grab your **Project URL** and **anon/publishable key** from the project's **Connect** dialog (or **Settings → API Keys**).
5. Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

**Run it:**

```bash
npm run dev      # local dev server
npm run build    # production build
npm run preview  # preview the production build (PWA install works here)
```

## Deployment

Deployed on Vercel from GitHub: import the repo, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Environment Variables**, and deploy. Every push to `main` redeploys automatically.

## Roadmap

- Payment reminders near due dates
- Promo / intro-APR handling
- Multiple savings goals with target dates
- Biweekly-paycheck calendar accuracy
- "What-if" scenario saving

## A note

Bloom shows projections based on the numbers you enter. It's a planning companion, not financial advice — real interest and dates may vary.

## License

Released under the MIT License.

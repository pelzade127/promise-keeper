# Promise Keeper

> Every promise has a person attached.

A relationship stewardship platform — not a task manager. The goal isn't
productivity; it's faithfulness. Remember the people behind your commitments and
keep showing up for them over time.

**Stack:** Next.js 15 (App Router, Server Components) · TypeScript · Tailwind ·
shadcn/ui · Supabase (Postgres + Auth + RLS) · deploys to Vercel.

---

## What's in this phase (Phase 1 — foundation)

- Complete database schema with Row Level Security (`supabase/migrations/0001_…`)
- Supabase SSR auth wiring (browser, server, middleware clients)
- Sign up / sign in / sign out / password reset
- Route protection via middleware
- The dashboard shell: **"Today you can be faithful to…"** with people-first cards
- The warm "evergreen" design system (linen paper, devotional gold, Fraunces display)

Promise creation, the completion flow, journal, timeline, groups, Faith Mode,
accountability partners, and the stats / Memory Lane pages come in later phases.

---

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Create a Supabase project**, then run the migration. Either paste
   `supabase/migrations/0001_promise_keeper_schema.sql` into the Supabase SQL
   editor, or with the CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

3. **Environment variables** — copy `.env.example` to `.env.local` and fill in
   your project URL and anon key (Supabase → Settings → API).

4. **Auth redirect** — in Supabase → Authentication → URL Configuration, add
   `http://localhost:3000/**` (and your Vercel URL) to the allowed redirect URLs
   so the password-reset link works.

5. **Run**
   ```bash
   npm run dev
   ```

> The eight default categories (Prayer, Financial, Encouragement, Activity,
> Family, Friendship, Health, Spiritual Growth) are seeded automatically when a
> user signs up, via the `handle_new_user` trigger.

---

## shadcn/ui

`components.json` is configured against the design tokens in `app/globals.css`,
so you can pull in primitives as the forms arrive in Phase 2:

```bash
npx shadcn@latest add button input dialog select textarea
```

They'll inherit the evergreen palette automatically.

---

## Structure

```
app/
  globals.css            design system tokens (evergreen / linen / gold)
  layout.tsx             fonts (Fraunces + Figtree)
  login/                 auth UI + server actions
  auth/update-password/  reset-link landing
  (app)/dashboard/       the "Today you can be faithful to…" shell
lib/
  supabase/              client / server / middleware
  dashboard.ts           buckets promises the people-first way
components/              promise-card, sign-out
types/database.ts        typed rows (regenerate via supabase gen types)
supabase/migrations/     the schema
```

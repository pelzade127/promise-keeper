-- ────────────────────────────────────────────────────────────
-- Bloom database schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- ────────────────────────────────────────────────────────────

-- One profile row per user (income, savings targets, and plan settings)
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users on delete cascade,
  pay_amount   numeric  default 0,
  pay_freq     text     default 'biweekly',
  sav_current  numeric  default 0,
  sav_target   numeric  default 0,
  sav_apy      numeric  default 4,
  strategy     text     default 'snowball',
  split        int      default 70,
  blend_w      int      default 50,
  custom_order jsonb    default '[]'::jsonb,
  has_setup    boolean  default false,
  plan_month   date,
  updated_at   timestamptz default now()
);

-- Each debt (composite key so two users can both have an id like "cc1")
create table if not exists public.debts (
  user_id uuid not null references auth.users on delete cascade,
  id      text not null,
  name    text,
  type    text,
  balance numeric default 0,
  apr     numeric default 0,
  min     numeric default 0,
  due     int     default 1,
  primary key (user_id, id)
);

-- Each monthly expense
create table if not exists public.expenses (
  user_id uuid not null references auth.users on delete cascade,
  id      text not null,
  name    text,
  amount  numeric default 0,
  primary key (user_id, id)
);

-- Row Level Security: a signed-in user can only read/write their OWN rows
alter table public.profiles enable row level security;
alter table public.debts    enable row level security;
alter table public.expenses enable row level security;

create policy "own profile"  on public.profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own debts"    on public.debts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own expenses" on public.expenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Expose the tables to signed-in users through the API
-- (explicit grants are required for Supabase projects created after May 30, 2026)
grant usage on schema public to authenticated;
grant all on public.profiles to authenticated;
grant all on public.debts    to authenticated;
grant all on public.expenses to authenticated;

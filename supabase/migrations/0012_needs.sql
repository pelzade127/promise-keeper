-- -----------------------------------------------------------------------------
-- 0012_needs.sql
-- Needs are the missing layer between a person and their promises: "Sarah has
-- a need around employment" is the real thing; "pray for Sarah's interview"
-- is one promise that serves it. Person-scoped only (not groups), matching
-- the brief's hierarchy. Attachment to a need is OPTIONAL everywhere — existing
-- promises, journal entries, and milestones created before Needs existed
-- keep working exactly as they do now, un-migrated and un-forced into a need.
-- -----------------------------------------------------------------------------

do $$ begin
  create type need_status as enum ('active', 'resolved', 'archived');
exception when duplicate_object then null;
end $$;

create table if not exists public.needs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  person_id    uuid not null references public.people (id) on delete cascade,
  title        text not null,
  description  text,
  status       need_status not null default 'active',
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.needs enable row level security;

drop policy if exists "needs_owner_all" on public.needs;
create policy "needs_owner_all" on public.needs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists needs_person_idx on public.needs (person_id);
create index if not exists needs_user_status_idx on public.needs (user_id, status);

-- Optional attachment points — nothing existing is touched or required to
-- have one.
alter table public.promises
  add column if not exists need_id uuid references public.needs (id) on delete set null;
alter table public.journal_entries
  add column if not exists need_id uuid references public.needs (id) on delete set null;
alter table public.milestones
  add column if not exists need_id uuid references public.needs (id) on delete set null;

create index if not exists promises_need_idx on public.promises (need_id);
create index if not exists journal_need_idx on public.journal_entries (need_id);
create index if not exists milestones_need_idx on public.milestones (need_id);

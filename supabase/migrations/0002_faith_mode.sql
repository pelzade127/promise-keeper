-- -----------------------------------------------------------------------------
-- 0002_faith_mode.sql
-- Faith Mode additions: answered prayers + weekly reflections (examen).
-- Safe to run once against the existing schema.
-- -----------------------------------------------------------------------------

-- Answered prayers: a prayer promise can be marked answered, with a testimony note.
alter table public.promises
  add column if not exists answered_at timestamptz,
  add column if not exists answer_note text;

-- Weekly reflections (a gentle examen) — not tied to a single person or group.
create table if not exists public.reflections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table public.reflections enable row level security;

drop policy if exists "reflections_owner_all" on public.reflections;
create policy "reflections_owner_all" on public.reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists reflections_user_created_idx
  on public.reflections (user_id, created_at desc);

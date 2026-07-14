-- -----------------------------------------------------------------------------
-- 0011_milestones.sql
-- Milestones are moments a person deliberately marks — never generated,
-- always real data the user chose to record. Distinct from promise_events
-- (automatic, tied to a promise's lifecycle) and journal_entries (free-form
-- reflection): a milestone is a specific, named kind of turning point.
-- -----------------------------------------------------------------------------

do $$ begin
  create type milestone_type as enum (
    'answered_prayer',
    'need_resolved',
    'relationship_restored',
    'major_life_event',
    'grief_anniversary',
    'meaningful_moment',
    'promise_evolved'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.milestones (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  person_id    uuid references public.people (id)   on delete cascade,
  group_id     uuid references public.groups (id)   on delete cascade,
  promise_id   uuid references public.promises (id) on delete set null,
  milestone_type milestone_type not null,
  title        text not null,
  note         text,
  occurred_on  date not null default current_date,
  created_at   timestamptz not null default now()
);

alter table public.milestones enable row level security;

drop policy if exists "milestones_owner_all" on public.milestones;
create policy "milestones_owner_all" on public.milestones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists milestones_user_occurred_idx
  on public.milestones (user_id, occurred_on desc);
create index if not exists milestones_person_idx on public.milestones (person_id);
create index if not exists milestones_group_idx on public.milestones (group_id);

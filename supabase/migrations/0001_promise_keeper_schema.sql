-- =============================================================================
-- PROMISE KEEPER — Database Schema (Migration 0001)
-- =============================================================================
-- A relationship stewardship platform. Every promise has a person attached.
-- This migration is the Phase 1 foundation: all tables, enums, relationships,
-- indexes, Row Level Security, and the triggers that keep the timeline honest.
--
-- Run once in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: enums are guarded, tables use IF NOT EXISTS, policies are
-- dropped before being recreated.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ENUMERATED TYPES
-- -----------------------------------------------------------------------------
-- Wrapped in DO blocks so the migration is idempotent during development.

do $$ begin
  -- A person/group moving through their lifecycle. We never hard-delete history;
  -- we archive or memorialize instead.
  create type entity_status as enum ('active', 'archived', 'memorialized');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Who/what a promise is for.
  create type promise_target as enum ('person', 'group', 'self');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Open-ended care reframes "Did you complete this?" as "Did you care for them?"
  create type promise_type as enum ('one_time', 'recurring', 'open_ended_care');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Current state of a promise. Recurring/open-ended promises stay 'active' and
  -- log completion *events* per cycle rather than terminating.
  create type promise_status as enum ('active', 'completed', 'released');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promise_recurrence as enum
    ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type follow_up_type as enum ('none', 'one_time', 'recurring');
exception when duplicate_object then null; end $$;

do $$ begin
  create type journal_entry_type as enum
    ('reflection', 'prayer', 'update', 'follow_up', 'note', 'memory');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Every major action becomes a timeline event of one of these kinds.
  create type promise_event_type as enum (
    'created', 'completed', 'evolved', 'recommitted', 'released',
    'missed', 'follow_up_completed', 'journal_added', 'memorialized'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  -- Why a promise was missed. Used to inform — never to shame.
  create type missed_reason as enum (
    'forgot', 'got_busy', 'avoided', 'circumstances_changed', 'no_longer_relevant'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type accountability_visibility as enum (
    'everything', 'overdue_only', 'weekly_digest', 'selected_categories'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type accountability_status as enum
    ('pending', 'accepted', 'declined', 'revoked');
exception when duplicate_object then null; end $$;


-- -----------------------------------------------------------------------------
-- 2. SHARED HELPERS
-- -----------------------------------------------------------------------------

-- Keeps updated_at current on any row that changes.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. TABLES
-- -----------------------------------------------------------------------------

-- user_profiles --------------------------------------------------------------
-- One row per authenticated user. Holds app-level preferences such as Faith Mode
-- (off by default — faith content is invited, never forced).
create table if not exists public.user_profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  faith_mode    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- people ---------------------------------------------------------------------
-- The heart of the app. A person the user wants to remember and care for.
create table if not exists public.people (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null,
  relationship_note text,
  status            entity_status not null default 'active',
  memorialized_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- groups ---------------------------------------------------------------------
-- A collection of people (Johnson Family, Small Group, Work Team). Behaves like
-- a person: has promises and a timeline of its own.
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  status      entity_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- group_members --------------------------------------------------------------
-- Join table linking people to groups (a person may belong to many groups).
create table if not exists public.group_members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  group_id   uuid not null references public.groups (id) on delete cascade,
  person_id  uuid not null references public.people (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, person_id)
);

-- categories -----------------------------------------------------------------
-- Per-user categories. The eight defaults are seeded on signup; users may add
-- unlimited custom ones. Each carries default reminder/follow-up timing so a
-- new promise can inherit sensible cadence.
create table if not exists public.categories (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  name                   text not null,
  color                  text,
  is_default             boolean not null default false,
  default_reminder_days  int,   -- days before due_date to remind (0 = day of)
  default_follow_up_days int,   -- suggested follow-up cadence in days
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (user_id, name)
);

-- promises -------------------------------------------------------------------
-- A commitment made by the user, attached to a person, a group, or the self.
create table if not exists public.promises (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  title                 text not null,
  why_it_matters        text,
  category_id           uuid references public.categories (id) on delete set null,

  -- Target: exactly one of person / group / self (enforced below).
  target_type           promise_target not null default 'self',
  person_id             uuid references public.people (id) on delete cascade,
  group_id              uuid references public.groups (id) on delete cascade,

  promise_type          promise_type   not null default 'one_time',
  status                promise_status not null default 'active',

  -- Recurrence
  recurrence            promise_recurrence not null default 'none',
  recurrence_interval_days int,           -- used when recurrence = 'custom'

  -- Scheduling
  due_date              date,
  next_due_date         date,             -- upcoming instance for recurring promises

  -- Reminders
  reminder_enabled      boolean not null default true,
  reminder_days_before  int     not null default 0,

  -- Follow-ups
  follow_up_type        follow_up_type not null default 'none',
  follow_up_interval_days int,
  next_follow_up_date   date,

  -- Lifecycle timestamps
  completed_at          timestamptz,
  released_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- A promise's target columns must agree with its target_type.
  constraint promise_target_consistent check (
    (target_type = 'person' and person_id is not null and group_id is null) or
    (target_type = 'group'  and group_id  is not null and person_id is null) or
    (target_type = 'self'   and person_id is null     and group_id is null)
  )
);

-- journal_entries ------------------------------------------------------------
-- Reflections, prayers, updates, memories — the prose that fills out a person's
-- (or group's) story. May optionally link back to a specific promise.
create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  person_id   uuid references public.people (id)   on delete cascade,
  group_id    uuid references public.groups (id)   on delete cascade,
  promise_id  uuid references public.promises (id) on delete set null,
  entry_type  journal_entry_type not null default 'note',
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- promise_events -------------------------------------------------------------
-- The timeline. Every major action lands here. person_id / group_id are
-- denormalized so a single person's care history reads in one fast query.
-- previous_value / new_value capture evolution (old wording -> new wording).
create table if not exists public.promise_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  promise_id     uuid references public.promises (id) on delete cascade,
  person_id      uuid references public.people (id)   on delete cascade,
  group_id       uuid references public.groups (id)   on delete cascade,
  event_type     promise_event_type not null,
  note           text,            -- short label / summary for the timeline
  reflection     text,            -- the user's optional "what did you pray about?"
  missed_reason  missed_reason,   -- only on 'missed' events
  previous_value text,            -- for 'evolved': prior promise wording
  new_value      text,            -- for 'evolved': new promise wording
  metadata       jsonb,           -- room to grow without a migration
  created_at     timestamptz not null default now()
);

-- accountability_partners ----------------------------------------------------
-- An invitation (by email) for someone to help keep the user accountable.
-- The owner controls exactly what is shared via `visibility`.
create table if not exists public.accountability_partners (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references auth.users (id) on delete cascade,
  partner_id           uuid references auth.users (id) on delete set null,
  partner_email        text not null,
  visibility           accountability_visibility not null default 'overdue_only',
  selected_category_ids uuid[],   -- used when visibility = 'selected_categories'
  status               accountability_status not null default 'pending',
  invited_at           timestamptz not null default now(),
  responded_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 4. INDEXES
-- -----------------------------------------------------------------------------
-- Tenant scoping first (every query filters by user), then the hot paths:
-- dashboard (due dates), per-person timelines, and follow-ups.

create index if not exists idx_people_user            on public.people (user_id);
create index if not exists idx_people_user_status     on public.people (user_id, status);

create index if not exists idx_groups_user            on public.groups (user_id);

create index if not exists idx_group_members_user     on public.group_members (user_id);
create index if not exists idx_group_members_group    on public.group_members (group_id);
create index if not exists idx_group_members_person   on public.group_members (person_id);

create index if not exists idx_categories_user        on public.categories (user_id);

create index if not exists idx_promises_user          on public.promises (user_id);
create index if not exists idx_promises_person        on public.promises (person_id);
create index if not exists idx_promises_group         on public.promises (group_id);
create index if not exists idx_promises_category      on public.promises (category_id);
-- Dashboard: "promises due today / overdue" for active promises.
create index if not exists idx_promises_due           on public.promises (user_id, status, due_date);
create index if not exists idx_promises_follow_up      on public.promises (user_id, next_follow_up_date)
  where next_follow_up_date is not null;

create index if not exists idx_journal_user           on public.journal_entries (user_id);
create index if not exists idx_journal_person_time    on public.journal_entries (person_id, created_at desc);
create index if not exists idx_journal_group_time     on public.journal_entries (group_id, created_at desc);

create index if not exists idx_events_user            on public.promise_events (user_id);
create index if not exists idx_events_promise_time    on public.promise_events (promise_id, created_at desc);
-- Per-person care timeline, newest first.
create index if not exists idx_events_person_time     on public.promise_events (person_id, created_at desc);
create index if not exists idx_events_group_time      on public.promise_events (group_id, created_at desc);

create index if not exists idx_partners_owner         on public.accountability_partners (owner_id);
create index if not exists idx_partners_partner       on public.accountability_partners (partner_id);


-- -----------------------------------------------------------------------------
-- 5. updated_at TRIGGERS
-- -----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles', 'people', 'groups', 'categories',
    'promises', 'journal_entries', 'accountability_partners'
  ] loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 6. NEW USER BOOTSTRAP
-- -----------------------------------------------------------------------------
-- On signup: create the profile and seed the eight default categories with a
-- warm palette and sensible default cadence. Runs as SECURITY DEFINER so it can
-- write into public.* from the auth schema trigger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.categories
    (user_id, name, color, is_default, default_reminder_days, default_follow_up_days)
  values
    (new.id, 'Prayer',           '#8B7FD4', true, 0, 3),
    (new.id, 'Financial',        '#6FA287', true, 1, 7),
    (new.id, 'Encouragement',    '#E0A458', true, 0, 7),
    (new.id, 'Activity',         '#6C9BD1', true, 0, null),
    (new.id, 'Family',           '#D98C7A', true, 0, 14),
    (new.id, 'Friendship',       '#E08A9B', true, 0, 14),
    (new.id, 'Health',           '#79B791', true, 0, 7),
    (new.id, 'Spiritual Growth', '#C9A227', true, 0, 7)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 7. TIMELINE: auto-log promise creation
-- -----------------------------------------------------------------------------
-- The one event we always want and can capture unambiguously at the DB level.
-- All other events (completed / evolved / recommitted / released / missed /
-- follow_up_completed / journal_added / memorialized) are written explicitly by
-- the application, because they carry reflections, missed reasons, and before/
-- after wording that only the app has at hand.

create or replace function public.log_promise_created()
returns trigger language plpgsql as $$
begin
  insert into public.promise_events
    (user_id, promise_id, person_id, group_id, event_type, note)
  values
    (new.user_id, new.id, new.person_id, new.group_id, 'created', new.title);
  return new;
end;
$$;

drop trigger if exists trg_promise_created on public.promises;
create trigger trg_promise_created
  after insert on public.promises
  for each row execute function public.log_promise_created();


-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
-- The rule: a user can only ever touch their own data. Enable RLS on every
-- table, then attach an owner-scoped policy. Accountability partners get extra
-- read policies layered on in Phase 7 (kept out of the base for clarity).

alter table public.user_profiles          enable row level security;
alter table public.people                 enable row level security;
alter table public.groups                 enable row level security;
alter table public.group_members          enable row level security;
alter table public.categories             enable row level security;
alter table public.promises               enable row level security;
alter table public.journal_entries        enable row level security;
alter table public.promise_events         enable row level security;
alter table public.accountability_partners enable row level security;

-- user_profiles: keyed on id (which IS auth.users.id)
drop policy if exists "profiles_owner_all" on public.user_profiles;
create policy "profiles_owner_all" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Owner-scoped tables: identical "own data only" policy.
drop policy if exists "people_owner_all" on public.people;
create policy "people_owner_all" on public.people
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "groups_owner_all" on public.groups;
create policy "groups_owner_all" on public.groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "group_members_owner_all" on public.group_members;
create policy "group_members_owner_all" on public.group_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories_owner_all" on public.categories;
create policy "categories_owner_all" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "promises_owner_all" on public.promises;
create policy "promises_owner_all" on public.promises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "journal_owner_all" on public.journal_entries;
create policy "journal_owner_all" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "events_owner_all" on public.promise_events;
create policy "events_owner_all" on public.promise_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- accountability_partners: the owner manages the relationship; the partner can
-- see (and respond to) relationships where they are the partner.
drop policy if exists "partners_owner_all" on public.accountability_partners;
create policy "partners_owner_all" on public.accountability_partners
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "partners_partner_select" on public.accountability_partners;
create policy "partners_partner_select" on public.accountability_partners
  for select using (auth.uid() = partner_id);

drop policy if exists "partners_partner_respond" on public.accountability_partners;
create policy "partners_partner_respond" on public.accountability_partners
  for update using (auth.uid() = partner_id) with check (auth.uid() = partner_id);

-- =============================================================================
-- End of migration 0001.
-- =============================================================================

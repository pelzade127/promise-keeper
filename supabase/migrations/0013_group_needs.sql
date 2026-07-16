-- -----------------------------------------------------------------------------
-- 0013_group_needs.sql
-- Extends needs to also attach to a group, mirroring the existing
-- person-or-group pattern already used by promises, journal_entries, and
-- milestones. Exactly one of person_id/group_id must be set — never both,
-- never neither.
-- -----------------------------------------------------------------------------

alter table public.needs
  alter column person_id drop not null;
alter table public.needs
  add column if not exists group_id uuid references public.groups (id) on delete cascade;

alter table public.needs
  drop constraint if exists needs_person_or_group;
alter table public.needs
  add constraint needs_person_or_group
  check (
    (person_id is not null and group_id is null)
    or (person_id is null and group_id is not null)
  );

create index if not exists needs_group_idx on public.needs (group_id);

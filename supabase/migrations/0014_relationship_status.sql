-- -----------------------------------------------------------------------------
-- 0014_relationship_status.sql
-- The brief calls for relationship status (active/dormant/reconnected/past)
-- to be independent from person status (living/memorial). Person status
-- already exists — it's exactly what `status = 'memorialized'` already means
-- on the people table, so no change needed there. This adds the genuinely
-- new axis: relationship status, which can move on its own (a relationship
-- can go dormant, or be reconnected, without anything about the person
-- themselves changing).
-- -----------------------------------------------------------------------------

do $$ begin
  create type relationship_status as enum ('active', 'dormant', 'reconnected', 'past');
exception when duplicate_object then null;
end $$;

alter table public.people
  add column if not exists relationship_status relationship_status not null default 'active';

-- -----------------------------------------------------------------------------
-- 0010_title_visibility.sql
-- Separates "does this partner see a promise exists" (already controlled by
-- visibility mode + partner_promise_shares) from "do they see what it's
-- actually about." A promise's title or category can itself be the sensitive
-- detail, even when journal entries and notes were already private.
-- -----------------------------------------------------------------------------

alter table public.accountability_partners
  add column if not exists show_titles boolean not null default true;

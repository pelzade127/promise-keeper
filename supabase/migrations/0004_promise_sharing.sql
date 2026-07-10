-- -----------------------------------------------------------------------------
-- 0004_promise_sharing.sql
-- Per-promise accountability sharing: pick exactly which promises a given
-- partner can see. Independent per partner; a UI action can copy one partner's
-- selection to all partners for "same across everyone".
-- -----------------------------------------------------------------------------

-- New visibility mode. (Text comparisons are used in policies below so the new
-- value is never referenced as an enum literal in this same transaction.)
alter type accountability_visibility add value if not exists 'selected_promises';

-- Which promises are shared with which specific partnership.
create table if not exists public.partner_promise_shares (
  id                         uuid primary key default gen_random_uuid(),
  owner_id                   uuid not null references auth.users (id) on delete cascade,
  accountability_partner_id  uuid not null references public.accountability_partners (id) on delete cascade,
  promise_id                 uuid not null references public.promises (id) on delete cascade,
  created_at                 timestamptz not null default now(),
  unique (accountability_partner_id, promise_id)
);

alter table public.partner_promise_shares enable row level security;

-- Owner manages their own shares.
drop policy if exists "shares_owner_all" on public.partner_promise_shares;
create policy "shares_owner_all" on public.partner_promise_shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Partner may read shares pointing at them (so the promises policy can see them).
drop policy if exists "shares_partner_select" on public.partner_promise_shares;
create policy "shares_partner_select" on public.partner_promise_shares
  for select using (
    exists (
      select 1 from public.accountability_partners ap
      where ap.id = partner_promise_shares.accountability_partner_id
        and ap.partner_id = auth.uid()
        and ap.status = 'accepted'
    )
  );

create index if not exists shares_partner_idx
  on public.partner_promise_shares (accountability_partner_id);
create index if not exists shares_promise_idx
  on public.partner_promise_shares (promise_id);

-- Rebuild the partner read policy on promises to include the selected-promises mode.
drop policy if exists "promises_partner_select" on public.promises;
create policy "promises_partner_select" on public.promises
  for select to authenticated
  using (
    exists (
      select 1
      from public.accountability_partners ap
      where ap.owner_id = promises.user_id
        and ap.partner_id = auth.uid()
        and ap.status = 'accepted'
        and (
          ap.visibility::text in ('everything', 'weekly_digest')
          or (
            ap.visibility::text = 'overdue_only'
            and promises.status = 'active'
            and promises.due_date is not null
            and promises.due_date < current_date
          )
          or (
            ap.visibility::text = 'selected_categories'
            and promises.category_id = any(coalesce(ap.selected_category_ids, '{}'::uuid[]))
          )
          or (
            ap.visibility::text = 'selected_promises'
            and exists (
              select 1
              from public.partner_promise_shares s
              where s.accountability_partner_id = ap.id
                and s.promise_id = promises.id
            )
          )
        )
    )
  );

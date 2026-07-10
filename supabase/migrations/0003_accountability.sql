-- -----------------------------------------------------------------------------
-- 0003_accountability.sql
-- Lets an invited partner (by email) link to their invite and, once accepted,
-- read a bounded, visibility-scoped view of the owner's promises.
--
-- Privacy model: partners can read PROMISE rows only (subject to visibility).
-- People, groups, journal entries, promise events, and reflections remain
-- fully private — no partner policies are added to those tables.
-- -----------------------------------------------------------------------------

-- 1. Claim: link pending invites addressed to the caller's email to their id.
--    security definer so a signed-in user can attach invites sent to their
--    email even though partner_id is still null (and thus invisible to them).
create or replace function public.claim_partner_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.accountability_partners
    set partner_id = auth.uid()
  where partner_id is null
    and status = 'pending'
    and lower(partner_email) = lower(auth.email());
end;
$$;

grant execute on function public.claim_partner_invites() to authenticated;

-- 2. Accepted partners may read the owner's promises, scoped by visibility.
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
          ap.visibility in ('everything', 'weekly_digest')
          or (
            ap.visibility = 'overdue_only'
            and promises.status = 'active'
            and promises.due_date is not null
            and promises.due_date < current_date
          )
          or (
            ap.visibility = 'selected_categories'
            and promises.category_id = any(coalesce(ap.selected_category_ids, '{}'::uuid[]))
          )
        )
    )
  );

-- 3. Accepted partners may read the owner's display name (for the header).
drop policy if exists "profiles_partner_select" on public.user_profiles;
create policy "profiles_partner_select" on public.user_profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.accountability_partners ap
      where ap.owner_id = user_profiles.id
        and ap.partner_id = auth.uid()
        and ap.status = 'accepted'
    )
  );

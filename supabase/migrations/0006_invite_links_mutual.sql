-- -----------------------------------------------------------------------------
-- 0006_invite_links_mutual.sql
-- Two additions:
--   1. Shareable invite links: an owner generates a one-time link (no email
--      needed); whoever opens it while signed in can claim and accept it.
--   2. Reciprocal invites: after accepting an invitation, the invitee can ask
--      to also become the owner's partner in return — creating a second,
--      independent invitation the original owner must accept.
-- Also fixes invited-party name visibility so pending invites show a real
-- name instead of "Someone".
-- -----------------------------------------------------------------------------

-- 1. Shareable link support.
alter table public.accountability_partners
  add column if not exists invite_token uuid default gen_random_uuid();

create unique index if not exists partners_invite_token_uidx
  on public.accountability_partners (invite_token)
  where invite_token is not null;

-- A row is valid if it has an email OR a token OR an already-known partner
-- (the reciprocal-invite case, where we insert with partner_id set directly).
alter table public.accountability_partners
  drop constraint if exists partner_contact_present;
alter table public.accountability_partners
  add constraint partner_contact_present
  check (
    partner_email is not null
    or invite_token is not null
    or partner_id is not null
  );

-- 2. Look up a pending, unclaimed link's owner name — safe to call before any
--    partnership exists, since it only reveals a display name and only for a
--    token the caller already possesses.
create or replace function public.get_invite_link_owner(p_token uuid)
returns table (owner_id uuid, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select ap.owner_id, coalesce(p.display_name, 'Someone')
  from public.accountability_partners ap
  join public.user_profiles p on p.id = ap.owner_id
  where ap.invite_token = p_token
    and ap.partner_id is null
    and ap.status = 'pending';
$$;

grant execute on function public.get_invite_link_owner(uuid) to authenticated;

-- 3. Claim a link: attach the caller as the partner. Does not accept it —
--    the normal accept/decline flow still applies afterward.
create or replace function public.claim_invite_link(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_owner uuid;
begin
  select id, owner_id into v_id, v_owner
  from public.accountability_partners
  where invite_token = p_token
    and partner_id is null
    and status = 'pending'
  for update;

  if v_id is null then
    raise exception 'invite_not_found_or_used';
  end if;

  if v_owner = auth.uid() then
    raise exception 'cannot_invite_yourself';
  end if;

  update public.accountability_partners
    set partner_id = auth.uid()
    where id = v_id;

  return v_id;
end;
$$;

grant execute on function public.claim_invite_link(uuid) to authenticated;

-- 4. Name visibility fixes: let each side see the other's display name while
--    an invitation is pending, not only after acceptance.
drop policy if exists "profiles_partner_select" on public.user_profiles;
create policy "profiles_partner_select" on public.user_profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.accountability_partners ap
      where ap.owner_id = user_profiles.id
        and ap.partner_id = auth.uid()
        and ap.status in ('pending', 'accepted')
    )
  );

drop policy if exists "profiles_owner_of_partner_select" on public.user_profiles;
create policy "profiles_owner_of_partner_select" on public.user_profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.accountability_partners ap
      where ap.partner_id = user_profiles.id
        and ap.owner_id = auth.uid()
        and ap.status in ('pending', 'accepted')
    )
  );

-- -----------------------------------------------------------------------------
-- 0005_partner_contact.sql
-- Adds phone numbers to accounts, lets partners be invited by email OR phone,
-- prevents duplicate invites per channel, and supports notifications.
-- -----------------------------------------------------------------------------

-- 1. Store contact info on the profile (email backfilled for existing users).
alter table public.user_profiles
  add column if not exists email text,
  add column if not exists phone text;

update public.user_profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and p.email is null;

-- Keep email/phone in sync on signup. (Re-declares the existing trigger fn,
-- preserving the default-category seeding.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email,
    new.phone
  )
  on conflict (id) do update
    set email = excluded.email;

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

-- 2. Invitations can be by email or by phone.
alter table public.accountability_partners
  add column if not exists partner_phone text;
alter table public.accountability_partners
  alter column partner_email drop not null;

alter table public.accountability_partners
  drop constraint if exists partner_contact_present;
alter table public.accountability_partners
  add constraint partner_contact_present
  check (partner_email is not null or partner_phone is not null);

-- 3. One invitation per owner per channel. (Dedupe any existing duplicates first.)
delete from public.accountability_partners a
  using public.accountability_partners b
  where a.owner_id = b.owner_id
    and a.partner_email is not null
    and lower(a.partner_email) = lower(b.partner_email)
    and a.ctid > b.ctid;

create unique index if not exists partners_owner_email_uidx
  on public.accountability_partners (owner_id, lower(partner_email))
  where partner_email is not null;

create unique index if not exists partners_owner_phone_uidx
  on public.accountability_partners (owner_id, partner_phone)
  where partner_phone is not null;

-- 4. Claim invites addressed to the caller's email OR phone.
create or replace function public.claim_partner_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_phone text;
begin
  select phone into my_phone from public.user_profiles where id = auth.uid();

  update public.accountability_partners
    set partner_id = auth.uid()
  where partner_id is null
    and status = 'pending'
    and (
      (partner_email is not null and lower(partner_email) = lower(auth.email()))
      or (my_phone is not null and partner_phone = my_phone)
    );
end;
$$;

grant execute on function public.claim_partner_invites() to authenticated;

-- 5. Does an account already exist for this email/phone? (Used server-side only,
--    to decide whether to send an "accept" note or a "sign up" link. The result
--    is never returned to the inviter, so it does not enable enumeration.)
create or replace function public.partner_account_exists(p_email text, p_phone text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_profiles
    where (p_email is not null and lower(email) = lower(p_email))
       or (p_phone is not null and phone = p_phone)
  );
$$;

grant execute on function public.partner_account_exists(text, text) to authenticated;

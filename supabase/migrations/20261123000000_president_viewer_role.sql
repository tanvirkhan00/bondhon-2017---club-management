-- ==============================================================================
-- BONDHON 2017 - CLUB PRESIDENT READ-ONLY VIEWER ROLE ('viewer')
-- Separates Executive President access (read-only across admin ledgers & reports)
-- from Treasurer/Admin ('admin') and regular members ('member').
-- ==============================================================================

-- 1. Expand profiles.role CHECK constraint to allow ('admin', 'viewer', 'member')
do $$
declare
  v_con_name text;
begin
  for v_con_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', v_con_name);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'viewer', 'member'));

-- 2. Pure helper to detect Club President identity (strictly excludes Vice President)
create or replace function public.is_president_member(
  p_member_code text,
  p_designation text
)
returns boolean
language sql
immutable
as $$
  select
    upper(trim(coalesce(p_member_code, ''))) = 'BND-005'
    or (
      lower(coalesce(p_designation, '')) like '%president%'
      and lower(coalesce(p_designation, '')) not like '%vice%'
    )
    or (
      coalesce(p_designation, '') like '%সভাপতি%'
      and coalesce(p_designation, '') not like '%সহ%'
    );
$$;

-- 3. Security-definer helper for Read-Only Executive Views (Admin OR President Viewer)
create or replace function public.is_admin_or_viewer()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'viewer')
  );
$$;

revoke all on function public.is_admin_or_viewer() from public;
grant execute on function public.is_admin_or_viewer() to authenticated;

-- 4. Update SELECT-only RLS policies to grant Read-Only Viewer access to all Admin ledgers
--    ALL INSERT / UPDATE / DELETE policies remain strictly public.is_admin()!

-- Profiles SELECT
drop policy if exists "Users can view own profile or admins view all" on public.profiles;
create policy "Users can view own profile or admins view all"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin_or_viewer());

-- Members SELECT
drop policy if exists "Members view own record or admins view all" on public.members;
create policy "Members view own record or admins view all"
  on public.members for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
    or public.is_admin_or_viewer()
  );

-- Monthly Dues SELECT
drop policy if exists "Members view own dues or admins view all" on public.monthly_dues;
create policy "Members view own dues or admins view all"
  on public.monthly_dues for select
  to authenticated
  using (
    public.is_admin_or_viewer() or
    member_id in (
      select id from public.members
      where auth_user_id = auth.uid()
         or lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
    )
  );

-- Notifications SELECT (Viewer can see activity feed alongside broadcasts & own items)
drop policy if exists "Users view scoped notifications" on public.notifications;
create policy "Users view scoped notifications"
  on public.notifications for select
  to authenticated
  using (
    public.is_admin_or_viewer()
    or auth.uid() = actor_user_id
    or audience = 'all_members'
    or (
      audience = 'member'
      and target_member_id in (
        select id from public.members
        where auth_user_id = auth.uid()
           or (
             coalesce(auth.jwt()->>'email', '') <> ''
             and lower(trim(coalesce(email, ''))) = lower(trim(auth.jwt()->>'email'))
           )
      )
    )
  );

-- Notification Reads (Viewer can inspect own reads & mark personal read state)
drop policy if exists "Users manage own notification reads" on public.notification_reads;
create policy "Users manage own notification reads"
  on public.notification_reads for all
  to authenticated
  using (auth.uid() = user_id or public.is_admin_or_viewer())
  with check (auth.uid() = user_id);

-- Sonali Bank Ledger SELECT
drop policy if exists "Admins view bank deposits" on public.bank_deposits;
create policy "Admins view bank deposits"
  on public.bank_deposits for select
  to authenticated
  using (public.is_admin_or_viewer());

-- Club Expenses Ledger SELECT
drop policy if exists "Admins view club expenses" on public.club_expenses;
create policy "Admins view club expenses"
  on public.club_expenses for select
  to authenticated
  using (public.is_admin_or_viewer());

-- 5. Update handle_new_user() & link_my_member_by_auth() to auto-assign 'viewer' for Club President
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  v_member_code text;
  v_is_president boolean := false;
begin
  select count(*) = 0 into is_first from public.profiles;
  v_member_code := nullif(trim(coalesce(new.raw_user_meta_data->>'member_code', '')), '');

  update public.members
  set
    auth_user_id = new.id,
    email = coalesce(email, new.email)
  where auth_user_id is null and (
    (v_member_code is not null and upper(member_code) = upper(v_member_code))
    or lower(coalesce(email, '')) = lower(new.email)
    or lower(full_name) = lower(coalesce(new.raw_user_meta_data->>'full_name', ''))
  );

  select exists (
    select 1 from public.members m
    where (m.auth_user_id = new.id or lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(new.email, ''))))
      and public.is_president_member(m.member_code, m.designation)
  ) into v_is_president;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when is_first or lower(new.email) = 'kmtanvir1111@gmail.com' then 'admin'
      when v_is_president then 'viewer'
      else 'member'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.link_my_member_by_auth()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_code text;
  v_is_president boolean := false;
begin
  if auth.uid() is null then
    return;
  end if;

  v_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
  select nullif(trim(coalesce(raw_user_meta_data->>'member_code', '')), '')
    into v_code
    from auth.users where id = auth.uid();

  update public.members
  set auth_user_id = auth.uid(),
      email = coalesce(nullif(trim(email), ''), v_email)
  where auth_user_id is null
    and (
      (v_email <> '' and lower(trim(coalesce(email, ''))) = v_email)
      or (v_code is not null and upper(member_code) = upper(v_code))
    );

  select exists (
    select 1 from public.members m
    where (
      m.auth_user_id = auth.uid()
      or (v_email <> '' and lower(trim(coalesce(m.email, ''))) = v_email)
    )
    and public.is_president_member(m.member_code, m.designation)
  ) into v_is_president;

  if v_is_president then
    update public.profiles
    set role = 'viewer',
        updated_at = timezone('utc'::text, now())
    where id = auth.uid()
      and role = 'member';
  end if;
end;
$$;

grant execute on function public.link_my_member_by_auth() to authenticated;

-- 6. Backfill existing linked Club President account(s) from 'member' -> 'viewer' (never alters 'admin')
update public.profiles p
set role = 'viewer',
    updated_at = timezone('utc'::text, now())
where p.role = 'member'
  and exists (
    select 1
    from public.members m
    join auth.users u on u.id = p.id
    where (
      m.auth_user_id = p.id
      or (
        trim(coalesce(m.email, '')) <> ''
        and lower(trim(m.email)) = lower(trim(coalesce(u.email, '')))
      )
    )
    and public.is_president_member(m.member_code, m.designation)
  );

-- 7. Optional Admin RPC to toggle portal role ('viewer' / 'member') for non-admin accounts
create or replace function public.admin_set_member_portal_role(
  p_target_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Only Admins can update user portal roles.';
  end if;

  if p_role not in ('viewer', 'member') then
    raise exception 'Invalid portal role. Allowed values: viewer, member.';
  end if;

  update public.profiles
  set role = p_role,
      updated_at = timezone('utc'::text, now())
  where id = p_target_user_id
    and role <> 'admin';
end;
$$;

revoke all on function public.admin_set_member_portal_role(uuid, text) from public;
grant execute on function public.admin_set_member_portal_role(uuid, text) to authenticated;

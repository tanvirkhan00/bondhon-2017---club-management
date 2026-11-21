-- ==============================================================================
-- BONDHON 2017 MIGRATION:
-- 1. Member Profile DOB (Private) & Blood Group (Authenticated Public)
-- 2. Strip father_name & shares_count from public_members view
-- 3. Persistent Announcements & Scoped Notifications + Per-User Read Tracking
-- 4. Timezone-aware (Asia/Dhaka) Birthday Highlights & Idempotent Reminder Sync
-- 5. Official Receipt Metadata on monthly_dues
-- ==============================================================================

-- 1. Add date_of_birth & blood_group to members
alter table public.members
  add column if not exists date_of_birth date,
  add column if not exists blood_group text;

alter table public.members
  drop constraint if exists chk_members_blood_group;

alter table public.members
  add constraint chk_members_blood_group
  check (blood_group is null or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

-- 2. Recreate public_members view WITHOUT father_name and shares_count
drop view if exists public.public_members cascade;

create view public.public_members as
select
  id,
  member_code,
  full_name,
  profile_image_url,
  designation,
  status
from public.members
where status = 'active';

comment on view public.public_members is 'Publicly accessible member directory view with sensitive personal and financial details stripped out';

grant select on public.public_members to anon, authenticated;

-- 3. Authenticated Member Directory RPC (Exposes blood_group & birth month/day ONLY — NEVER birth year/DOB/father/fee)
create or replace function public.get_authenticated_member_directory()
returns table (
  id uuid,
  member_code text,
  full_name text,
  profile_image_url text,
  designation text,
  status text,
  blood_group text,
  birth_month int,
  birth_day int
)
language sql
security definer
stable
set search_path = public
as $$
  select
    m.id,
    m.member_code,
    m.full_name,
    m.profile_image_url,
    m.designation,
    m.status,
    m.blood_group,
    case when m.date_of_birth is not null then extract(month from m.date_of_birth)::int else null end as birth_month,
    case when m.date_of_birth is not null then extract(day from m.date_of_birth)::int else null end as birth_day
  from public.members m
  where auth.uid() is not null
    and m.status = 'active'
  order by m.member_code asc;
$$;

revoke all on function public.get_authenticated_member_directory() from public;
grant execute on function public.get_authenticated_member_directory() to authenticated;

-- 4. Helper for Leap-Year Safe Birthday Resolution + Asia/Dhaka Upcoming Highlights
create or replace function public.resolve_birthday_for_year(
  p_month int,
  p_day int,
  p_year int
)
returns date
language plpgsql
immutable
as $$
declare
  v_is_leap boolean;
begin
  if p_month = 2 and p_day = 29 then
    v_is_leap := (p_year % 4 = 0 and p_year % 100 <> 0) or (p_year % 400 = 0);
    if v_is_leap then
      return make_date(p_year, 2, 29);
    else
      return make_date(p_year, 3, 1);
    end if;
  end if;
  return make_date(p_year, p_month, p_day);
end;
$$;

create or replace function public.get_upcoming_birthday_highlights(
  p_days_ahead int default 2
)
returns table (
  id uuid,
  member_code text,
  full_name text,
  profile_image_url text,
  designation text,
  birth_month int,
  birth_day int,
  days_until int
)
language sql
security definer
stable
set search_path = public
as $$
  with dhaka_now as (
    select (now() at time zone 'Asia/Dhaka')::date as today
  ),
  candidates as (
    select
      m.id,
      m.member_code,
      m.full_name,
      m.profile_image_url,
      m.designation,
      extract(month from m.date_of_birth)::int as birth_month,
      extract(day from m.date_of_birth)::int as birth_day,
      dn.today,
      public.resolve_birthday_for_year(
        extract(month from m.date_of_birth)::int,
        extract(day from m.date_of_birth)::int,
        extract(year from dn.today)::int
      ) as bday_this_year,
      public.resolve_birthday_for_year(
        extract(month from m.date_of_birth)::int,
        extract(day from m.date_of_birth)::int,
        extract(year from dn.today)::int + 1
      ) as bday_next_year
    from public.members m
    cross join dhaka_now dn
    where m.status = 'active'
      and m.date_of_birth is not null
  ),
  evaluated as (
    select
      id,
      member_code,
      full_name,
      profile_image_url,
      designation,
      birth_month,
      birth_day,
      (case
        when bday_this_year >= today then bday_this_year
        else bday_next_year
      end - today)::int as days_until
    from candidates
  )
  select
    id,
    member_code,
    full_name,
    profile_image_url,
    designation,
    birth_month,
    birth_day,
    days_until
  from evaluated
  where days_until between 0 and greatest(0, least(coalesce(p_days_ahead, 2), 30))
  order by days_until asc, member_code asc;
$$;

grant execute on function public.get_upcoming_birthday_highlights(int) to anon, authenticated;

-- 5. Member Self-Service Profile Update RPC (phone, private DOB, blood_group)
create or replace function public.update_my_member_profile(
  p_phone text default null,
  p_date_of_birth date default null,
  p_blood_group text default null,
  p_clear_dob boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_blood text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  v_blood := nullif(upper(trim(coalesce(p_blood_group, ''))), '');
  if v_blood is not null and v_blood not in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') then
    raise exception 'Invalid blood group value.';
  end if;

  v_email := lower(trim(coalesce(auth.jwt()->>'email', '')));

  update public.members
  set
    phone = case when p_phone is not null then nullif(trim(p_phone), '') else phone end,
    date_of_birth = case
      when p_clear_dob then null
      when p_date_of_birth is not null then p_date_of_birth
      else date_of_birth
    end,
    blood_group = v_blood,
    updated_at = timezone('utc'::text, now())
  where auth_user_id = auth.uid()
     or (v_email <> '' and lower(trim(coalesce(email, ''))) = v_email);
end;
$$;

revoke all on function public.update_my_member_profile(text, date, text, boolean) from public;
grant execute on function public.update_my_member_profile(text, date, text, boolean) to authenticated;

-- 6. Announcements Table & RLS
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  category text not null default 'general' check (category in ('general', 'finance', 'event', 'urgent')),
  created_by uuid references public.profiles(id) on delete set null,
  author_name text not null default 'Admin',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_announcements_created on public.announcements(created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "Authenticated users can view announcements" on public.announcements;
create policy "Authenticated users can view announcements"
  on public.announcements for select
  to authenticated
  using (true);

drop policy if exists "Admins insert announcements" on public.announcements;
create policy "Admins insert announcements"
  on public.announcements for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update announcements" on public.announcements;
create policy "Admins update announcements"
  on public.announcements for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete announcements" on public.announcements;
create policy "Admins delete announcements"
  on public.announcements for delete
  to authenticated
  using (public.is_admin());

-- 7. Upgrade Notifications Schema + Per-User Read Tracking
alter table public.notifications
  add column if not exists audience text not null default 'admin',
  add column if not exists target_member_id uuid references public.members(id) on delete cascade,
  add column if not exists announcement_id uuid references public.announcements(id) on delete cascade,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists dedup_key text;

alter table public.notifications
  drop constraint if exists notifications_audience_check;

alter table public.notifications
  add constraint notifications_audience_check
  check (audience in ('admin', 'member', 'all_members'));

alter table public.notifications
  drop constraint if exists notifications_event_type_check;

alter table public.notifications
  add constraint notifications_event_type_check
  check (event_type in (
    'member_login',
    'member_logout',
    'password_changed',
    'profile_updated',
    'payment_notice',
    'payment_recorded',
    'announcement',
    'birthday_reminder'
  ));

create index if not exists idx_notifications_audience on public.notifications(audience, target_member_id, created_at desc);
create unique index if not exists idx_notifications_dedup_key on public.notifications(dedup_key) where dedup_key is not null;

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (notification_id, user_id)
);

alter table public.notification_reads enable row level security;

drop policy if exists "Users manage own notification reads" on public.notification_reads;
create policy "Users manage own notification reads"
  on public.notification_reads for all
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- Tighten notifications RLS policies for scoped multi-audience persistence
drop policy if exists "Authenticated users can log activity notifications" on public.notifications;
create policy "Authenticated users can log activity notifications"
  on public.notifications for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      audience = 'admin'
      and event_type in ('member_login', 'member_logout', 'password_changed', 'profile_updated', 'payment_notice')
      and (auth.uid() = actor_user_id or actor_user_id is null)
    )
  );

drop policy if exists "Admins view notifications" on public.notifications;
drop policy if exists "Users view scoped notifications" on public.notifications;
create policy "Users view scoped notifications"
  on public.notifications for select
  to authenticated
  using (
    public.is_admin()
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

-- 8. Idempotent Server-Side Birthday Notification Sync (never exposes birth year)
create or replace function public.sync_upcoming_birthday_notifications(
  p_days_ahead int default 7
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Dhaka')::date;
  v_cur_year int := extract(year from v_today)::int;
  v_inserted int := 0;
  rec record;
  v_bday_this date;
  v_bday_next date;
  v_target_date date;
  v_target_year int;
  v_days_until int;
  v_dedup text;
  v_date_label text;
  v_title text;
  v_msg text;
begin
  if auth.uid() is null then
    return 0;
  end if;

  for rec in
    select
      m.id,
      m.member_code,
      m.full_name,
      extract(month from m.date_of_birth)::int as birth_month,
      extract(day from m.date_of_birth)::int as birth_day
    from public.members m
    where m.status = 'active'
      and m.date_of_birth is not null
  loop
    v_bday_this := public.resolve_birthday_for_year(rec.birth_month, rec.birth_day, v_cur_year);
    v_bday_next := public.resolve_birthday_for_year(rec.birth_month, rec.birth_day, v_cur_year + 1);

    if v_bday_this >= v_today then
      v_target_date := v_bday_this;
      v_target_year := v_cur_year;
    else
      v_target_date := v_bday_next;
      v_target_year := v_cur_year + 1;
    end if;

    v_days_until := (v_target_date - v_today)::int;

    if v_days_until >= 0 and v_days_until <= greatest(0, least(coalesce(p_days_ahead, 7), 14)) then
      v_dedup := 'bday-' || rec.id::text || '-' || v_target_year::text;
      v_date_label := to_char(make_date(2024, rec.birth_month, rec.birth_day), 'Mon DD');

      if v_days_until = 0 then
        v_title := 'Happy Birthday, ' || rec.full_name || '!';
        v_msg := 'Today (' || v_date_label || ') is ' || rec.full_name || ' (' || rec.member_code || ')''s birthday. Warm wishes from Bondhon 2017!';
      else
        v_title := 'Upcoming Birthday: ' || rec.full_name;
        v_msg := rec.full_name || ' (' || rec.member_code || ') has a birthday coming up on ' || v_date_label || '.';
      end if;

      insert into public.notifications (
        member_id,
        member_code,
        member_name,
        event_type,
        audience,
        title,
        message,
        metadata,
        dedup_key,
        is_read
      ) values (
        rec.id,
        rec.member_code,
        rec.full_name,
        'birthday_reminder',
        'all_members',
        v_title,
        v_msg,
        jsonb_build_object(
          'birth_month', rec.birth_month,
          'birth_day', rec.birth_day,
          'date_label', v_date_label
        ),
        v_dedup,
        false
      )
      on conflict (dedup_key) where dedup_key is not null do nothing;

      if found then
        v_inserted := v_inserted + 1;
      end if;
    end if;
  end loop;

  return v_inserted;
end;
$$;

revoke all on function public.sync_upcoming_birthday_notifications(int) from public;
grant execute on function public.sync_upcoming_birthday_notifications(int) to authenticated;

-- 9. Receipt Metadata on monthly_dues
alter table public.monthly_dues
  add column if not exists receipt_number text,
  add column if not exists payment_method text,
  add column if not exists recorded_by_name text;

-- 10. Enhance get_public_club_highlights() with club-wide totalActiveShares aggregate (no per-member shares exposed)
create or replace function public.get_public_club_highlights()
returns json
language sql
security definer
stable
set search_path = public
as $$
  with totals as (
    select
      coalesce(sum(amount_paid), 0) as total_principal_collected,
      coalesce(sum(coalesce(fine_paid, 0)), 0) as total_fine_collected
    from public.monthly_dues
  ),
  member_agg as (
    select
      coalesce(sum(shares_count), 0)::int as total_active_shares
    from public.members
    where status = 'active'
  ),
  bank_tot as (
    select
      coalesce(sum(amount) filter (where coalesce(entry_type, 'deposit') = 'deposit'), 0) as total_bank_deposited,
      coalesce(sum(amount) filter (where entry_type = 'interest'), 0) as total_bank_interest,
      coalesce(sum(amount) filter (where entry_type = 'charge'), 0) as total_bank_charges,
      coalesce(sum(amount) filter (where entry_type = 'withdrawal'), 0) as total_bank_withdrawals
    from public.bank_deposits
  ),
  exp_tot as (
    select
      coalesce(sum(amount), 0) as total_club_expenses,
      coalesce(sum(amount) filter (where payment_source = 'cash'), 0) as total_cash_expenses,
      coalesce(sum(amount) filter (where payment_source = 'bank'), 0) as total_bank_expenses
    from public.club_expenses
  ),
  top_fines as (
    select
      m.id as member_id,
      m.member_code,
      m.full_name,
      m.profile_image_url,
      m.designation,
      coalesce(sum(coalesce(d.fine_paid, 0)), 0) as total_fine_paid,
      count(*) filter (where coalesce(d.fine_paid, 0) > 0) as fined_months
    from public.members m
    join public.monthly_dues d on d.member_id = m.id
    where m.status = 'active'
    group by m.id, m.member_code, m.full_name, m.profile_image_url, m.designation
    having coalesce(sum(coalesce(d.fine_paid, 0)), 0) > 0
    order by total_fine_paid desc, fined_months desc, m.member_code asc
    limit 5
  ),
  computed as (
    select
      t.total_principal_collected,
      t.total_fine_collected,
      (t.total_principal_collected + t.total_fine_collected) as total_collected,
      ma.total_active_shares,
      b.total_bank_deposited,
      b.total_bank_interest,
      b.total_bank_charges,
      b.total_bank_withdrawals,
      e.total_club_expenses,
      e.total_cash_expenses,
      e.total_bank_expenses,
      ((t.total_principal_collected + t.total_fine_collected) + b.total_bank_interest - b.total_bank_charges - e.total_club_expenses) as net_club_available_balance,
      (b.total_bank_deposited + b.total_bank_interest - b.total_bank_charges - b.total_bank_withdrawals - e.total_bank_expenses) as current_bank_balance
    from totals t, member_agg ma, bank_tot b, exp_tot e
  )
  select json_build_object(
    'totalPrincipalCollected', c.total_principal_collected,
    'totalFineCollected', c.total_fine_collected,
    'totalCollected', c.total_collected,
    'totalActiveShares', c.total_active_shares,
    'totalBankDeposited', c.total_bank_deposited,
    'totalBankInterest', c.total_bank_interest,
    'totalBankCharges', c.total_bank_charges,
    'totalBankWithdrawals', c.total_bank_withdrawals,
    'totalClubExpenses', c.total_club_expenses,
    'totalCashExpenses', c.total_cash_expenses,
    'totalBankExpenses', c.total_bank_expenses,
    'netClubAvailableBalance', c.net_club_available_balance,
    'currentBankBalance', c.current_bank_balance,
    'cashInHandBalance', (c.net_club_available_balance - c.current_bank_balance),
    'topFineContributors', coalesce((select json_agg(row_to_json(top_fines)) from top_fines), '[]'::json)
  )
  from computed c;
$$;

grant execute on function public.get_public_club_highlights() to anon, authenticated;

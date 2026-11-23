-- ==============================================================================
-- BONDHON 2017 - FULL-STACK CLUB WEBSITE & MANAGEMENT PLATFORM
-- PostgreSQL Database Schema, Storage, RLS & Views
-- Currency: BDT (৳) | Community Friends Club, Bangladesh
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Recreate privacy view cleanly (views hold no table rows)
drop view if exists public.public_members cascade;

-- ==============================================================================
-- TABLE 1: PROFILES (Linked with Supabase auth.users)
-- ==============================================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null default 'member' check (role in ('admin', 'viewer', 'member')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.profiles is 'User accounts and RBAC permissions for Bondhon 2017 portal';

-- ==============================================================================
-- TABLE 2: MEMBERS (Official Club Member Directory)
-- ==============================================================================
create table if not exists public.members (
  id uuid default gen_random_uuid() primary key,
  member_code text not null unique,
  full_name text not null,
  father_name text,
  phone text,
  email text,
  profile_image_url text,
  designation text default 'Member', -- e.g. 'President', 'General Secretary', 'Executive Member', 'Member'
  shares_count smallint not null default 1 check (shares_count >= 1),
  join_date date not null default '2024-04-01',
  date_of_birth date,
  blood_group text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  monthly_contribution numeric(12, 2) not null default 500.00 check (monthly_contribution >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.members
  add column if not exists father_name text,
  add column if not exists email text,
  add column if not exists shares_count smallint not null default 1,
  add column if not exists date_of_birth date,
  add column if not exists blood_group text;

alter table public.members
  drop constraint if exists chk_members_blood_group;

alter table public.members
  add constraint chk_members_blood_group
  check (blood_group is null or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

comment on table public.members is 'Club members directory with contact and contribution records';

-- Performance Indexes
create index if not exists idx_members_code on public.members(member_code);
create index if not exists idx_members_status on public.members(status);
create index if not exists idx_members_auth on public.members(auth_user_id);
create index if not exists idx_members_name on public.members(full_name);

-- ==============================================================================
-- VIEW: PUBLIC MEMBER DIRECTORY (Strict Privacy Rules)
-- Never exposes father's name, monthly shares/fees, DOB, phone, join dates, or auth IDs.
-- Accessible to anyone browsing the public site.
-- ==============================================================================
create view public.public_members as
select
  id,
  member_code,
  full_name,
  profile_image_url,
  designation,
  blood_group,
  status
from public.members
where status = 'active';

comment on view public.public_members is 'Publicly accessible member directory view with sensitive personal and financial details stripped out';

-- ==============================================================================
-- TABLE 3: MONTHLY_DUES (Monthly Membership Contributions in BDT ৳)
-- ==============================================================================
create table if not exists public.monthly_dues (
  id uuid default gen_random_uuid() primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year >= 2017),
  amount_due numeric(12, 2) not null default 500.00 check (amount_due >= 0),
  amount_paid numeric(12, 2) not null default 0.00 check (amount_paid >= 0),
  fine_due numeric(12, 2) not null default 0.00 check (fine_due >= 0),
  fine_paid numeric(12, 2) not null default 0.00 check (fine_paid >= 0),
  fine_paid_at timestamp with time zone,
  fine_waived boolean not null default false,
  notes text,
  receipt_number text,
  payment_method text,
  recorded_by_name text,
  status text not null default 'unpaid' check (status in ('paid', 'unpaid', 'partial')),
  paid_at timestamp with time zone,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- CRITICAL CONSTRAINT: Prevent duplicate monthly dues for the same member, month, and year!
  constraint unique_member_month_year unique (member_id, month, year)
);

alter table public.monthly_dues
  add column if not exists fine_due numeric(12, 2) not null default 0.00,
  add column if not exists fine_paid numeric(12, 2) not null default 0.00,
  add column if not exists fine_paid_at timestamp with time zone,
  add column if not exists fine_waived boolean not null default false,
  add column if not exists notes text,
  add column if not exists receipt_number text,
  add column if not exists payment_method text,
  add column if not exists recorded_by_name text;

comment on table public.monthly_dues is 'Monthly membership dues records for all club members in BDT ৳';

-- Performance Indexes
create index if not exists idx_dues_member on public.monthly_dues(member_id);
create index if not exists idx_dues_month_year on public.monthly_dues(year, month);
create index if not exists idx_dues_status on public.monthly_dues(status);

-- ==============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Security Definer function to safely verify Admin status
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper to detect Club President identity (strictly excludes Vice President)
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

-- Security Definer function for Read-Only Executive Console access (Admin OR President Viewer)
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

-- Status recalculation trigger
create or replace function public.calc_dues_status()
returns trigger
language plpgsql
as $$
begin
  if new.amount_paid >= new.amount_due and new.amount_due > 0 then
    new.status := 'paid';
    if new.paid_at is null then
      new.paid_at := timezone('utc'::text, now());
    end if;
  elsif new.amount_paid > 0 then
    new.status := 'partial';
  else
    new.status := 'unpaid';
  end if;
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_calc_dues_status on public.monthly_dues;
create trigger trg_calc_dues_status
  before insert or update of amount_due, amount_paid on public.monthly_dues
  for each row execute function public.calc_dues_status();

-- Trigger for new user signup:
-- Assigns 'admin' if first user or kmtanvir1111@gmail.com, 'viewer' for Club President, else 'member'.
-- Auto-links member record by member_code, email, or full_name.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic RPC function: Generate monthly dues for all active members
create or replace function public.generate_dues_for_month(
  p_month smallint,
  p_year smallint
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_count int := 0;
  v_skipped_count int := 0;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Only Admins can generate monthly dues.';
  end if;

  -- Insert dues for active members who do not have records for this month and year
  with active_candidates as (
    select id as member_id, monthly_contribution
    from public.members
    where status = 'active'
      and not exists (
        select 1 from public.monthly_dues d
        where d.member_id = members.id
          and d.month = p_month
          and d.year = p_year
      )
  ),
  ins as (
    insert into public.monthly_dues (member_id, month, year, amount_due, amount_paid, status, recorded_by)
    select member_id, p_month, p_year, monthly_contribution, 0, 'unpaid', auth.uid()
    from active_candidates
    returning id
  )
  select count(*) into v_inserted_count from ins;

  select count(*) into v_skipped_count
  from public.monthly_dues
  where month = p_month and year = p_year;

  return json_build_object(
    'success', true,
    'month', p_month,
    'year', p_year,
    'created_count', v_inserted_count,
    'existing_count', v_skipped_count - v_inserted_count
  );
end;
$$;

-- ==============================================================================
-- TABLE 4A: ANNOUNCEMENTS (Admin Club Notices & Updates)
-- ==============================================================================
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

-- ==============================================================================
-- TABLE 4B: NOTIFICATIONS (Scoped Admin Activity, Member Payments, Announcements & Birthdays)
-- ==============================================================================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  member_id uuid references public.members(id) on delete cascade,
  target_member_id uuid references public.members(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  member_code text,
  member_name text not null,
  audience text not null default 'admin',
  event_type text not null default 'profile_updated',
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  dedup_key text,
  is_read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications
  add column if not exists target_member_id uuid references public.members(id) on delete cascade,
  add column if not exists announcement_id uuid references public.announcements(id) on delete cascade,
  add column if not exists audience text not null default 'admin',
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

create index if not exists idx_notifications_created on public.notifications(created_at desc);
create index if not exists idx_notifications_read on public.notifications(is_read);
create index if not exists idx_notifications_audience on public.notifications(audience, target_member_id, created_at desc);
create unique index if not exists idx_notifications_dedup_key on public.notifications(dedup_key) where dedup_key is not null;

-- Per-user read status for broadcast announcements & birthday reminders
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (notification_id, user_id)
);

-- Safe RPC: Verify Member Name/ID + Email match before Member Login (never exposes email list)
create or replace function public.verify_member_login_match(
  p_member_id uuid,
  p_email text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where id = p_member_id
      and status = 'active'
      and lower(trim(coalesce(email, ''))) = lower(trim(coalesce(p_email, '')))
      and trim(coalesce(email, '')) <> ''
  );
$$;

grant execute on function public.verify_member_login_match(uuid, text) to anon, authenticated;

-- Safe RPC: Auto-link authenticated user to their matching members row
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

-- Safe RPC: Member can update their own phone number
create or replace function public.update_my_member_phone(p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  v_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
  update public.members
  set phone = trim(p_phone),
      updated_at = timezone('utc'::text, now())
  where auth_user_id = auth.uid()
     or (v_email <> '' and lower(trim(coalesce(email, ''))) = v_email);
end;
$$;

grant execute on function public.update_my_member_phone(text) to authenticated;

-- Safe RPC: Member can update their own phone, private date_of_birth, and blood_group
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

-- Authenticated Member Directory RPC (Exposes blood_group & birth month/day ONLY — NEVER birth year/DOB/father/fee)
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

-- Leap-Year Safe Birthday Helper & Timezone-Aware (Asia/Dhaka) Upcoming Birthday Highlights
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.monthly_dues enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

-- ------------------------------------------------------------------------------
-- PROFILES RLS
-- ------------------------------------------------------------------------------
-- Authenticated users can view their own profile, Admins & President Viewers can view all profiles
drop policy if exists "Users can view own profile or admins view all" on public.profiles;
create policy "Users can view own profile or admins view all"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin_or_viewer());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile non-role fields" on public.profiles;
create policy "Users can update own profile non-role fields"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (
    public.is_admin() or (
      auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid())
    )
  );

-- ------------------------------------------------------------------------------
-- MEMBERS RLS
-- ------------------------------------------------------------------------------
-- Public View Access
grant select on public.public_members to anon, authenticated;

-- Authenticated Member can view their own full member record; Admins & President Viewers can view all
drop policy if exists "Members view own record or admins view all" on public.members;
create policy "Members view own record or admins view all"
  on public.members for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
    or public.is_admin_or_viewer()
  );

-- Only Admins can modify member records
drop policy if exists "Admins insert members" on public.members;
create policy "Admins insert members"
  on public.members for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update members" on public.members;
create policy "Admins update members"
  on public.members for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete members" on public.members;
create policy "Admins delete members"
  on public.members for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- MONTHLY_DUES RLS
-- ------------------------------------------------------------------------------
-- Member can read ONLY their own dues; Admins & President Viewers can read all dues
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

-- Only Admins can insert, update, or delete dues
drop policy if exists "Admins insert monthly dues" on public.monthly_dues;
create policy "Admins insert monthly dues"
  on public.monthly_dues for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update monthly dues" on public.monthly_dues;
create policy "Admins update monthly dues"
  on public.monthly_dues for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete monthly dues" on public.monthly_dues;
create policy "Admins delete monthly dues"
  on public.monthly_dues for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- ANNOUNCEMENTS & NOTIFICATIONS RLS
-- ------------------------------------------------------------------------------
drop policy if exists "Authenticated users can view announcements" on public.announcements;
create policy "Authenticated users can view announcements"
  on public.announcements for select
  to authenticated
  using (true);

drop policy if exists "Admins insert announcements" on public.announcements;
drop policy if exists "Admins update announcements" on public.announcements;
drop policy if exists "Admins delete announcements" on public.announcements;
drop policy if exists "Admins manage announcements" on public.announcements;
create policy "Admins manage announcements"
  on public.announcements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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

drop policy if exists "Admins update notifications" on public.notifications;
create policy "Admins update notifications"
  on public.notifications for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins delete notifications" on public.notifications;
create policy "Admins delete notifications"
  on public.notifications for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Users manage own notification reads" on public.notification_reads;
create policy "Users manage own notification reads"
  on public.notification_reads for all
  to authenticated
  using (auth.uid() = user_id or public.is_admin_or_viewer())
  with check (auth.uid() = user_id);

-- ==============================================================================
-- TABLE 5: BANK DEPOSITS (Sonali Bank PLC Deposits)
-- ==============================================================================
create table if not exists public.bank_deposits (
  id uuid default gen_random_uuid() primary key,
  bank_name text not null default 'Sonali Bank PLC',
  branch_name text not null default 'Bhedarganj Branch, Shariatpur',
  account_number text not null default '2102201027292',
  account_name text not null default 'jafor saikot dhali tanvir khan',
  entry_type text not null default 'deposit' check (entry_type in ('deposit', 'interest', 'charge', 'withdrawal')),
  amount numeric(12, 2) not null check (amount > 0),
  deposited_at date not null default current_date,
  reference_no text,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.bank_deposits
  add column if not exists entry_type text not null default 'deposit';

create index if not exists idx_bank_deposits_date on public.bank_deposits(deposited_at desc);
create index if not exists idx_bank_deposits_entry_type on public.bank_deposits(entry_type);

alter table public.bank_deposits enable row level security;

drop policy if exists "Admins view bank deposits" on public.bank_deposits;
create policy "Admins view bank deposits"
  on public.bank_deposits for select
  to authenticated
  using (public.is_admin_or_viewer());

drop policy if exists "Admins insert bank deposits" on public.bank_deposits;
create policy "Admins insert bank deposits"
  on public.bank_deposits for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update bank deposits" on public.bank_deposits;
create policy "Admins update bank deposits"
  on public.bank_deposits for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete bank deposits" on public.bank_deposits;
create policy "Admins delete bank deposits"
  on public.bank_deposits for delete
  to authenticated
  using (public.is_admin());

-- ==============================================================================
-- TABLE 6: CLUB EXPENSES (Operational, Account Opening & Deduction Ledger)
-- ==============================================================================
create table if not exists public.club_expenses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null default 'operational' check (category in ('bank_charge', 'account_opening', 'operational', 'event', 'welfare', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  payment_source text not null default 'cash' check (payment_source in ('cash', 'bank')),
  reference_no text,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_club_expenses_date on public.club_expenses(expense_date desc);
create index if not exists idx_club_expenses_source on public.club_expenses(payment_source);

alter table public.club_expenses enable row level security;

drop policy if exists "Admins view club expenses" on public.club_expenses;
create policy "Admins view club expenses"
  on public.club_expenses for select
  to authenticated
  using (public.is_admin_or_viewer());

drop policy if exists "Admins insert club expenses" on public.club_expenses;
create policy "Admins insert club expenses"
  on public.club_expenses for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update club expenses" on public.club_expenses;
create policy "Admins update club expenses"
  on public.club_expenses for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete club expenses" on public.club_expenses;
create policy "Admins delete club expenses"
  on public.club_expenses for delete
  to authenticated
  using (public.is_admin());

-- Public Club Highlights RPC (Aggregated non-sensitive metrics for Homepage)
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

-- ==============================================================================
-- STORAGE CONFIGURATION FOR MEMBER PROFILE PICTURES
-- ==============================================================================
-- Create storage bucket if not exists
insert into storage.buckets (id, name, public)
values ('member-avatars', 'member-avatars', true)
on conflict (id) do update set public = true;

-- Storage RLS: Public can view member avatars
drop policy if exists "Public can view member avatars" on storage.objects;
create policy "Public can view member avatars"
  on storage.objects for select
  using (bucket_id = 'member-avatars');

-- Storage RLS: Only Admins can upload, update, and delete member avatars
drop policy if exists "Admins can upload member avatars" on storage.objects;
create policy "Admins can upload member avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'member-avatars' and public.is_admin());

drop policy if exists "Admins can update member avatars" on storage.objects;
create policy "Admins can update member avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'member-avatars' and public.is_admin());

drop policy if exists "Admins can delete member avatars" on storage.objects;
create policy "Admins can delete member avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'member-avatars' and public.is_admin());

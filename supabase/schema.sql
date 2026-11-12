-- ==============================================================================
-- BONDHON 2017 - FULL-STACK CLUB WEBSITE & MANAGEMENT PLATFORM
-- PostgreSQL Database Schema, Storage, RLS & Views
-- Currency: BDT (৳) | Community Friends Club, Bangladesh
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Drop existing objects for clean deployment if needed
drop view if exists public.public_members cascade;
drop table if exists public.monthly_dues cascade;
drop table if exists public.members cascade;
drop table if exists public.profiles cascade;

-- ==============================================================================
-- TABLE 1: PROFILES (Linked with Supabase auth.users)
-- ==============================================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.profiles is 'User accounts and RBAC permissions for Bondhon 2017 portal';

-- ==============================================================================
-- TABLE 2: MEMBERS (Official Club Member Directory)
-- ==============================================================================
create table public.members (
  id uuid default gen_random_uuid() primary key,
  member_code text not null unique,
  full_name text not null,
  phone text,
  profile_image_url text,
  designation text default 'Member', -- e.g. 'President', 'General Secretary', 'Executive Member', 'Member'
  join_date date not null default '2017-01-01',
  status text not null default 'active' check (status in ('active', 'inactive')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  monthly_contribution numeric(12, 2) not null default 1000.00 check (monthly_contribution >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.members is 'Club members directory with contact and contribution records';

-- Performance Indexes
create index idx_members_code on public.members(member_code);
create index idx_members_status on public.members(status);
create index idx_members_auth on public.members(auth_user_id);
create index idx_members_name on public.members(full_name);

-- ==============================================================================
-- VIEW: PUBLIC MEMBER DIRECTORY (Strict Privacy Rules)
-- Never exposes phone numbers, join dates, auth IDs, or financial history.
-- Accessible to anyone browsing the public site.
-- ==============================================================================
create or replace view public.public_members as
select
  id,
  member_code,
  full_name,
  profile_image_url,
  designation,
  status
from public.members
where status = 'active';

comment on view public.public_members is 'Publicly accessible member directory view with private contact/financial details stripped out';

-- ==============================================================================
-- TABLE 3: MONTHLY_DUES (Monthly Membership Contributions in BDT ৳)
-- ==============================================================================
create table public.monthly_dues (
  id uuid default gen_random_uuid() primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year >= 2017),
  amount_due numeric(12, 2) not null default 1000.00 check (amount_due >= 0),
  amount_paid numeric(12, 2) not null default 0.00 check (amount_paid >= 0),
  status text not null default 'unpaid' check (status in ('paid', 'unpaid', 'partial')),
  paid_at timestamp with time zone,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- CRITICAL CONSTRAINT: Prevent duplicate monthly dues for the same member, month, and year!
  constraint unique_member_month_year unique (member_id, month, year)
);

comment on table public.monthly_dues is 'Monthly membership dues records for all club members in BDT ৳';

-- Performance Indexes
create index idx_dues_member on public.monthly_dues(member_id);
create index idx_dues_month_year on public.monthly_dues(year, month);
create index idx_dues_status on public.monthly_dues(status);

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

create trigger trg_calc_dues_status
  before insert or update of amount_due, amount_paid on public.monthly_dues
  for each row execute function public.calc_dues_status();

-- Trigger for new user signup:
-- If first registered user in profiles, auto-assign 'admin', else 'member'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.profiles;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when is_first then 'admin' else 'member' end
  )
  on conflict (id) do nothing;

  -- Attempt to auto-link member record if email or phone metadata matches
  update public.members
  set auth_user_id = new.id
  where auth_user_id is null and (
    lower(full_name) = lower(coalesce(new.raw_user_meta_data->>'full_name', ''))
  );

  return new;
end;
$$;

create or replace trigger on_auth_user_created
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.monthly_dues enable row level security;

-- ------------------------------------------------------------------------------
-- PROFILES RLS
-- ------------------------------------------------------------------------------
-- Authenticated users can view their own profile, Admins can view all profiles
create policy "Users can view own profile or admins view all"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

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

-- Authenticated Member can view their own full member record; Admins can view all
create policy "Members view own record or admins view all"
  on public.members for select
  to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

-- Only Admins can modify member records
create policy "Admins insert members"
  on public.members for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins update members"
  on public.members for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete members"
  on public.members for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- MONTHLY_DUES RLS
-- ------------------------------------------------------------------------------
-- Member can read ONLY their own dues; Admins can read all dues
create policy "Members view own dues or admins view all"
  on public.monthly_dues for select
  to authenticated
  using (
    public.is_admin() or
    member_id in (select id from public.members where auth_user_id = auth.uid())
  );

-- Only Admins can insert, update, or delete dues
create policy "Admins insert monthly dues"
  on public.monthly_dues for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins update monthly dues"
  on public.monthly_dues for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete monthly dues"
  on public.monthly_dues for delete
  to authenticated
  using (public.is_admin());

-- ==============================================================================
-- STORAGE CONFIGURATION FOR MEMBER PROFILE PICTURES
-- ==============================================================================
-- Create storage bucket if not exists
insert into storage.buckets (id, name, public)
values ('member-avatars', 'member-avatars', true)
on conflict (id) do update set public = true;

-- Storage RLS: Public can view member avatars
create policy "Public can view member avatars"
  on storage.objects for select
  using (bucket_id = 'member-avatars');

-- Storage RLS: Only Admins can upload, update, and delete member avatars
create policy "Admins can upload member avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'member-avatars' and public.is_admin());

create policy "Admins can update member avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'member-avatars' and public.is_admin());

create policy "Admins can delete member avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'member-avatars' and public.is_admin());

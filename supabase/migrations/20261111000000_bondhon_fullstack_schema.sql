-- Migration: 20261111000000_bondhon_fullstack_schema.sql
-- Bondhon 2017 Full-Stack Club Platform Schema Migration

create extension if not exists "uuid-ossp";

-- Table: profiles
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: members
create table if not exists public.members (
  id uuid default gen_random_uuid() primary key,
  member_code text not null unique,
  full_name text not null,
  phone text,
  profile_image_url text,
  designation text default 'Member',
  join_date date not null default '2017-01-01',
  status text not null default 'active' check (status in ('active', 'inactive')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  monthly_contribution numeric(12, 2) not null default 1000.00 check (monthly_contribution >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- View: public_members (Strict Privacy - No phone, join_date, or financial data)
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

-- Table: monthly_dues
create table if not exists public.monthly_dues (
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
  constraint unique_member_month_year unique (member_id, month, year)
);

-- Indexes
create index if not exists idx_members_code on public.members(member_code);
create index if not exists idx_members_status on public.members(status);
create index if not exists idx_members_auth on public.members(auth_user_id);
create index if not exists idx_dues_member on public.monthly_dues(member_id);
create index if not exists idx_dues_month_year on public.monthly_dues(year, month);
create index if not exists idx_dues_status on public.monthly_dues(status);

-- Helper function: is_admin
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

-- RLS
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.monthly_dues enable row level security;

grant select on public.public_members to anon, authenticated;

-- Policies
create policy "Users can view own profile or admins view all"
  on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile non-role fields"
  on public.profiles for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (public.is_admin() or (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid())));

create policy "Members view own record or admins view all"
  on public.members for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

create policy "Admins insert members" on public.members for insert to authenticated with check (public.is_admin());
create policy "Admins update members" on public.members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete members" on public.members for delete to authenticated using (public.is_admin());

create policy "Members view own dues or admins view all"
  on public.monthly_dues for select to authenticated
  using (public.is_admin() or member_id in (select id from public.members where auth_user_id = auth.uid()));

create policy "Admins insert monthly dues" on public.monthly_dues for insert to authenticated with check (public.is_admin());
create policy "Admins update monthly dues" on public.monthly_dues for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete monthly dues" on public.monthly_dues for delete to authenticated using (public.is_admin());

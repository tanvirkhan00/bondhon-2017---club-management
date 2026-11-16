-- ==============================================================================
-- BONDHON 2017 - Bank Deposits (Sonali Bank PLC) & Public Club Highlights RPC
-- Safe additive migration (non-destructive)
-- ==============================================================================

-- 1. Create bank_deposits table for Sonali Bank PLC deposits
create table if not exists public.bank_deposits (
  id uuid default gen_random_uuid() primary key,
  bank_name text not null default 'Sonali Bank PLC',
  branch_name text not null default 'Bhedarganj Branch, Shariatpur',
  account_number text not null default '2102201027292',
  account_name text not null default 'jafor saikot dhali tanvir khan',
  amount numeric(12, 2) not null check (amount > 0),
  deposited_at date not null default current_date,
  reference_no text,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_bank_deposits_date on public.bank_deposits(deposited_at desc);

alter table public.bank_deposits enable row level security;

drop policy if exists "Admins view bank deposits" on public.bank_deposits;
create policy "Admins view bank deposits"
  on public.bank_deposits for select
  to authenticated
  using (public.is_admin());

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

-- 2. Public Club Highlights RPC (Aggregated non-sensitive metrics for Homepage)
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
  bank_tot as (
    select coalesce(sum(amount), 0) as total_bank_deposited
    from public.bank_deposits
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
  )
  select json_build_object(
    'totalPrincipalCollected', (select total_principal_collected from totals),
    'totalFineCollected', (select total_fine_collected from totals),
    'totalCollected', (select total_principal_collected + total_fine_collected from totals),
    'totalBankDeposited', (select total_bank_deposited from bank_tot),
    'topFineContributors', coalesce((select json_agg(row_to_json(top_fines)) from top_fines), '[]'::json)
  );
$$;

grant execute on function public.get_public_club_highlights() to anon, authenticated;

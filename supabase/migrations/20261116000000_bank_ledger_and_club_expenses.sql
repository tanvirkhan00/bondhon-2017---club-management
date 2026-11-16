-- ==============================================================================
-- BONDHON 2017 - Bank Statement Entries (Deposit/Interest/Charge/Withdrawal)
-- & Club Expenses + Updated Public Club Highlights RPC
-- Safe additive migration (non-destructive)
-- ==============================================================================

-- 1. Extend bank_deposits to support Bank Charges, Interest Credits, and Withdrawals
alter table public.bank_deposits
  add column if not exists entry_type text not null default 'deposit';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bank_deposits_entry_type_check'
  ) then
    alter table public.bank_deposits
      add constraint bank_deposits_entry_type_check
      check (entry_type in ('deposit', 'interest', 'charge', 'withdrawal'));
  end if;
end $$;

create index if not exists idx_bank_deposits_entry_type on public.bank_deposits(entry_type);

-- 2. Create club_expenses table for operational/bank-opening/welfare deductions
create table if not exists public.club_expenses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null default 'operational'
    check (category in ('bank_charge', 'account_opening', 'operational', 'event', 'welfare', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  payment_source text not null default 'cash'
    check (payment_source in ('cash', 'bank')),
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
  using (public.is_admin());

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

-- 3. Update Public Club Highlights RPC to expose exact Net Available Balance & Bank Balance
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
      b.total_bank_deposited,
      b.total_bank_interest,
      b.total_bank_charges,
      b.total_bank_withdrawals,
      e.total_club_expenses,
      e.total_cash_expenses,
      e.total_bank_expenses,
      ((t.total_principal_collected + t.total_fine_collected) + b.total_bank_interest - b.total_bank_charges - e.total_club_expenses) as net_club_available_balance,
      (b.total_bank_deposited + b.total_bank_interest - b.total_bank_charges - b.total_bank_withdrawals - e.total_bank_expenses) as current_bank_balance
    from totals t, bank_tot b, exp_tot e
  )
  select json_build_object(
    'totalPrincipalCollected', c.total_principal_collected,
    'totalFineCollected', c.total_fine_collected,
    'totalCollected', c.total_collected,
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

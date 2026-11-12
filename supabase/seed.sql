-- ==============================================================================
-- BONDHON 2017 - DEVELOPMENT SEED SCRIPT
-- Realistic sample records for local development and testing only.
-- WARNING: NEVER RUN THIS SEED SCRIPT IN A LIVE PRODUCTION DATABASE.
-- ==============================================================================

truncate table public.monthly_dues cascade;
truncate table public.members cascade;

-- Insert 28 Club Members (Bondhon 2017 Batch, Dhaka, Bangladesh)
insert into public.members (id, member_code, full_name, phone, designation, join_date, status, monthly_contribution) values
  ('a1000000-0000-0000-0000-000000000001', 'BND-001', 'Tanvir Ahmed Khan', '+8801711223344', 'President', '2017-01-15', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000002', 'BND-002', 'Mahmudul Hasan (Rana)', '+8801819334455', 'General Secretary', '2017-01-15', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000003', 'BND-003', 'Kazi Nazmul Huda', '+8801912445566', 'Vice President', '2017-01-20', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000004', 'BND-004', 'Shahriar Kabir', '+8801715556677', 'Treasurer', '2017-02-01', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000005', 'BND-005', 'Arifur Rahman Shuvo', '+8801611667788', 'Organizing Secretary', '2017-02-10', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000006', 'BND-006', 'Md. Zahidul Islam', '+8801713778899', 'Executive Member', '2017-03-01', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000007', 'BND-007', 'Sohag Hossain', '+8801814889900', 'Executive Member', '2017-03-15', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000008', 'BND-008', 'Kamrul Hasan Emon', '+8801915990011', 'Member', '2017-04-01', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000009', 'BND-009', 'Faisal Bin Tariq', '+8801716001122', 'Member', '2017-05-12', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000010', 'BND-010', 'Shariful Islam Shimul', '+8801817112233', 'Member', '2017-06-01', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000011', 'BND-011', 'Anisur Rahman', '+8801918223344', 'Member', '2017-07-20', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000012', 'BND-012', 'Mehedi Hasan Babu', '+8801719334455', 'Member', '2017-08-15', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000013', 'BND-013', 'Zubayer Al Mahmud', '+8801610445566', 'Member', '2017-09-01', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000014', 'BND-014', 'Tariqul Islam', '+8801712556677', 'Member', '2017-10-10', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000015', 'BND-015', 'Ashikur Rahman', '+8801813667788', 'Member', '2017-11-25', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000016', 'BND-016', 'Sabbir Ahmed', '+8801914778899', 'Member', '2018-01-10', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000017', 'BND-017', 'Rashedul Karim', '+8801715889900', 'Member', '2018-02-14', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000018', 'BND-018', 'Hasibul Hasan', '+8801816990011', 'Member', '2018-04-05', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000019', 'BND-019', 'Mustafizur Rahman', '+8801917001122', 'Member', '2018-06-20', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000020', 'BND-020', 'Shakil Mahmud', '+8801718112233', 'Member', '2018-08-11', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000021', 'BND-021', 'Imran Nazir', '+8801619223344', 'Member', '2019-01-15', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000022', 'BND-022', 'Naimur Rahman Durjoy', '+8801710334455', 'Member', '2019-03-22', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000023', 'BND-023', 'Golam Rabbani', '+8801811445566', 'Member', '2019-07-04', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000024', 'BND-024', 'Rezaul Karim Rubel', '+8801912556677', 'Member', '2019-10-18', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000025', 'BND-025', 'Saiful Islam Suman', '+8801713667788', 'Member', '2020-02-01', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000026', 'BND-026', 'Jahid Hasan Robin', '+8801814778899', 'Member', '2020-06-15', 'inactive', 1000.00),
  ('a1000000-0000-0000-0000-000000000027', 'BND-027', 'Mahfuzur Rahman', '+8801915889900', 'Member', '2021-01-10', 'active', 1000.00),
  ('a1000000-0000-0000-0000-000000000028', 'BND-028', 'Al-Amin Hossain', '+8801716990011', 'Member', '2022-04-12', 'inactive', 1000.00);

-- Insert Monthly Dues for November 2026 (Month 11, Year 2026)
insert into public.monthly_dues (member_id, month, year, amount_due, amount_paid, status, paid_at)
select
  id as member_id,
  11 as month,
  2026 as year,
  1000.00 as amount_due,
  case 
    when member_code in ('BND-001', 'BND-002', 'BND-003', 'BND-004', 'BND-005', 'BND-006', 'BND-007', 'BND-008', 'BND-009', 'BND-010', 'BND-011', 'BND-012', 'BND-013', 'BND-014', 'BND-015', 'BND-016', 'BND-017', 'BND-018') then 1000.00
    when member_code in ('BND-019', 'BND-020') then 500.00
    else 0.00
  end as amount_paid,
  case 
    when member_code in ('BND-001', 'BND-002', 'BND-003', 'BND-004', 'BND-005', 'BND-006', 'BND-007', 'BND-008', 'BND-009', 'BND-010', 'BND-011', 'BND-012', 'BND-013', 'BND-014', 'BND-015', 'BND-016', 'BND-017', 'BND-018') then 'paid'
    when member_code in ('BND-019', 'BND-020') then 'partial'
    else 'unpaid'
  end as status,
  case 
    when member_code in ('BND-001', 'BND-002', 'BND-003', 'BND-004', 'BND-005', 'BND-006', 'BND-007', 'BND-008') then '2026-11-01 10:30:00+06'::timestamptz
    when member_code in ('BND-009', 'BND-010', 'BND-011', 'BND-012', 'BND-013', 'BND-014', 'BND-015', 'BND-016', 'BND-017', 'BND-018') then '2026-11-02 16:45:00+06'::timestamptz
    when member_code in ('BND-019', 'BND-020') then '2026-11-02 18:20:00+06'::timestamptz
    else null
  end as paid_at
from public.members
where status = 'active';

-- October 2026 (Month 10, Year 2026)
insert into public.monthly_dues (member_id, month, year, amount_due, amount_paid, status, paid_at)
select 
  id as member_id,
  10 as month,
  2026 as year,
  1000.00 as amount_due,
  case when member_code in ('BND-024', 'BND-025') then 0.00 else 1000.00 end as amount_paid,
  case when member_code in ('BND-024', 'BND-025') then 'unpaid' else 'paid' end as status,
  case when member_code not in ('BND-024', 'BND-025') then '2026-10-05 14:00:00+06'::timestamptz else null end as paid_at
from public.members
where status = 'active';

-- September 2026 (Month 9, Year 2026)
insert into public.monthly_dues (member_id, month, year, amount_due, amount_paid, status, paid_at)
select 
  id as member_id,
  9 as month,
  2026 as year,
  1000.00 as amount_due,
  1000.00 as amount_paid,
  'paid' as status,
  '2026-09-06 11:15:00+06'::timestamptz as paid_at
from public.members
where status = 'active';

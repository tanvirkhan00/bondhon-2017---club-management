-- ==============================================================================
-- BONDHON 2017 - DEVELOPMENT SEED SCRIPT
-- Realistic sample records for local development and testing only.
-- WARNING: NEVER RUN THIS SEED SCRIPT IN A LIVE PRODUCTION DATABASE.
-- ==============================================================================

truncate table public.monthly_dues cascade;
truncate table public.members cascade;

-- Insert 20 Club Members (Bondhon 2017, Dhaka, Bangladesh) with official uploaded photos
insert into public.members (id, member_code, full_name, phone, designation, join_date, status, monthly_contribution, profile_image_url) values
  ('a1000000-0000-0000-0000-000000000001', 'BND-001', 'Tanvir Khan', '+8801711223344', 'President & Founder', '2017-01-15', 'active', 1000.00, '/assets/aistudio/Tanvir_Khan_db922a3d.jpg'),
  ('a1000000-0000-0000-0000-000000000002', 'BND-002', 'Mahmudul', '+8801819334455', 'General Secretary', '2017-01-15', 'active', 1000.00, '/assets/aistudio/Mahmudul_2e436dea.jpg'),
  ('a1000000-0000-0000-0000-000000000003', 'BND-003', 'Akram Hossain', '+8801912445566', 'Vice President', '2017-01-20', 'active', 1000.00, '/assets/aistudio/Akram_Hossain_897629d3.jpg'),
  ('a1000000-0000-0000-0000-000000000004', 'BND-004', 'Sumon Talukder', '+8801715556677', 'Treasurer', '2017-02-01', 'active', 1000.00, '/assets/aistudio/Sumon_Talukder_49d8a318.jpg'),
  ('a1000000-0000-0000-0000-000000000005', 'BND-005', 'Tanbeer Ahmed', '+8801611667788', 'Organizing Secretary', '2017-02-10', 'active', 1000.00, '/assets/aistudio/Tanbeer_Ahmed_6333333c.jpg'),
  ('a1000000-0000-0000-0000-000000000006', 'BND-006', 'Abdul Khalek', '+8801713778899', 'Executive Member', '2017-03-01', 'active', 1000.00, '/assets/aistudio/Abdul_Khalek_bbacfb6a.jpg'),
  ('a1000000-0000-0000-0000-000000000007', 'BND-007', 'Babul', '+8801814889900', 'Executive Member', '2017-03-15', 'active', 1000.00, '/assets/aistudio/Babul_0a665683.jpg'),
  ('a1000000-0000-0000-0000-000000000008', 'BND-008', 'Habib', '+8801915990011', 'Executive Member', '2017-04-01', 'active', 1000.00, '/assets/aistudio/Habib_3dc19d2b.jpg'),
  ('a1000000-0000-0000-0000-000000000009', 'BND-009', 'Juel', '+8801716001122', 'Executive Member', '2017-05-12', 'active', 1000.00, '/assets/aistudio/Juel_ff6988e0.jpg'),
  ('a1000000-0000-0000-0000-000000000010', 'BND-010', 'Jafor', '+8801817112233', 'Executive Member', '2017-06-01', 'active', 1000.00, '/assets/aistudio/Jafor_a1548d21.jpg'),
  ('a1000000-0000-0000-0000-000000000011', 'BND-011', 'Meraj', '+8801918223344', 'Member', '2017-07-20', 'active', 1000.00, '/assets/aistudio/Meraj_f09c50f5.jpg'),
  ('a1000000-0000-0000-0000-000000000012', 'BND-012', 'Raton', '+8801719334455', 'Member', '2017-08-15', 'active', 1000.00, '/assets/aistudio/Raton_ee9a408d.jpg'),
  ('a1000000-0000-0000-0000-000000000013', 'BND-013', 'Ali Ajgor', '+8801610445566', 'Member', '2017-09-01', 'active', 1000.00, '/assets/aistudio/Ali_ajgor_932f9436.jpg'),
  ('a1000000-0000-0000-0000-000000000014', 'BND-014', 'Rifat Molla', '+8801712556677', 'Member', '2017-10-10', 'active', 1000.00, '/assets/aistudio/Rifat_Molla_b5bbc82e.jpg'),
  ('a1000000-0000-0000-0000-000000000015', 'BND-015', 'Rifat Fokir', '+8801813667788', 'Member', '2017-11-25', 'active', 1000.00, '/assets/aistudio/Rifat_Fokir_d36048be.jpg'),
  ('a1000000-0000-0000-0000-000000000016', 'BND-016', 'Sakib', '+8801914778899', 'Member', '2018-01-10', 'active', 1000.00, '/assets/aistudio/Sakib_a4cdbc68.jpg'),
  ('a1000000-0000-0000-0000-000000000017', 'BND-017', 'Soykot', '+8801715889900', 'Member', '2018-02-14', 'active', 1000.00, '/assets/aistudio/Soykot_f8261d98.jpg'),
  ('a1000000-0000-0000-0000-000000000018', 'BND-018', 'Tanjim', '+8801816990011', 'Member', '2018-04-05', 'active', 1000.00, '/assets/aistudio/Tanjim_8e20d7a3.jpg'),
  ('a1000000-0000-0000-0000-000000000019', 'BND-019', 'Amit', '+8801917001122', 'Member', '2018-06-20', 'active', 1000.00, '/assets/aistudio/Amit_f054cc9a.jpg'),
  ('a1000000-0000-0000-0000-000000000020', 'BND-020', 'Adnan', '+8801718112233', 'Member', '2018-08-11', 'active', 1000.00, '/assets/aistudio/Adnan_a5c5edef.jpg');

-- Insert Monthly Dues for November 2026 (Month 11, Year 2026)
insert into public.monthly_dues (member_id, month, year, amount_due, amount_paid, status, paid_at)
select
  id as member_id,
  11 as month,
  2026 as year,
  1000.00 as amount_due,
  case 
    when member_code in ('BND-001', 'BND-002', 'BND-003', 'BND-004', 'BND-005', 'BND-006', 'BND-007', 'BND-008', 'BND-009', 'BND-010', 'BND-011', 'BND-012', 'BND-013', 'BND-014', 'BND-015', 'BND-016') then 1000.00
    when member_code in ('BND-017', 'BND-018') then 500.00
    else 0.00
  end as amount_paid,
  case 
    when member_code in ('BND-001', 'BND-002', 'BND-003', 'BND-004', 'BND-005', 'BND-006', 'BND-007', 'BND-008', 'BND-009', 'BND-010', 'BND-011', 'BND-012', 'BND-013', 'BND-014', 'BND-015', 'BND-016') then 'paid'
    when member_code in ('BND-017', 'BND-018') then 'partial'
    else 'unpaid'
  end as status,
  case 
    when member_code in ('BND-001', 'BND-002', 'BND-003', 'BND-004', 'BND-005', 'BND-006', 'BND-007', 'BND-008') then '2026-11-01 10:30:00+06'::timestamptz
    when member_code in ('BND-009', 'BND-010', 'BND-011', 'BND-012', 'BND-013', 'BND-014', 'BND-015', 'BND-016') then '2026-11-02 16:45:00+06'::timestamptz
    when member_code in ('BND-017', 'BND-018') then '2026-11-03 14:20:00+06'::timestamptz
    else null
  end as paid_at
from public.members;

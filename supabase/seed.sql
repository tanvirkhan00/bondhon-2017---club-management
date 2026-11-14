-- ==============================================================================
-- BONDHON 2017 (বন্ধুত্ব সমবায় সমিতি) - CLEAN SEED SCRIPT
-- চরচান্দা খাসমহল বাজার · স্থাপিত: ০১/০৪/২০২৪ ইং · এস.এস.সি ব্যাচ ২০১৭
-- Seeds 21 Official Members & Admin Profile (Payment History kept clean for Admin entry)
-- ==============================================================================

truncate table public.monthly_dues cascade;
truncate table public.members cascade;

-- Insert 21 Club Members with official names, fathers' names, shares, and photos
insert into public.members (id, member_code, full_name, father_name, phone, email, designation, shares_count, join_date, status, monthly_contribution, profile_image_url) values
  ('a1000000-0000-0000-0000-000000000001', 'BND-001', 'Ramjan Ali(Rifat)', 'Mr. Rafikul Islam', '+8801813667788', null, 'Member (সদস্য)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Rifat_Fokir_d36048be.jpg'),
  ('a1000000-0000-0000-0000-000000000002', 'BND-002', 'Ali Ajgor', 'Mr. Hasan Fokir', '+8801610445566', null, 'Member (সদস্য)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Ali_ajgor_932f9436.jpg'),
  ('a1000000-0000-0000-0000-000000000003', 'BND-003', 'Sakib Hossain', 'Mr. Nannu Khan', '+8801914778899', null, 'Member (সদস্য)', 2, '2024-04-01', 'active', 1000.00, '/assets/aistudio/Sakib_a4cdbc68.jpg'),
  ('a1000000-0000-0000-0000-000000000004', 'BND-004', 'Amit Ghosh', 'Sanjid Ghos', '+8801917001122', null, 'Assistant Treasurer (সহ-কোষাধ্যক্ষ)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Amit_f054cc9a.jpg'),
  ('a1000000-0000-0000-0000-000000000005', 'BND-005', 'Shaikot Dhali', 'Mr. Yusuf Dhali', '+8801715889900', null, 'President (সভাপতি)', 3, '2024-04-01', 'active', 1500.00, '/assets/aistudio/Soykot_f8261d98.jpg'),
  ('a1000000-0000-0000-0000-000000000006', 'BND-006', 'Musfiqur Salehin', 'Mr. Mohammad ali', '+8801816990011', null, 'Vice President (সহ-সভাপতি)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Tanjim_8e20d7a3.jpg'),
  ('a1000000-0000-0000-0000-000000000007', 'BND-007', 'Tanvir Khan', 'Mr. Sanaullah Khan', '+8801711223344', 'kmtanvir1111@gmail.com', 'Treasurer & Admin (কোষাধ্যক্ষ)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Tanvir_Khan_db922a3d.jpg'),
  ('a1000000-0000-0000-0000-000000000008', 'BND-008', 'Rifat Hossain', 'Mr. Abul Kalam', '+8801712556677', null, 'Member (সদস্য)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Rifat_Molla_b5bbc82e.jpg'),
  ('a1000000-0000-0000-0000-000000000009', 'BND-009', 'Tanvir Ahmed', 'Mr. Yasin', '+8801611667788', null, 'Organizing Secretary (সাংগঠনিক সম্পাদক)', 2, '2024-04-01', 'active', 1000.00, '/assets/aistudio/Tanbeer_Ahmed_6333333c.jpg'),
  ('a1000000-0000-0000-0000-000000000010', 'BND-010', 'Akram Hossain', 'Mr. Mokbul Sarder', '+8801912445566', null, 'Member (সদস্য)', 2, '2024-04-01', 'active', 1000.00, '/assets/aistudio/Akram_Hossain_897629d3.jpg'),
  ('a1000000-0000-0000-0000-000000000011', 'BND-011', 'Raton Mia', 'Mr. Nazrul Islam', '+8801719334455', null, 'Member (সদস্য)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Raton_ee9a408d.jpg'),
  ('a1000000-0000-0000-0000-000000000012', 'BND-012', 'Abdul Khalek', 'Mr. Osman goni Dewan', '+8801713778899', null, 'Member (সদস্য)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Abdul_Khalek_bbacfb6a.jpg'),
  ('a1000000-0000-0000-0000-000000000013', 'BND-013', 'Shapon Mia', 'Mr. Aktar Hossain', '+8801714223344', null, 'Member (সদস্য)', 2, '2024-04-01', 'active', 1000.00, '/assets/aistudio/Swapon_Dhali_2daeb87c.jpeg'),
  ('a1000000-0000-0000-0000-000000000014', 'BND-014', 'Kazi Juwel', 'Mr. Nazmul Kazi', '+8801716001122', null, 'Member (সদস্য)', 3, '2024-04-01', 'active', 1500.00, '/assets/aistudio/Juel_ff6988e0.jpg'),
  ('a1000000-0000-0000-0000-000000000015', 'BND-015', 'Mahmudul Hasan(Masud)', 'Mr. Nijamul Haque Khan', '+8801819334455', null, 'Member (সদস্য)', 3, '2024-04-01', 'active', 1500.00, '/assets/aistudio/Mahmudul_2e436dea.jpg'),
  ('a1000000-0000-0000-0000-000000000016', 'BND-016', 'Habib Motait', 'Mr. Soltan Motait', '+8801915990011', null, 'Member (সদস্য)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Habib_3dc19d2b.jpg'),
  ('a1000000-0000-0000-0000-000000000017', 'BND-017', 'Sumon Talukder', 'Mr. Akkas Talukder', '+8801715556677', null, 'Member (সদস্য)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Sumon_Talukder_49d8a318.jpg'),
  ('a1000000-0000-0000-0000-000000000018', 'BND-018', 'Babul Dhali', 'Mr. Shahjalal Dhali', '+8801814889900', null, 'Member (সদস্য)', 2, '2024-04-01', 'active', 1000.00, '/assets/aistudio/Babul_0a665683.jpg'),
  ('a1000000-0000-0000-0000-000000000019', 'BND-019', 'Meraj', 'Mr. Sirajul Islam', '+8801918223344', null, 'Member (সদস্য)', 2, '2024-04-01', 'active', 1000.00, '/assets/aistudio/Meraj_f09c50f5.jpg'),
  ('a1000000-0000-0000-0000-000000000020', 'BND-020', 'Adnan Faruk Ayon', 'Mr. Faruk Ahmed', '+8801718112233', null, 'Member (সদস্য)', 1, '2024-04-01', 'active', 500.00, '/assets/aistudio/Adnan_a5c5edef.jpg'),
  ('a1000000-0000-0000-0000-000000000021', 'BND-021', 'Jafor Molla', 'Abdur Rashid Molla', '+8801817112233', null, 'General Secretary (সাধারণ সম্পাদক)', 2, '2024-04-01', 'active', 1000.00, '/assets/aistudio/Jafor_a1548d21.jpg');

-- Initialize Admin profile for Tanvir Khan (once registered in auth.users)
insert into public.profiles (id, full_name, role)
select id, 'Tanvir Khan', 'admin'
from auth.users
where email = 'kmtanvir1111@gmail.com'
on conflict (id)
do update set
    full_name = excluded.full_name,
    role = 'admin';

-- Auto-link Tanvir Khan member record
update public.members
set auth_user_id = (select id from auth.users where email = 'kmtanvir1111@gmail.com')
where member_code = 'BND-007';

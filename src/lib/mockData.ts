import { Member, MonthlyDue, Profile, PublicMember } from '../types';

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'user-admin-01',
    full_name: 'Tanvir Ahmed Khan (Admin)',
    role: 'admin',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-member-02',
    full_name: 'Mahmudul Hasan (Rana)',
    role: 'member',
    created_at: '2026-01-02T00:00:00Z',
  },
];

export const INITIAL_MEMBERS: Member[] = [
  { id: 'm-001', member_code: 'BND-001', full_name: 'Tanvir Ahmed Khan', designation: 'President', phone: '+880 1711-223344', join_date: '2017-01-15', status: 'active', auth_user_id: 'user-admin-01', monthly_contribution: 1000 },
  { id: 'm-002', member_code: 'BND-002', full_name: 'Mahmudul Hasan (Rana)', designation: 'General Secretary', phone: '+880 1819-334455', join_date: '2017-01-15', status: 'active', auth_user_id: 'user-member-02', monthly_contribution: 1000 },
  { id: 'm-003', member_code: 'BND-003', full_name: 'Kazi Nazmul Huda', designation: 'Vice President', phone: '+880 1912-445566', join_date: '2017-01-20', status: 'active', monthly_contribution: 1000 },
  { id: 'm-004', member_code: 'BND-004', full_name: 'Shahriar Kabir', designation: 'Treasurer', phone: '+880 1715-556677', join_date: '2017-02-01', status: 'active', monthly_contribution: 1000 },
  { id: 'm-005', member_code: 'BND-005', full_name: 'Arifur Rahman Shuvo', designation: 'Organizing Secretary', phone: '+880 1611-667788', join_date: '2017-02-10', status: 'active', monthly_contribution: 1000 },
  { id: 'm-006', member_code: 'BND-006', full_name: 'Md. Zahidul Islam', designation: 'Executive Member', phone: '+880 1713-778899', join_date: '2017-03-01', status: 'active', monthly_contribution: 1000 },
  { id: 'm-007', member_code: 'BND-007', full_name: 'Sohag Hossain', designation: 'Executive Member', phone: '+880 1814-889900', join_date: '2017-03-15', status: 'active', monthly_contribution: 1000 },
  { id: 'm-008', member_code: 'BND-008', full_name: 'Kamrul Hasan Emon', designation: 'Member', phone: '+880 1915-990011', join_date: '2017-04-01', status: 'active', monthly_contribution: 1000 },
  { id: 'm-009', member_code: 'BND-009', full_name: 'Faisal Bin Tariq', designation: 'Member', phone: '+880 1716-001122', join_date: '2017-05-12', status: 'active', monthly_contribution: 1000 },
  { id: 'm-010', member_code: 'BND-010', full_name: 'Shariful Islam Shimul', designation: 'Member', phone: '+880 1817-112233', join_date: '2017-06-01', status: 'active', monthly_contribution: 1000 },
  { id: 'm-011', member_code: 'BND-011', full_name: 'Anisur Rahman', designation: 'Member', phone: '+880 1918-223344', join_date: '2017-07-20', status: 'active', monthly_contribution: 1000 },
  { id: 'm-012', member_code: 'BND-012', full_name: 'Mehedi Hasan Babu', designation: 'Member', phone: '+880 1719-334455', join_date: '2017-08-15', status: 'active', monthly_contribution: 1000 },
  { id: 'm-013', member_code: 'BND-013', full_name: 'Zubayer Al Mahmud', designation: 'Member', phone: '+880 1610-445566', join_date: '2017-09-01', status: 'active', monthly_contribution: 1000 },
  { id: 'm-014', member_code: 'BND-014', full_name: 'Tariqul Islam', designation: 'Member', phone: '+880 1712-556677', join_date: '2017-10-10', status: 'active', monthly_contribution: 1000 },
  { id: 'm-015', member_code: 'BND-015', full_name: 'Ashikur Rahman', designation: 'Member', phone: '+880 1813-667788', join_date: '2017-11-25', status: 'active', monthly_contribution: 1000 },
  { id: 'm-016', member_code: 'BND-016', full_name: 'Sabbir Ahmed', designation: 'Member', phone: '+880 1914-778899', join_date: '2018-01-10', status: 'active', monthly_contribution: 1000 },
  { id: 'm-017', member_code: 'BND-017', full_name: 'Rashedul Karim', designation: 'Member', phone: '+880 1715-889900', join_date: '2018-02-14', status: 'active', monthly_contribution: 1000 },
  { id: 'm-018', member_code: 'BND-018', full_name: 'Hasibul Hasan', designation: 'Member', phone: '+880 1816-990011', join_date: '2018-04-05', status: 'active', monthly_contribution: 1000 },
  { id: 'm-019', member_code: 'BND-019', full_name: 'Mustafizur Rahman', designation: 'Member', phone: '+880 1917-001122', join_date: '2018-06-20', status: 'active', monthly_contribution: 1000 },
  { id: 'm-020', member_code: 'BND-020', full_name: 'Shakil Mahmud', designation: 'Member', phone: '+880 1718-112233', join_date: '2018-08-11', status: 'active', monthly_contribution: 1000 },
  { id: 'm-021', member_code: 'BND-021', full_name: 'Imran Nazir', designation: 'Member', phone: '+880 1619-223344', join_date: '2019-01-15', status: 'active', monthly_contribution: 1000 },
  { id: 'm-022', member_code: 'BND-022', full_name: 'Naimur Rahman Durjoy', designation: 'Member', phone: '+880 1710-334455', join_date: '2019-03-22', status: 'active', monthly_contribution: 1000 },
  { id: 'm-023', member_code: 'BND-023', full_name: 'Golam Rabbani', designation: 'Member', phone: '+880 1811-445566', join_date: '2019-07-04', status: 'active', monthly_contribution: 1000 },
  { id: 'm-024', member_code: 'BND-024', full_name: 'Rezaul Karim Rubel', designation: 'Member', phone: '+880 1912-556677', join_date: '2019-10-18', status: 'active', monthly_contribution: 1000 },
  { id: 'm-025', member_code: 'BND-025', full_name: 'Saiful Islam Suman', designation: 'Member', phone: '+880 1713-667788', join_date: '2020-02-01', status: 'active', monthly_contribution: 1000 },
  { id: 'm-026', member_code: 'BND-026', full_name: 'Jahid Hasan Robin', designation: 'Member', phone: '+880 1814-778899', join_date: '2020-06-15', status: 'inactive', monthly_contribution: 1000 },
  { id: 'm-027', member_code: 'BND-027', full_name: 'Mahfuzur Rahman', designation: 'Member', phone: '+880 1915-889900', join_date: '2021-01-10', status: 'active', monthly_contribution: 1000 },
  { id: 'm-028', member_code: 'BND-028', full_name: 'Al-Amin Hossain', designation: 'Member', phone: '+880 1716-990011', join_date: '2022-04-12', status: 'inactive', monthly_contribution: 1000 },
];

export const INITIAL_PUBLIC_MEMBERS: PublicMember[] = INITIAL_MEMBERS
  .filter(m => m.status === 'active')
  .map(m => ({
    id: m.id,
    member_code: m.member_code,
    full_name: m.full_name,
    designation: m.designation,
    profile_image_url: m.profile_image_url,
    status: 'active',
  }));

export const INITIAL_MONTHLY_DUES: MonthlyDue[] = [
  // November 2026 (Month 11, Year 2026)
  ...INITIAL_MEMBERS.filter(m => m.status === 'active').map((m, index) => {
    let amountPaid = 0;
    let status: 'paid' | 'unpaid' | 'partial' = 'unpaid';
    let paidAt: string | null = null;

    if (index < 18) {
      amountPaid = 1000;
      status = 'paid';
      paidAt = `2026-11-0${(index % 3) + 1}T10:30:00Z`;
    } else if (index < 21) {
      amountPaid = 500;
      status = 'partial';
      paidAt = `2026-11-02T14:20:00Z`;
    }

    return {
      id: `due-nov-2026-${m.id}`,
      member_id: m.id,
      month: 11,
      year: 2026,
      amount_due: 1000,
      amount_paid: amountPaid,
      status,
      paid_at: paidAt,
      recorded_by: 'user-admin-01',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    };
  }),

  // October 2026 (Month 10, Year 2026)
  ...INITIAL_MEMBERS.filter(m => m.status === 'active').map((m, index) => {
    const isUnpaid = index >= 23;
    return {
      id: `due-oct-2026-${m.id}`,
      member_id: m.id,
      month: 10,
      year: 2026,
      amount_due: 1000,
      amount_paid: isUnpaid ? 0 : 1000,
      status: (isUnpaid ? 'unpaid' : 'paid') as 'paid' | 'unpaid',
      paid_at: isUnpaid ? null : '2026-10-05T12:00:00Z',
      recorded_by: 'user-admin-01',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };
  }),

  // September 2026 (Month 9, Year 2026)
  ...INITIAL_MEMBERS.filter(m => m.status === 'active').map((m) => {
    return {
      id: `due-sep-2026-${m.id}`,
      member_id: m.id,
      month: 9,
      year: 2026,
      amount_due: 1000,
      amount_paid: 1000,
      status: 'paid' as const,
      paid_at: '2026-09-04T15:30:00Z',
      recorded_by: 'user-admin-01',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    };
  }),

  // August 2026 (Month 8, Year 2026)
  ...INITIAL_MEMBERS.filter(m => m.status === 'active').map((m, index) => {
    const isUnpaid = index === 20;
    return {
      id: `due-aug-2026-${m.id}`,
      member_id: m.id,
      month: 8,
      year: 2026,
      amount_due: 1000,
      amount_paid: isUnpaid ? 0 : 1000,
      status: (isUnpaid ? 'unpaid' : 'paid') as 'paid' | 'unpaid',
      paid_at: isUnpaid ? null : '2026-08-04T11:00:00Z',
      recorded_by: 'user-admin-01',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    };
  }),

  // July 2026 (Month 7, Year 2026)
  ...INITIAL_MEMBERS.filter(m => m.status === 'active').map((m) => {
    return {
      id: `due-jul-2026-${m.id}`,
      member_id: m.id,
      month: 7,
      year: 2026,
      amount_due: 1000,
      amount_paid: 1000,
      status: 'paid' as const,
      paid_at: '2026-07-06T10:00:00Z',
      recorded_by: 'user-admin-01',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };
  }),
];

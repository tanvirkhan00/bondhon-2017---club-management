# Bondhon 2017 – Full-Stack Club Website & Management Platform

A production-ready, full-stack club website and management platform built for **"Bondhon 2017"** (বন্ধন ২০১৭), a community friends club in Bangladesh founded in 2017.

Built for deployment on **Netlify** with **Supabase** providing the backend infrastructure (PostgreSQL database, Supabase Authentication, Row Level Security, and Supabase Storage).

---

## 🏛 Application Architecture & Experiences

The application contains three distinct, role-secured portals:

### 1. Public Club Website
Accessible without authentication:
- **`/` (Home)**: Hero banner with authentic club crest, welcome introduction in English and Bangla, mission highlights, active member preview cards, and trust metrics.
- **`/about` (About Club)**: History since 2017, foundational pact, mission and vision, community welfare drives (flood relief, winter clothing, educational assistance).
- **`/members` (Public Member Directory)**:
  - **Strict Privacy Rules**: Only exposes Member Code (`BND-001`), Full Name, Public Designation, and Profile Picture.
  - **Never Exposes**: Phone numbers, join dates, authentication IDs, payment records, or private financials.
  - Features: Search by name/code, alphabetical/code sorting, lazy-loaded avatars with fallbacks.
- **`/login` (Member Login)**: Secure login, password reset modal, and 1-click test login buttons for testing Admin and Member portals.

### 2. Private Member Portal (`/member/*`)
Authenticated club members access their personal records:
- **`/member/profile`**:
  - Individual private profile: photo, full name, member ID, phone, join date, status, monthly contribution amount (BDT ৳).
  - Personal Financial Summary: Total amount paid, total paid months, total outstanding dues, unpaid months count, and current payment status.
  - Recent payment records.
- **`/member/payment-history`**:
  - Personal contribution ledger: Month, Year, Amount due, Amount paid, Status, Payment date.
  - Multi-filtering: Fiscal year, month, payment status (paid/partial/unpaid), search.
  - **Security**: Members can *only* read their own records and cannot modify any financial rows or view other members' private information.

### 3. Admin Dashboard (`/admin/*`)
Authenticated Administrators have full club management capabilities:
- **`/admin/dashboard`**:
  - Real-time KPI statistics: Total members, active/inactive counts, monthly target, total collected, outstanding dues, paid/unpaid ratios.
  - Interactive **Recharts** charts: Monthly collections vs target trends across the fiscal year, and status distribution donut charts.
  - Global month and fiscal year filters.
  - Unpaid members alert list & recent transaction ledger.
- **`/admin/members`**:
  - Member Directory Management: Add new member, edit details, activate/deactivate (soft deletion preserving financial history).
  - **Supabase Storage Integration**: Upload member profile avatars to the `member-avatars` storage bucket with file size and type validation.
  - Link member records with Supabase Auth accounts.
- **`/admin/payments`**:
  - Monthly Dues Generation: Select month and year to generate dues for all active members in one atomic operation.
  - Database-enforced unique constraint `UNIQUE(member_id, month, year)` prevents duplicate charges.
  - 1-Click **Mark as Paid**, custom amount/date editor, and unpaid member reconciliation.
- **`/admin/payment-history`**:
  - Complete financial audit ledger with pagination, multi-filtering, search, and UTF-8 CSV export.
- **`/admin/reports`**:
  - Monthly collection reports, yearly financial summaries, and member-wise contribution rankings.
  - 1-Click **UTF-8 CSV Exports** with Excel BOM for flawless Bengali Unicode support.
- **`/admin/settings`**:
  - Club profile configuration, default monthly dues (BDT ৳), Supabase connection testing, 1-click SQL migration copy, and full database JSON backups.

---

## 🛠 Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, React Router 7, Lucide Icons, Recharts.
- **Backend & Database**: Supabase PostgreSQL with Row Level Security (RLS).
- **Authentication**: Supabase Auth (email & password with session persistence).
- **File Storage**: Supabase Storage (`member-avatars` bucket).
- **Serverless Operations**: Netlify Functions (`netlify/functions/admin-invite.ts`).
- **Hosting**: Netlify (`netlify.toml` with SPA redirects and security headers).

---

## 🚀 Setup & Deployment Guide

### 1. Database Setup in Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Paste the contents of `supabase/schema.sql` (or `supabase/migrations/20261111000000_bondhon_fullstack_schema.sql`) and click **Run**.
   - This sets up the `profiles`, `members`, `monthly_dues` tables, the `public_members` privacy view, triggers, and RLS policies.
4. (Optional for Development) Run `supabase/seed.sql` to populate sample active members and dues records for local testing.

### 2. Environment Variables
Create a `.env` file from `.env.example`:
```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Running Locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🔒 Security & Admin Bootstrapping

1. **Automatic First-Admin Initialization**:
   - The trigger `public.handle_new_user()` checks if any profile exists in `public.profiles`. The **very first user to register** automatically receives the `admin` role.
2. **Member Account Invitations**:
   - All subsequent users receive the `member` role by default.
   - To promote an authorized user to admin, run in Supabase SQL Editor:
     ```sql
     update public.profiles
     set role = 'admin'
     where id = (select id from auth.users where email = 'admin@bondhon.com');
     ```
3. **Database-Level Invariants**:
   - PostgreSQL RLS prevents non-admin users from updating roles or modifying payments.
   - Frontend role checks are augmented by database constraints.

---

## 🧪 Testing Scenarios (QA Verification)

### Scenario A: Public Visitor (Unauthenticated)
1. Open `/`. Verify the Hero section, about teaser, and active member preview cards load cleanly.
2. Open `/members`. Verify all active members display in cards with full name, member code, designation, and avatar.
3. Confirm that no phone numbers, join dates, or financial records are visible.
4. Try navigating directly to `/member/profile` or `/admin/dashboard`. Confirm the app redirects to `/login`.

### Scenario B: Regular Member
1. Navigate to `/login` and click **Test Member Login** (or log in with a member account).
2. Confirm redirection to `/member/profile`.
3. Verify your personal profile displays your phone number, join date, monthly contribution, and personal financial summary.
4. Open `/member/payment-history`. Verify your personal payment table loads with month, year, amount due, and amount paid.
5. Confirm there are no edit or delete controls.
6. Attempt to visit `/admin/dashboard`. Confirm automatic redirection back to `/member/profile`.

### Scenario C: Administrator
1. Navigate to `/login` and click **Test Admin Login** (or log in with an admin account).
2. Confirm redirection to `/admin/dashboard`.
3. Verify global KPI metrics, Recharts monthly trend bar chart, and status donut chart update according to the selected month and fiscal year.
4. Open `/admin/members`. Test adding a new member with avatar upload or editing an existing member.
5. Open `/admin/payments`. Test generating monthly dues for a new month; verify duplicate prevention logic.
6. Open `/admin/payment-history`. Test advanced search, status filters, and click **Export Ledger CSV**.
7. Open the downloaded CSV to confirm Bengali text and currency formatting (৳) open cleanly.

---

## 🌐 Netlify Deployment

1. Push your repository to GitHub / GitLab.
2. Connect the repository in [Netlify](https://app.netlify.com).
3. Build Settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Set Environment Variables in **Site settings > Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, for Netlify serverless invite function)
5. Deploy site. The included `netlify.toml` automatically handles SPA fallback routing for `/member/*` and `/admin/*`.

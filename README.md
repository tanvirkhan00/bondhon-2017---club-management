# Bondhon 2017 – Full-Stack Club Website & Management Platform

A production-ready, full-stack club website and management platform built for **"Bondhon 2017"** (বন্ধন ২০১৭), a community friends club in Bangladesh founded in 2017.

Built for deployment on **Netlify** with **Supabase** providing the backend infrastructure (PostgreSQL database, Supabase Authentication, Row Level Security & RPCs, and Supabase Storage).

---

## 🏛 Application Architecture & Experiences

The application features a cohesive **Sovereign Sapphire (`#1D4ED8`) & Burnished Brass (`#D6AC62`)** visual system with permanent dark theme inside the Admin Console, timezone-aware live analog/digital clock + weather widget (`Asia/Dhaka` / local timezone), and two distinct preloaders (first-visit public welcome preloader and personalized authenticated member login/refresh preloader).

### 1. Public Club Website
Accessible without authentication:
- **`/` (Home)**: Hero banner with official club crest, welcome introduction in English and Bangla, **2-day Asia/Dhaka Birthday Celebration Card** (automatically visible from 2 days before through the birthday date, auto-hiding afterward, showing Month + Day only), executive committee showcase, and aggregate public treasury highlights.
- **`/about` (About Club)**: History since 2017, foundational pact, mission and vision, and community welfare drives.
- **`/members` (Public Member Directory)**:
  - **Strict Privacy Rules**: Public views and `public_members` database view expose **only** Member Code (`BND-001`), Full Name, Public Designation, and Profile Picture.
  - **Never Exposes**: Father's name (`father_name`), share count / monthly contribution fee (`shares_count`, `monthly_contribution`), Date of Birth (`date_of_birth`), birth year, phone numbers, join dates, authentication IDs, or private payment ledgers.
  - Features: Search by name/code, alphabetical/code sorting, and lazy-loaded avatars with fallbacks.
- **`/login` (Member Login)**: Secure email/password authentication, domain-aware password reset (`https://bondon2017.netlify.app/`), and demo/test login support.

### 2. Private Member Portal (`/member/*`)
Authenticated club members access their personal records:
- **`/member/profile`**:
  - Personal profile & self-service editor: photo, full name, member ID, phone, join date, monthly contribution (BDT ৳), **Private Date of Birth** (strictly visible only to self & admins), and **Public Blood Group** (visible to all authenticated members).
  - Personal Financial Summary & interactive charts: Total paid, total paid months, total outstanding dues (principal + fines), unpaid months count, and payment status.
  - **Club Announcements** feed + **Authenticated Blood Group & Birthday Directory** (searchable & filterable by blood group; shows birthday Month + Day only, never birth year, DOB, father's name, or shares/fee).
  - Recent billing cycles with 1-click **Official Payment Receipt** (printable A4 & direct PDF download).
- **`/member/payment-history`**:
  - Personal contribution ledger with fiscal year, month, status, and search filters.
  - **Official Payment Receipt** button for all paid and partial transactions (ownership enforced: members can only view/download their own receipts).
- **Animated Notification Bell (`NotificationCenter`)**:
  - Real-time unread counter with ringing animation and category filters (**All**, **Notices**, **Payments**, **Birthdays**).
  - Includes clickable Admin Announcements (opening detail view), private payment confirmation alerts (`audience = 'member'`), and `Asia/Dhaka` upcoming birthday reminders (Month + Day only).

### 3. Admin Console (`/admin/*` – Permanent Dark Theme)
Authenticated Administrators have full operational, financial, and member management capabilities:
- **`/admin/dashboard`**:
  - **Date Range & Period Analytics**: Interactive filters (`This Month`, `Last 6 Mos`, `FY YYYY`, `All Time`, `Custom Range`) computing real database KPIs, MoM/YoY % growth indicators, and cumulative active-member outstanding dues.
  - **Interactive Recharts Visualizations**: Bar vs. Target comparison, explicit **Trend Line** mode (`LineChart`), Multi-Year Stacked History, Payment Status Donut, Fund Allocation & Expense History Donut, and Revenue Mix Donut.
  - **Club Treasury & Sonali Bank PLC Ledger**: Track bank deposits, interest, bank charges/VAT, withdrawals, cash-in-hand progress, and club expenses.
  - **Publish Announcements Manager**: Create categorized club announcements (`general`, `finance`, `event`, `urgent`) broadcast directly to all authenticated members.
- **`/admin/members` & `/admin/members/:memberId`**:
  - Full Member Directory & individual profile ledger management (including Date of Birth, Blood Group, Share Allocations, Status toggle, and Supabase Storage avatar uploads).
  - Member-level analytics and printable/PDF **Official Payment Receipts**.
- **`/admin/payments` & `/admin/payment-history`**:
  - Atomic monthly dues generation (`UNIQUE(member_id, month, year)`), late-fine automation (12th of following month rule), `RecordPaymentModal` with immediate **Download / Print Receipt** action upon saving, advanced filtering, and UTF-8 CSV exports.
- **`/admin/reports`**:
  - Monthly Reconciliation, Member-Wise Rankings, **Custom Date Range** transaction reports with instant receipt lookup, and UTF-8 CSV exports with Excel BOM.
- **`/admin/settings` & `/admin/treasury`**:
  - Club configuration, Sonali Bank statement reconciliation, Supabase connection diagnostics, SQL schema export, and JSON backups.

---

## 🛠 Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, React Router 7, Lucide Icons, Recharts, Motion (`motion/react`), Lottie (`lottie-react`).
- **PDF Receipts**: `jspdf` client-side A4 PDF generation + isolated `@media print` A4 receipt sheet.
- **Backend & Database**: Supabase PostgreSQL with Row Level Security (RLS) & `SECURITY DEFINER` RPCs.
- **Authentication & Storage**: Supabase Auth & Supabase Storage (`member-avatars`).
- **Serverless & Hosting**: Netlify Functions (`netlify/functions/admin-invite.ts`) & `netlify.toml` SPA/security header config.

---

## 🔒 Database Privacy & Security Model

Privacy is enforced directly in PostgreSQL (`supabase/schema.sql` and `supabase/migrations/20261121000000_profile_notifications_birthdays_receipts.sql`):
- **`members` Table RLS**: Non-admin members can `SELECT` only their own row (`auth_user_id = auth.uid()`), preventing direct queries from reading peer `date_of_birth`, `phone`, `father_name`, or `shares_count`.
- **`public_members` View**: Exposes only `{ id, member_code, full_name, profile_image_url, designation, status }`.
- **Authenticated Directory RPC (`get_authenticated_member_directory`)**: Returns `blood_group`, `birth_month`, and `birth_day` ONLY (never `date_of_birth`, birth year, `father_name`, or `shares_count`).
- **Upcoming Birthday RPC (`get_upcoming_birthday_highlights`)**: Computes birthdays in `Asia/Dhaka` timezone (handling Dec → Jan year boundaries and mapping Feb 29 → Mar 1 in non-leap years) and returns `days_until` (`0..2`) without exposing birth year or DOB.
- **Self-Service Profile RPC (`update_my_member_profile`)**: Allows authenticated members to safely update only their own `phone`, `date_of_birth`, and `blood_group` without altering shares, dues, or status.
- **Scoped Notifications (`notifications` & `notification_reads`)**: Personal payment notifications (`audience = 'member'`) are readable strictly by `target_member_id` owner or admins; broadcast announcements (`all_members`) track per-user read state in `notification_reads`.

---

## 🚀 Setup & Deployment Guide

### 1. Database Setup in Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. For a fresh database, execute `supabase/schema.sql`.
4. For an existing database upgrade, execute `supabase/migrations/20261121000000_profile_notifications_birthdays_receipts.sql`.
5. Configure Auth **Site URL** to `https://bondon2017.netlify.app/` and Redirect URLs for password recovery.

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

### 4. Production Build & Netlify Deployment
1. Verify local build:
   ```bash
   npm run build
   ```
2. Connect the repository in Netlify (`Build command`: `npm run build`, `Publish directory`: `dist`).
3. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `SUPABASE_SERVICE_ROLE_KEY` in Netlify environment variables.

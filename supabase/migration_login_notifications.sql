-- ==============================================================================
-- BONDHON 2017 - NON-DESTRUCTIVE MIGRATION
-- Adds: Member Name+Email Login Verification RPC, Self-Linking RPC, Phone Update RPC,
--       and Admin Dashboard Notifications Table (Safe to run on existing database!)
-- ==============================================================================

-- 1. Ensure email column exists on public.members
alter table public.members add column if not exists email text;

-- 2. Create notifications table if not exists
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  member_id uuid references public.members(id) on delete cascade,
  member_code text,
  member_name text not null,
  event_type text not null default 'profile_updated' check (event_type in ('member_login', 'password_changed', 'profile_updated', 'payment_notice')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_notifications_created on public.notifications(created_at desc);
create index if not exists idx_notifications_read on public.notifications(is_read);

alter table public.notifications enable row level security;

drop policy if exists "Authenticated users can log activity notifications" on public.notifications;
create policy "Authenticated users can log activity notifications"
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = actor_user_id or actor_user_id is null);

drop policy if exists "Admins view notifications" on public.notifications;
create policy "Admins view notifications"
  on public.notifications for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins update notifications" on public.notifications;
create policy "Admins update notifications"
  on public.notifications for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins delete notifications" on public.notifications;
create policy "Admins delete notifications"
  on public.notifications for delete
  to authenticated
  using (public.is_admin());

-- 3. Verify Member Name/ID + Email match before login (never exposes emails)
create or replace function public.verify_member_login_match(
  p_member_id uuid,
  p_email text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where id = p_member_id
      and status = 'active'
      and lower(trim(coalesce(email, ''))) = lower(trim(coalesce(p_email, '')))
      and trim(coalesce(email, '')) <> ''
  );
$$;

grant execute on function public.verify_member_login_match(uuid, text) to anon, authenticated;

-- 4. Auto-link authenticated user to their matching members row
create or replace function public.link_my_member_by_auth()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_code text;
begin
  if auth.uid() is null then
    return;
  end if;

  v_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
  select nullif(trim(coalesce(raw_user_meta_data->>'member_code', '')), '')
    into v_code
    from auth.users where id = auth.uid();

  update public.members
  set auth_user_id = auth.uid(),
      email = coalesce(nullif(trim(email), ''), v_email)
  where auth_user_id is null
    and (
      (v_email <> '' and lower(trim(coalesce(email, ''))) = v_email)
      or (v_code is not null and upper(member_code) = upper(v_code))
    );
end;
$$;

grant execute on function public.link_my_member_by_auth() to authenticated;

-- 5. Allow members to update their own contact phone
create or replace function public.update_my_member_phone(p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  v_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
  update public.members
  set phone = trim(p_phone),
      updated_at = timezone('utc'::text, now())
  where auth_user_id = auth.uid()
     or (v_email <> '' and lower(trim(coalesce(email, ''))) = v_email);
end;
$$;

grant execute on function public.update_my_member_phone(text) to authenticated;

-- 6. Ensure Admin (kmtanvir1111@gmail.com) has admin profile & member email set
update public.members
set email = 'kmtanvir1111@gmail.com'
where member_code = 'BND-007' and (email is null or trim(email) = '');

insert into public.profiles (id, full_name, role)
select id, 'Tanvir Khan', 'admin'
from auth.users
where lower(email) = 'kmtanvir1111@gmail.com'
on conflict (id)
do update set
  full_name = excluded.full_name,
  role = 'admin';

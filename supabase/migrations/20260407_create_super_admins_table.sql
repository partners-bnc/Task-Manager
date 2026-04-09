create table if not exists public.super_admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  name text not null,
  password_hash text,
  status text not null default 'Active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint super_admins_status_check check (status in ('Active', 'Inactive'))
);

create index if not exists super_admins_auth_user_id_idx on public.super_admins (auth_user_id);

alter table public.super_admins enable row level security;

drop policy if exists "super_admins_select_own_row" on public.super_admins;
create policy "super_admins_select_own_row"
on public.super_admins
for select
to authenticated
using ((select auth.uid()) = auth_user_id);

drop policy if exists "super_admins_update_own_row" on public.super_admins;
create policy "super_admins_update_own_row"
on public.super_admins
for update
to authenticated
using ((select auth.uid()) = auth_user_id)
with check ((select auth.uid()) = auth_user_id);

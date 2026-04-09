create table if not exists public.hr_admins (
  id uuid primary key default gen_random_uuid(),
  sr_no integer not null,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  name text not null,
  phone text,
  department_id uuid references public.hrm_departments(id) on delete set null,
  designation_id uuid references public.hrm_designations(id) on delete set null,
  status text not null default 'Active',
  password_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hr_admins_sr_no_unique unique (sr_no),
  constraint hr_admins_status_check check (status in ('Active', 'Inactive'))
);

create index if not exists hr_admins_auth_user_id_idx on public.hr_admins (auth_user_id);
create index if not exists hr_admins_department_id_idx on public.hr_admins (department_id);
create index if not exists hr_admins_designation_id_idx on public.hr_admins (designation_id);

alter table public.hr_admins enable row level security;

drop policy if exists "hr_admins_select_own_row" on public.hr_admins;
create policy "hr_admins_select_own_row"
on public.hr_admins
for select
to authenticated
using ((select auth.uid()) = auth_user_id);

drop policy if exists "hr_admins_update_own_row" on public.hr_admins;
create policy "hr_admins_update_own_row"
on public.hr_admins
for update
to authenticated
using ((select auth.uid()) = auth_user_id)
with check ((select auth.uid()) = auth_user_id);

with seed_rows as (
  select *
  from (
    values
      (1, 'Neha Srivastava', 'neha@bncglobal.in', '8923125988', 'Talent Acquisition', 'Senior Consultant-TA & HR', 'Active'),
      (2, 'Karanpreet Kaur', 'karanpreet@bncglobal.in', '8882646530', 'Talent Acquisition', 'Senior Recruitment', 'Active'),
      (3, 'Shailvi Soni', 'shailvibncglobal@gmail.com', '9516739861', 'Talent Acquisition', 'Senior Recruitment', 'Active'),
      (4, 'Payal', 'payal.bncglobal@gmail.com', '9730610109', 'Talent Acquisition', 'Recruitment', 'Active'),
      (5, 'Akriti Nigam', 'akritinigam7890@gmail.com', '9621896900', 'Talent Acquisition', 'Intern', 'Active')
  ) as t(sr_no, name, email, phone, department_name, designation_title, status)
)
insert into public.hr_admins (
  sr_no,
  auth_user_id,
  email,
  name,
  phone,
  department_id,
  designation_id,
  status
)
select
  seed_rows.sr_no,
  profiles.id,
  lower(seed_rows.email),
  seed_rows.name,
  seed_rows.phone,
  departments.id,
  designations.id,
  seed_rows.status
from seed_rows
left join public.profiles
  on lower(profiles.email) = lower(seed_rows.email)
left join public.hrm_departments departments
  on lower(departments.name) = lower(seed_rows.department_name)
left join public.hrm_designations designations
  on lower(designations.title) = lower(seed_rows.designation_title)
 and designations.department_id = departments.id
on conflict (email) do update
set
  sr_no = excluded.sr_no,
  auth_user_id = excluded.auth_user_id,
  name = excluded.name,
  phone = excluded.phone,
  department_id = excluded.department_id,
  designation_id = excluded.designation_id,
  status = excluded.status,
  updated_at = timezone('utc', now());

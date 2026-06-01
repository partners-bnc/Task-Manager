create table if not exists public.privileged_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  name text not null,
  role text not null check (role in ('super_admin', 'hr_admin', 'support')),
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  sr_no integer,
  phone text,
  department_id uuid references public.hrm_departments(id) on delete set null,
  designation_id uuid references public.hrm_designations(id) on delete set null,
  designation text,
  profile_picture_url text,
  password_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists privileged_accounts_role_idx on public.privileged_accounts (role, status);
create index if not exists privileged_accounts_auth_user_id_idx on public.privileged_accounts (auth_user_id);
create index if not exists privileged_accounts_department_id_idx on public.privileged_accounts (department_id);
create index if not exists privileged_accounts_designation_id_idx on public.privileged_accounts (designation_id);

alter table public.privileged_accounts enable row level security;

drop policy if exists "privileged_accounts_select_own_row" on public.privileged_accounts;
create policy "privileged_accounts_select_own_row"
on public.privileged_accounts
for select
to authenticated
using ((select auth.uid()) = auth_user_id);

drop policy if exists "privileged_accounts_update_own_row" on public.privileged_accounts;
create policy "privileged_accounts_update_own_row"
on public.privileged_accounts
for update
to authenticated
using ((select auth.uid()) = auth_user_id)
with check ((select auth.uid()) = auth_user_id);

insert into public.privileged_accounts (
  auth_user_id,
  email,
  name,
  role,
  status,
  sr_no,
  phone,
  department_id,
  designation_id,
  password_hash,
  created_at,
  updated_at
)
select
  hr.auth_user_id,
  lower(hr.email),
  hr.name,
  'hr_admin',
  hr.status,
  hr.sr_no,
  hr.phone,
  hr.department_id,
  hr.designation_id,
  hr.password_hash,
  hr.created_at,
  hr.updated_at
from public.hr_admins hr
on conflict (email) do update
set
  auth_user_id = excluded.auth_user_id,
  name = excluded.name,
  role = excluded.role,
  status = excluded.status,
  sr_no = excluded.sr_no,
  phone = excluded.phone,
  department_id = excluded.department_id,
  designation_id = excluded.designation_id,
  password_hash = excluded.password_hash,
  updated_at = timezone('utc', now());

insert into public.privileged_accounts (
  auth_user_id,
  email,
  name,
  role,
  status,
  designation,
  profile_picture_url,
  password_hash,
  created_at,
  updated_at
)
select
  sa.auth_user_id,
  lower(sa.email),
  sa.name,
  'super_admin',
  sa.status,
  sa.designation,
  sa.profile_picture_url,
  sa.password_hash,
  sa.created_at,
  sa.updated_at
from public.super_admins sa
on conflict (email) do update
set
  auth_user_id = excluded.auth_user_id,
  name = excluded.name,
  role = excluded.role,
  status = excluded.status,
  designation = excluded.designation,
  profile_picture_url = excluded.profile_picture_url,
  password_hash = excluded.password_hash,
  updated_at = timezone('utc', now());

alter table public.hrm_profiles
drop constraint if exists profiles_role_check;

alter table public.hrm_profiles
add constraint profiles_role_check
check (role in ('super_admin', 'hr_admin', 'support', 'employee'));

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'hrm_tickets'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'tickets'
  ) then
    alter table public.hrm_tickets rename to tickets;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'hrm_ticket_participants'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ticket_participants'
  ) then
    alter table public.hrm_ticket_participants rename to ticket_participants;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'hrm_ticket_comments'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ticket_comments'
  ) then
    alter table public.hrm_ticket_comments rename to ticket_comments;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'hrm_ticket_attachments'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ticket_attachments'
  ) then
    alter table public.hrm_ticket_attachments rename to ticket_attachments;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'hrm_ticket_status_history'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ticket_status_history'
  ) then
    alter table public.hrm_ticket_status_history rename to ticket_status_history;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'hrm_ticket_escalations'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ticket_escalations'
  ) then
    alter table public.hrm_ticket_escalations rename to ticket_escalations;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tickets'
      and column_name = 'module_key'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tickets'
      and column_name = 'source_module'
  ) then
    alter table public.tickets rename column module_key to source_module;
  end if;
end $$;

alter table public.tickets
  alter column source_module set default 'hrm';

update public.tickets
set source_module = 'hrm'
where source_module is null or btrim(source_module) = '';

alter table public.tickets
  alter column source_module set not null;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'tickets'
      and constraint_name = 'hrm_tickets_module_key_check'
  ) then
    alter table public.tickets drop constraint hrm_tickets_module_key_check;
  end if;

  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'tickets'
      and constraint_name = 'tickets_source_module_check'
  ) then
    alter table public.tickets drop constraint tickets_source_module_check;
  end if;
end $$;

alter table public.tickets
  add constraint tickets_source_module_check
  check (source_module in ('hrm', 'task_manager'));

do $$
begin
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'tickets' and constraint_name = 'hrm_tickets_requester_role_check') then
    alter table public.tickets drop constraint hrm_tickets_requester_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'tickets' and constraint_name = 'hrm_tickets_owner_role_check') then
    alter table public.tickets drop constraint hrm_tickets_owner_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'tickets' and constraint_name = 'hrm_tickets_raised_for_role_check') then
    alter table public.tickets drop constraint hrm_tickets_raised_for_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'tickets' and constraint_name = 'tickets_requester_role_check') then
    alter table public.tickets drop constraint tickets_requester_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'tickets' and constraint_name = 'tickets_owner_role_check') then
    alter table public.tickets drop constraint tickets_owner_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'tickets' and constraint_name = 'tickets_raised_for_role_check') then
    alter table public.tickets drop constraint tickets_raised_for_role_check;
  end if;
end $$;

alter table public.tickets
  add constraint tickets_requester_role_check check (requester_role in ('employee', 'hr_admin', 'super_admin', 'support')),
  add constraint tickets_owner_role_check check (owner_role in ('employee', 'hr_admin', 'super_admin', 'support')),
  add constraint tickets_raised_for_role_check check (raised_for_role in ('employee', 'hr_admin', 'super_admin', 'support'));

do $$
begin
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_participants' and constraint_name = 'hrm_ticket_participants_participant_role_check') then
    alter table public.ticket_participants drop constraint hrm_ticket_participants_participant_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_participants' and constraint_name = 'ticket_participants_participant_role_check') then
    alter table public.ticket_participants drop constraint ticket_participants_participant_role_check;
  end if;
end $$;

alter table public.ticket_participants
  add constraint ticket_participants_participant_role_check check (participant_role in ('employee', 'hr_admin', 'super_admin', 'support'));

do $$
begin
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_comments' and constraint_name = 'hrm_ticket_comments_author_role_check') then
    alter table public.ticket_comments drop constraint hrm_ticket_comments_author_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_comments' and constraint_name = 'ticket_comments_author_role_check') then
    alter table public.ticket_comments drop constraint ticket_comments_author_role_check;
  end if;
end $$;

alter table public.ticket_comments
  add constraint ticket_comments_author_role_check check (author_role in ('employee', 'hr_admin', 'super_admin', 'support'));

do $$
begin
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_status_history' and constraint_name = 'hrm_ticket_status_history_acted_by_role_check') then
    alter table public.ticket_status_history drop constraint hrm_ticket_status_history_acted_by_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_status_history' and constraint_name = 'ticket_status_history_acted_by_role_check') then
    alter table public.ticket_status_history drop constraint ticket_status_history_acted_by_role_check;
  end if;
end $$;

alter table public.ticket_status_history
  add constraint ticket_status_history_acted_by_role_check check (acted_by_role in ('employee', 'hr_admin', 'super_admin', 'support'));

do $$
begin
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_escalations' and constraint_name = 'hrm_ticket_escalations_from_role_check') then
    alter table public.ticket_escalations drop constraint hrm_ticket_escalations_from_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_escalations' and constraint_name = 'hrm_ticket_escalations_to_role_check') then
    alter table public.ticket_escalations drop constraint hrm_ticket_escalations_to_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_escalations' and constraint_name = 'hrm_ticket_escalations_escalated_by_role_check') then
    alter table public.ticket_escalations drop constraint hrm_ticket_escalations_escalated_by_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_escalations' and constraint_name = 'ticket_escalations_from_role_check') then
    alter table public.ticket_escalations drop constraint ticket_escalations_from_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_escalations' and constraint_name = 'ticket_escalations_to_role_check') then
    alter table public.ticket_escalations drop constraint ticket_escalations_to_role_check;
  end if;
  if exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'ticket_escalations' and constraint_name = 'ticket_escalations_escalated_by_role_check') then
    alter table public.ticket_escalations drop constraint ticket_escalations_escalated_by_role_check;
  end if;
end $$;

alter table public.ticket_escalations
  add constraint ticket_escalations_from_role_check check (from_role in ('employee', 'hr_admin', 'super_admin', 'support')),
  add constraint ticket_escalations_to_role_check check (to_role in ('employee', 'hr_admin', 'super_admin', 'support')),
  add constraint ticket_escalations_escalated_by_role_check check (escalated_by_role in ('employee', 'hr_admin', 'super_admin', 'support'));

create or replace view public.hrm_tickets as
select
  id,
  ticket_no,
  subject,
  description,
  category,
  priority,
  status,
  requester_auth_user_id,
  requester_employee_id,
  requester_role,
  owner_auth_user_id,
  owner_employee_id,
  owner_role,
  raised_for_auth_user_id,
  raised_for_employee_id,
  raised_for_role,
  resolved_at,
  closed_at,
  last_activity_at,
  created_at,
  updated_at,
  source_module as module_key,
  due_at,
  late_at,
  is_late,
  is_sla_breached,
  current_escalated_auth_user_id,
  current_escalated_employee_id,
  current_escalated_role,
  escalated_at
from public.tickets;

create or replace view public.hrm_ticket_participants as
select * from public.ticket_participants;

create or replace view public.hrm_ticket_comments as
select * from public.ticket_comments;

create or replace view public.hrm_ticket_attachments as
select * from public.ticket_attachments;

create or replace view public.hrm_ticket_status_history as
select * from public.ticket_status_history;

create or replace view public.hrm_ticket_escalations as
select * from public.ticket_escalations;

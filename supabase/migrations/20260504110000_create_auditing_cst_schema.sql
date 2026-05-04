create or replace function public.auditing_cst_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.auditing_cst_calculate_work_days(start_date date, end_date date)
returns integer
language plpgsql
immutable
as $$
begin
  if start_date is null or end_date is null or end_date < start_date then
    return 0;
  end if;

  return ((end_date - start_date) + 1)::integer;
end;
$$;

create or replace function public.auditing_cst_sync_gantt_work_days()
returns trigger
language plpgsql
as $$
begin
  new.work_days = public.auditing_cst_calculate_work_days(new.start_date, new.end_date);
  return new;
end;
$$;

create or replace function public.auditing_cst_current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.hrm_employees e
  where e.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.auditing_cst_has_admin_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hrm_profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'hr_admin', 'super_admin')
  )
$$;

create or replace function public.auditing_cst_has_module_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.auditing_cst_has_admin_access()
    or exists (
      select 1
      from public.hrm_employees e
      join public.hrm_module_access ma
        on ma.employee_id = e.id
      where e.auth_user_id = auth.uid()
        and coalesce(ma.auditing, false) = true
    )
$$;

create table if not exists public.auditing_cst_projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  client_name text not null,
  project_leader text not null,
  project_start_date date,
  project_end_date date,
  project_length integer check (project_length is null or project_length >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint auditing_cst_projects_date_check
    check (
      project_start_date is null
      or project_end_date is null
      or project_end_date >= project_start_date
    )
);

create table if not exists public.auditing_cst_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.auditing_cst_projects(id) on delete cascade,
  employee_id uuid not null references public.hrm_employees(id) on delete cascade,
  role_in_project text,
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, employee_id)
);

create table if not exists public.auditing_cst_gantt_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.auditing_cst_projects(id) on delete cascade,
  sort_order integer not null default 0,
  label_code text,
  task_name text not null,
  assigned_to text,
  start_date date,
  end_date date,
  is_done boolean not null default false,
  done_marked_on date,
  done_marked_by uuid,
  percent_done numeric(5,2) not null default 0 check (percent_done >= 0 and percent_done <= 100),
  work_days integer not null default 0 check (work_days >= 0),
  remaining numeric(5,2) not null default 0 check (remaining >= 0 and remaining <= 100),
  remark text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint auditing_cst_gantt_tasks_date_check
    check (
      start_date is null
      or end_date is null
      or end_date >= start_date
    )
);

create table if not exists public.auditing_cst_gantt_task_members (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.auditing_cst_gantt_tasks(id) on delete cascade,
  employee_id uuid not null references public.hrm_employees(id) on delete cascade,
  assigned_at timestamptz not null default timezone('utc', now()),
  unique (task_id, employee_id)
);

create table if not exists public.auditing_cst_gantt_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.auditing_cst_gantt_tasks(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.auditing_cst_import_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.auditing_cst_projects(id) on delete cascade,
  source_file_name text not null,
  sheet_mapping jsonb not null default '{}'::jsonb,
  import_summary jsonb not null default '{}'::jsonb,
  uploaded_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.auditing_cst_can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.auditing_cst_has_admin_access()
    or exists (
      select 1
      from public.auditing_cst_project_members pm
      where pm.project_id = target_project_id
        and pm.employee_id = public.auditing_cst_current_employee_id()
    )
$$;

create or replace function public.auditing_cst_can_access_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.auditing_cst_gantt_tasks t
    where t.id = target_task_id
      and public.auditing_cst_can_access_project(t.project_id)
  )
$$;

create or replace function public.auditing_cst_sync_done_marker()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.is_done, false) = false then
    new.done_marked_on = null;
    new.done_marked_by = null;
  elsif new.done_marked_on is null then
    new.done_marked_on = current_date;
  end if;

  return new;
end;
$$;

create index if not exists auditing_cst_projects_created_idx
  on public.auditing_cst_projects(created_at desc);

create index if not exists auditing_cst_projects_status_idx
  on public.auditing_cst_projects(status, updated_at desc);

create index if not exists auditing_cst_project_members_employee_idx
  on public.auditing_cst_project_members(employee_id);

create index if not exists auditing_cst_project_members_project_idx
  on public.auditing_cst_project_members(project_id);

create index if not exists auditing_cst_gantt_tasks_project_sort_idx
  on public.auditing_cst_gantt_tasks(project_id, sort_order, created_at asc);

create index if not exists auditing_cst_gantt_tasks_done_idx
  on public.auditing_cst_gantt_tasks(project_id, is_done, done_marked_on desc);

create index if not exists auditing_cst_gantt_task_members_task_idx
  on public.auditing_cst_gantt_task_members(task_id);

create index if not exists auditing_cst_gantt_task_members_employee_idx
  on public.auditing_cst_gantt_task_members(employee_id);

create index if not exists auditing_cst_gantt_attachments_task_idx
  on public.auditing_cst_gantt_attachments(task_id);

create index if not exists auditing_cst_import_logs_project_created_idx
  on public.auditing_cst_import_logs(project_id, created_at desc);

drop trigger if exists trg_auditing_cst_projects_updated_at on public.auditing_cst_projects;
create trigger trg_auditing_cst_projects_updated_at
before update on public.auditing_cst_projects
for each row
execute function public.auditing_cst_set_updated_at();

drop trigger if exists trg_auditing_cst_gantt_tasks_updated_at on public.auditing_cst_gantt_tasks;
create trigger trg_auditing_cst_gantt_tasks_updated_at
before update on public.auditing_cst_gantt_tasks
for each row
execute function public.auditing_cst_set_updated_at();

drop trigger if exists trg_auditing_cst_gantt_tasks_work_days on public.auditing_cst_gantt_tasks;
create trigger trg_auditing_cst_gantt_tasks_work_days
before insert or update of start_date, end_date on public.auditing_cst_gantt_tasks
for each row
execute function public.auditing_cst_sync_gantt_work_days();

drop trigger if exists trg_auditing_cst_gantt_tasks_done_marker on public.auditing_cst_gantt_tasks;
create trigger trg_auditing_cst_gantt_tasks_done_marker
before insert or update of is_done, done_marked_on, done_marked_by on public.auditing_cst_gantt_tasks
for each row
execute function public.auditing_cst_sync_done_marker();

alter table public.auditing_cst_projects enable row level security;
alter table public.auditing_cst_project_members enable row level security;
alter table public.auditing_cst_gantt_tasks enable row level security;
alter table public.auditing_cst_gantt_task_members enable row level security;
alter table public.auditing_cst_gantt_attachments enable row level security;
alter table public.auditing_cst_import_logs enable row level security;

drop policy if exists auditing_cst_projects_select on public.auditing_cst_projects;
create policy auditing_cst_projects_select
on public.auditing_cst_projects
for select
using (public.auditing_cst_can_access_project(id));

drop policy if exists auditing_cst_projects_insert on public.auditing_cst_projects;
create policy auditing_cst_projects_insert
on public.auditing_cst_projects
for insert
with check (public.auditing_cst_has_module_access());

drop policy if exists auditing_cst_projects_update on public.auditing_cst_projects;
create policy auditing_cst_projects_update
on public.auditing_cst_projects
for update
using (public.auditing_cst_can_access_project(id))
with check (public.auditing_cst_can_access_project(id));

drop policy if exists auditing_cst_projects_delete on public.auditing_cst_projects;
create policy auditing_cst_projects_delete
on public.auditing_cst_projects
for delete
using (public.auditing_cst_can_access_project(id));

drop policy if exists auditing_cst_project_members_all on public.auditing_cst_project_members;
create policy auditing_cst_project_members_all
on public.auditing_cst_project_members
for all
using (public.auditing_cst_can_access_project(project_id))
with check (public.auditing_cst_can_access_project(project_id));

drop policy if exists auditing_cst_gantt_tasks_all on public.auditing_cst_gantt_tasks;
create policy auditing_cst_gantt_tasks_all
on public.auditing_cst_gantt_tasks
for all
using (public.auditing_cst_can_access_project(project_id))
with check (public.auditing_cst_can_access_project(project_id));

drop policy if exists auditing_cst_gantt_task_members_all on public.auditing_cst_gantt_task_members;
create policy auditing_cst_gantt_task_members_all
on public.auditing_cst_gantt_task_members
for all
using (
  exists (
    select 1
    from public.auditing_cst_gantt_tasks t
    where t.id = auditing_cst_gantt_task_members.task_id
      and public.auditing_cst_can_access_project(t.project_id)
  )
)
with check (
  exists (
    select 1
    from public.auditing_cst_gantt_tasks t
    join public.auditing_cst_project_members pm
      on pm.project_id = t.project_id
     and pm.employee_id = auditing_cst_gantt_task_members.employee_id
    where t.id = auditing_cst_gantt_task_members.task_id
      and public.auditing_cst_can_access_project(t.project_id)
  )
);

drop policy if exists auditing_cst_gantt_attachments_all on public.auditing_cst_gantt_attachments;
create policy auditing_cst_gantt_attachments_all
on public.auditing_cst_gantt_attachments
for all
using (public.auditing_cst_can_access_task(task_id))
with check (public.auditing_cst_can_access_task(task_id));

drop policy if exists auditing_cst_import_logs_all on public.auditing_cst_import_logs;
create policy auditing_cst_import_logs_all
on public.auditing_cst_import_logs
for all
using (public.auditing_cst_can_access_project(project_id))
with check (public.auditing_cst_can_access_project(project_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'auditing-cst-documents',
  'auditing-cst-documents',
  true,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
where not exists (
  select 1
  from storage.buckets
  where id = 'auditing-cst-documents'
);

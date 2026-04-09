alter table if exists public.hrm_employees
  add column if not exists employee_type text,
  add column if not exists employment_lifecycle_status text,
  add column if not exists current_stage text,
  add column if not exists terminated_at timestamptz,
  add column if not exists termination_reason text,
  add column if not exists access_disabled_at timestamptz;

update public.hrm_employees
set
  employee_type = coalesce(nullif(employee_type, ''), 'full_time_employee'),
  employment_lifecycle_status = coalesce(
    nullif(employment_lifecycle_status, ''),
    case
      when lower(coalesce(employee_status, '')) = 'terminated' then 'terminated'
      when lower(coalesce(employee_status, '')) = 'inactive' then 'inactive'
      else 'active'
    end
  ),
  current_stage = coalesce(
    nullif(current_stage, ''),
    case
      when lower(coalesce(employee_status, '')) in ('probation', 'notice_period', 'on_leave') then lower(employee_status)
      else 'none'
    end
  ),
  terminated_at = case
    when coalesce(nullif(employment_lifecycle_status, ''), lower(coalesce(employee_status, ''))) = 'terminated'
      then coalesce(terminated_at, timezone('utc', now()))
    else terminated_at
  end,
  access_disabled_at = case
    when coalesce(nullif(employment_lifecycle_status, ''), lower(coalesce(employee_status, ''))) = 'terminated'
      then coalesce(access_disabled_at, timezone('utc', now()))
    else access_disabled_at
  end;

update public.hrm_employees
set current_stage = 'none'
where employment_lifecycle_status = 'terminated';

alter table if exists public.hrm_employees
  alter column employee_type set default 'full_time_employee',
  alter column employment_lifecycle_status set default 'active',
  alter column current_stage set default 'none';

update public.hrm_employees
set
  employee_type = coalesce(employee_type, 'full_time_employee'),
  employment_lifecycle_status = coalesce(employment_lifecycle_status, 'active'),
  current_stage = coalesce(current_stage, 'none');

alter table if exists public.hrm_employees
  alter column employee_type set not null,
  alter column employment_lifecycle_status set not null,
  alter column current_stage set not null;

alter table if exists public.hrm_employees
  drop constraint if exists hrm_employees_employee_type_check;

alter table if exists public.hrm_employees
  add constraint hrm_employees_employee_type_check
  check (
    employee_type = any (array[
      'intern',
      'full_time_employee',
      'part_time_employee',
      'contract_freelancer',
      'trainee_probation',
      'consultant'
    ])
  );

alter table if exists public.hrm_employees
  drop constraint if exists hrm_employees_employment_lifecycle_status_check;

alter table if exists public.hrm_employees
  add constraint hrm_employees_employment_lifecycle_status_check
  check (
    employment_lifecycle_status = any (array['active', 'inactive', 'terminated'])
  );

alter table if exists public.hrm_employees
  drop constraint if exists hrm_employees_current_stage_check;

alter table if exists public.hrm_employees
  add constraint hrm_employees_current_stage_check
  check (
    current_stage = any (array['none', 'probation', 'notice_period', 'on_leave'])
  );

create index if not exists hrm_employees_lifecycle_status_idx
  on public.hrm_employees (employment_lifecycle_status);

create index if not exists hrm_employees_current_stage_idx
  on public.hrm_employees (current_stage);

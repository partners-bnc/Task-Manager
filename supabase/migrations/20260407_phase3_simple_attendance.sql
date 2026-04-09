create table if not exists public.hrm_employee_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hrm_employees(id) on delete cascade,
  attendance_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  late_in_minutes integer not null default 0,
  early_out_minutes integer not null default 0,
  work_hours_minutes integer not null default 0,
  attendance_status text not null default 'absent'
    check (attendance_status in ('present', 'late', 'half_day', 'absent')),
  checkout_source text not null default 'employee'
    check (checkout_source in ('employee', 'system_auto', 'regularization')),
  is_auto_checkout boolean not null default false,
  is_regularized boolean not null default false,
  regularization_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hrm_employee_attendance_employee_date_key unique (employee_id, attendance_date)
);

create index if not exists hrm_employee_attendance_employee_date_idx
  on public.hrm_employee_attendance (employee_id, attendance_date desc);

create index if not exists hrm_employee_attendance_status_date_idx
  on public.hrm_employee_attendance (attendance_status, attendance_date desc);

create table if not exists public.hrm_attendance_regularization (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hrm_employees(id) on delete cascade,
  attendance_id uuid references public.hrm_employee_attendance(id) on delete set null,
  attendance_date date not null,
  requested_check_in_at timestamptz,
  requested_check_out_at timestamptz,
  reason text not null,
  request_status text not null default 'pending'
    check (request_status in ('pending', 'approved', 'rejected')),
  requested_to_hr boolean not null default true,
  requested_to_reporting_manager boolean not null default true,
  approved_by uuid references public.hrm_employees(id) on delete set null,
  approved_by_role text
    check (approved_by_role in ('hr_admin', 'reporting_manager')),
  approved_at timestamptz,
  rejection_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hrm_attendance_regularization_employee_date_idx
  on public.hrm_attendance_regularization (employee_id, attendance_date desc);

create index if not exists hrm_attendance_regularization_status_idx
  on public.hrm_attendance_regularization (request_status, created_at desc);

alter table public.hrm_employee_attendance
  add constraint hrm_employee_attendance_regularization_id_fkey
  foreign key (regularization_id) references public.hrm_attendance_regularization(id) on delete set null;

create or replace function public.set_hrm_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_hrm_employee_attendance_updated_at on public.hrm_employee_attendance;
create trigger trg_hrm_employee_attendance_updated_at
before update on public.hrm_employee_attendance
for each row execute function public.set_hrm_attendance_updated_at();

drop trigger if exists trg_hrm_attendance_regularization_updated_at on public.hrm_attendance_regularization;
create trigger trg_hrm_attendance_regularization_updated_at
before update on public.hrm_attendance_regularization
for each row execute function public.set_hrm_attendance_updated_at();

create or replace function public.auto_checkout_open_attendance_rows()
returns void
language plpgsql
as $$
declare
  ist_date date := (now() at time zone 'Asia/Kolkata')::date;
  auto_checkout_at timestamptz := (((now() at time zone 'Asia/Kolkata')::date)::text || ' 22:00:00+05:30')::timestamptz;
begin
  update public.hrm_employee_attendance
  set
    check_out_at = coalesce(check_out_at, auto_checkout_at),
    checkout_source = 'system_auto',
    is_auto_checkout = true,
    notes = coalesce(notes || E'\n', '') || 'Auto checkout by system',
    updated_at = now()
  where attendance_date = ist_date
    and check_in_at is not null
    and check_out_at is null;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'auto_checkout_attendance_10pm_ist') then
      perform cron.unschedule('auto_checkout_attendance_10pm_ist');
    end if;

    perform cron.schedule(
      'auto_checkout_attendance_10pm_ist',
      '30 16 * * *',
      $$select public.auto_checkout_open_attendance_rows();$$
    );
  end if;
exception
  when others then
    null;
end $$;

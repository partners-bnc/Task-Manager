alter table if exists public.hrm_regularization_requests
  add column if not exists attendance_id uuid references public.hrm_attendance(id) on delete set null,
  add column if not exists current_attendance_status text,
  add column if not exists request_type text,
  add column if not exists requested_check_in time,
  add column if not exists requested_check_out time,
  add column if not exists details text,
  add column if not exists final_approved_by uuid,
  add column if not exists final_approved_role text,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz;

alter table if exists public.hrm_attendance
  add column if not exists is_regularized boolean not null default false;

update public.hrm_regularization_requests
set reason = coalesce(nullif(trim(reason), ''), 'Attendance regularization request')
where reason is null or trim(reason) = '';

alter table if exists public.hrm_regularization_requests
  alter column reason set not null;

create table if not exists public.hrm_regularization_request_recipients (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.hrm_regularization_requests(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('approver', 'cc')),
  recipient_role text not null check (recipient_role in ('hr_admin', 'reporting_manager')),
  recipient_auth_user_id uuid,
  recipient_employee_id uuid references public.hrm_employees(id) on delete cascade,
  recipient_name text,
  recipient_email text,
  decision_status text not null default 'pending' check (decision_status in ('pending', 'approved', 'rejected', 'skipped')),
  decision_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hrm_regularization_request_recipients_request_idx
  on public.hrm_regularization_request_recipients(request_id);

create index if not exists hrm_regularization_request_recipients_auth_idx
  on public.hrm_regularization_request_recipients(recipient_auth_user_id);

create index if not exists hrm_regularization_request_recipients_employee_idx
  on public.hrm_regularization_request_recipients(recipient_employee_id);

create unique index if not exists hrm_regularization_pending_request_unique_idx
  on public.hrm_regularization_requests(employee_id, date)
  where status = 'pending';

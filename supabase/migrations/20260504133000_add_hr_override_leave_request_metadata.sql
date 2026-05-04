alter table if exists public.hrm_leave_requests
  add column if not exists request_source text not null default 'employee',
  add column if not exists override_attendance_date date;

update public.hrm_leave_requests
set request_source = 'employee'
where coalesce(trim(request_source), '') = '';

alter table if exists public.hrm_leave_requests
  drop constraint if exists hrm_leave_requests_request_source_check;

alter table if exists public.hrm_leave_requests
  add constraint hrm_leave_requests_request_source_check
  check (request_source in ('employee', 'hr_override'));

create index if not exists hrm_leave_requests_override_lookup_idx
  on public.hrm_leave_requests (employee_id, override_attendance_date, request_source, status);

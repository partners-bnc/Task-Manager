alter table if exists public.hrm_regularization_requests
  add column if not exists approval_outcome text;

alter table if exists public.hrm_attendance
  add column if not exists regularization_result text;

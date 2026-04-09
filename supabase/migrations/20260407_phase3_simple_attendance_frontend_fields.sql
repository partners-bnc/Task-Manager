alter table if exists public.hrm_attendance_regularization
  add column if not exists permission_type text,
  add column if not exists request_rows jsonb not null default '[]'::jsonb,
  add column if not exists cc_emails text[] not null default '{}',
  add column if not exists remarks text;

create index if not exists hrm_attendance_regularization_attendance_id_idx
  on public.hrm_attendance_regularization (attendance_id);

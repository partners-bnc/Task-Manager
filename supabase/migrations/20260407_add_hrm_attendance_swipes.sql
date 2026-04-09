create table if not exists public.hrm_attendance_swipes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hrm_employees(id) on delete cascade,
  attendance_id uuid references public.hrm_attendance(id) on delete set null,
  swipe_date date not null,
  swipe_time timestamptz not null,
  swipe_type text not null check (swipe_type in ('in', 'out')),
  source text not null default 'manual' check (source in ('manual', 'biometric')),
  door_address text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists hrm_attendance_swipes_employee_date_idx
  on public.hrm_attendance_swipes (employee_id, swipe_date desc, swipe_time asc);

create index if not exists hrm_attendance_swipes_attendance_id_idx
  on public.hrm_attendance_swipes (attendance_id);

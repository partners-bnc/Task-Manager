alter table if exists public.hrm_leave_types
  add column if not exists monthly_credit_days numeric(6,2) not null default 0,
  add column if not exists is_paid boolean not null default true,
  add column if not exists counts_as_lop boolean not null default false,
  add column if not exists display_order integer not null default 0;

update public.hrm_leave_types
set
  monthly_credit_days = case
    when lower(name) = 'casual leave' then 0.5
    when lower(name) = 'sick leave' then 1.0
    else coalesce(monthly_credit_days, 0)
  end,
  default_days_per_year = case
    when lower(name) = 'casual leave' then 6
    when lower(name) = 'sick leave' then 12
    else default_days_per_year
  end,
  is_paid = case
    when lower(name) in ('casual leave', 'sick leave', 'annual leave', 'maternity/paternity') then true
    else coalesce(is_paid, true)
  end,
  counts_as_lop = false,
  display_order = case
    when lower(name) = 'annual leave' then 1
    when lower(name) = 'casual leave' then 2
    when lower(name) = 'sick leave' then 3
    when lower(name) = 'maternity/paternity' then 4
    else display_order
  end;

alter table if exists public.hrm_leave_balances
  add column if not exists credited_days numeric(8,2) not null default 0,
  add column if not exists lop_days numeric(8,2) not null default 0,
  add column if not exists carry_forward_days numeric(8,2) not null default 0,
  add column if not exists available_days numeric(8,2) not null default 0;

update public.hrm_leave_balances
set available_days = greatest(coalesce(total_days, 0) - coalesce(used_days, 0), 0);

create unique index if not exists hrm_leave_balances_employee_type_year_idx
  on public.hrm_leave_balances (employee_id, leave_type_id, year);

alter table if exists public.hrm_leave_requests
  add column if not exists total_days numeric(8,2) not null default 0,
  add column if not exists approved_days numeric(8,2) not null default 0,
  add column if not exists paid_days numeric(8,2) not null default 0,
  add column if not exists lop_days numeric(8,2) not null default 0,
  add column if not exists review_note text,
  add column if not exists rejection_reason text,
  add column if not exists applied_session text,
  add column if not exists document_url text;

update public.hrm_leave_requests
set applied_session = coalesce(nullif(trim(applied_session), ''), session)
where applied_session is null or trim(applied_session) = '';

update public.hrm_leave_requests
set session = case
  when lower(trim(session)) in ('full session', 'full_day', 'full session ') then 'full_day'
  when lower(trim(session)) in ('first half', 'first_half', '10-1am session', '10-1 am session') then 'first_half'
  when lower(trim(session)) in ('second half', 'second_half', '1-7am session', '1-7 am session') then 'second_half'
  else session
end;

update public.hrm_leave_requests
set applied_session = case
  when lower(trim(applied_session)) in ('full session', 'full_day', 'full session ') then 'full_day'
  when lower(trim(applied_session)) in ('first half', 'first_half', '10-1am session', '10-1 am session') then 'first_half'
  when lower(trim(applied_session)) in ('second half', 'second_half', '1-7am session', '1-7 am session') then 'second_half'
  else applied_session
end;

alter table if exists public.hrm_leave_requests
  drop constraint if exists hrm_leave_requests_session_check;

alter table if exists public.hrm_leave_requests
  add constraint hrm_leave_requests_session_check
  check (session in ('full_day', 'first_half', 'second_half'));

create table if not exists public.hrm_leave_accrual_ledger (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hrm_employees(id) on delete cascade,
  leave_type_id uuid not null references public.hrm_leave_types(id) on delete cascade,
  year integer not null,
  month integer,
  entry_type text not null check (
    entry_type in (
      'monthly_credit',
      'carry_forward',
      'manual_adjustment',
      'leave_usage',
      'lop_conversion',
      'yearly_allocation'
    )
  ),
  days numeric(8,2) not null,
  reference_request_id uuid references public.hrm_leave_requests(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists hrm_leave_accrual_ledger_employee_year_idx
  on public.hrm_leave_accrual_ledger (employee_id, year, month);

create unique index if not exists hrm_leave_accrual_ledger_monthly_credit_unique_idx
  on public.hrm_leave_accrual_ledger (employee_id, leave_type_id, year, month, entry_type)
  where entry_type = 'monthly_credit';

create unique index if not exists hrm_leave_accrual_ledger_yearly_allocation_unique_idx
  on public.hrm_leave_accrual_ledger (employee_id, leave_type_id, year, entry_type)
  where entry_type in ('carry_forward', 'yearly_allocation');

alter table if exists public.hrm_attendance
  drop constraint if exists hrm_attendance_status_check;

alter table if exists public.hrm_attendance
  add constraint hrm_attendance_status_check
  check (status in ('present', 'late', 'absent', 'halfday', 'on_leave', 'holiday'));

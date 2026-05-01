alter table if exists public.hrm_leave_requests
  add column if not exists comp_off_worked_date date;

update public.hrm_leave_types
set
  default_days_per_year = 1,
  monthly_credit_days = 0,
  is_paid = true,
  counts_as_lop = false,
  is_carry_forward = false,
  max_carry_forward_days = 0,
  is_active = true,
  display_order = 4
where lower(trim(name)) = 'special leave';

insert into public.hrm_leave_types (
  name,
  default_days_per_year,
  monthly_credit_days,
  is_paid,
  counts_as_lop,
  is_carry_forward,
  max_carry_forward_days,
  is_active,
  display_order
)
select
  'Special Leave',
  1,
  0,
  true,
  false,
  false,
  0,
  true,
  4
where not exists (
  select 1
  from public.hrm_leave_types
  where lower(trim(name)) = 'special leave'
);

update public.hrm_leave_types
set
  default_days_per_year = 0,
  monthly_credit_days = 0,
  is_paid = true,
  counts_as_lop = false,
  is_carry_forward = false,
  max_carry_forward_days = 0,
  is_active = true,
  display_order = 5
where lower(trim(name)) in ('comp off', 'compensatory off');

insert into public.hrm_leave_types (
  name,
  default_days_per_year,
  monthly_credit_days,
  is_paid,
  counts_as_lop,
  is_carry_forward,
  max_carry_forward_days,
  is_active,
  display_order
)
select
  'Comp Off',
  0,
  0,
  true,
  false,
  false,
  0,
  true,
  5
where not exists (
  select 1
  from public.hrm_leave_types
  where lower(trim(name)) in ('comp off', 'compensatory off')
);

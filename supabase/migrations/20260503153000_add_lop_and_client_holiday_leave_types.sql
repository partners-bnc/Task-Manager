update public.hrm_leave_types
set
  monthly_credit_days = 0,
  default_days_per_year = 0,
  is_paid = false,
  counts_as_lop = true,
  is_carry_forward = false,
  max_carry_forward_days = 0,
  is_active = true,
  display_order = 6
where lower(trim(name)) in ('lop', 'loss of pay', 'loss of pay (lop)');

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
  'LOP',
  0,
  0,
  false,
  true,
  false,
  0,
  true,
  6
where not exists (
  select 1
  from public.hrm_leave_types
  where lower(trim(name)) in ('lop', 'loss of pay', 'loss of pay (lop)')
);

update public.hrm_leave_types
set
  monthly_credit_days = 0,
  default_days_per_year = 0,
  is_paid = true,
  counts_as_lop = false,
  is_carry_forward = false,
  max_carry_forward_days = 0,
  is_active = true,
  display_order = 7
where lower(trim(name)) in ('client holiday', 'client holiday (ch)');

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
  'Client Holiday',
  0,
  0,
  true,
  false,
  false,
  0,
  true,
  7
where not exists (
  select 1
  from public.hrm_leave_types
  where lower(trim(name)) in ('client holiday', 'client holiday (ch)')
);

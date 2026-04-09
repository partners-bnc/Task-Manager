alter table public.hrm_employees
  alter column shift_id drop default,
  alter column working_hours_start set default '10:00'::time,
  alter column working_hours_end set default '19:00'::time;

alter table public.hrm_employees
  drop constraint if exists hrm_employees_aadhaar_number_check;

alter table public.hrm_employees
  add constraint hrm_employees_aadhaar_number_check
  check (aadhaar_number is null or aadhaar_number ~ '^[0-9]{12}$');

alter table public.hrm_employees
  drop constraint if exists hrm_employees_pan_number_check;

alter table public.hrm_employees
  add constraint hrm_employees_pan_number_check
  check (pan_number is null or upper(pan_number) ~ '^[A-Z0-9]{10}$');

update public.hrm_employees
set
  shift_id = null,
  working_hours_start = coalesce(working_hours_start, '10:00'::time),
  working_hours_end = coalesce(working_hours_end, '19:00'::time),
  pan_number = case
    when pan_number is null then null
    else upper(pan_number)
  end;

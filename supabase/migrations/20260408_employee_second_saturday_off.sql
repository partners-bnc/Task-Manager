alter table if exists public.hrm_employees
  add column if not exists second_saturday_off boolean not null default false;

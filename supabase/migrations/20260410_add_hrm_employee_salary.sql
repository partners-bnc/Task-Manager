alter table if exists public.hrm_employees
  add column if not exists salary numeric(12,2);

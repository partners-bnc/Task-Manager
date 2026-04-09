alter table if exists public.hrm_employees
  drop constraint if exists hrm_employees_created_by_fkey;

alter table if exists public.hrm_employees
  add constraint hrm_employees_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;

alter table if exists public.hrm_employees
  add column if not exists reporting_super_admin_id uuid references public.privileged_accounts(id) on delete set null;

create index if not exists hrm_employees_reporting_super_admin_id_idx
  on public.hrm_employees (reporting_super_admin_id);

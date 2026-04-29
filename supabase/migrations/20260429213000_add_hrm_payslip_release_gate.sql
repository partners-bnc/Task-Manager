alter table public.hrm_payslips
  add column if not exists released_to_employee boolean not null default false,
  add column if not exists released_at timestamptz null,
  add column if not exists released_by uuid references public.hrm_profiles(id) on delete set null;

update public.hrm_payslips
set released_to_employee = false
where released_to_employee is distinct from false;

create index if not exists hrm_payslips_release_state_idx
  on public.hrm_payslips (released_to_employee, employee_id, year desc, month desc);

alter table public.hrm_profiles
  add column if not exists employee_id text;

create unique index if not exists hrm_profiles_employee_id_unique_idx
  on public.hrm_profiles (lower(employee_id))
  where employee_id is not null;

update public.hrm_profiles p
set
  employee_id = e.employee_id,
  full_name = coalesce(p.full_name, e.name),
  email = coalesce(p.email, e.email),
  phone = coalesce(p.phone, e.phone),
  updated_at = timezone('utc', now())
from public.hrm_employees e
where e.auth_user_id = p.id
  and (
    p.employee_id is distinct from e.employee_id
    or p.full_name is null
    or p.email is null
    or p.phone is null
  );

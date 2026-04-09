do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'hrm_employee_documents'
  ) and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'employee_documents'
  ) then
    alter table public.hrm_employee_documents rename to hrm_employee_documents_legacy;
  end if;
end $$;

alter table public.profiles rename to hrm_profiles;
alter table public.employees rename to hrm_employees;
alter table public.module_access rename to hrm_module_access;
alter table public.employee_education rename to hrm_employee_education;
alter table public.employee_certifications rename to hrm_employee_certifications;
alter table public.employee_documents rename to hrm_employee_documents;

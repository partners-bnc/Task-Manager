alter table public.hrm_employees
  add column if not exists experience_company_name text;

alter table public.hrm_onboarding_requests
  add column if not exists experience_company_name text;

alter table public.hrm_employees
  drop column if exists current_company_experience,
  drop column if exists previous_experience;

alter table public.hrm_onboarding_requests
  drop column if exists current_company_experience,
  drop column if exists previous_experience;

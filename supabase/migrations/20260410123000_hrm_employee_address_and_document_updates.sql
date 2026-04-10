alter table public.hrm_employees
  add column if not exists permanent_address text,
  add column if not exists permanent_city text,
  add column if not exists permanent_district text,
  add column if not exists permanent_state text,
  add column if not exists permanent_country text,
  add column if not exists permanent_pincode text;

update public.hrm_employees
set
  permanent_address = coalesce(permanent_address, address),
  permanent_city = coalesce(permanent_city, city),
  permanent_district = coalesce(permanent_district, district),
  permanent_state = coalesce(permanent_state, state),
  permanent_country = coalesce(permanent_country, country),
  permanent_pincode = coalesce(permanent_pincode, pincode),
  updated_at = timezone('utc', now())
where
  permanent_address is null
  or permanent_city is null
  or permanent_district is null
  or permanent_state is null
  or permanent_country is null
  or permanent_pincode is null;

alter table public.hrm_employees
  drop column if exists height_cm,
  drop column if exists weight_kg,
  drop column if exists hobby,
  drop column if exists caste;

alter table public.hrm_employee_documents
  drop constraint if exists employee_documents_type_check,
  drop constraint if exists hrm_employee_documents_type_check;

alter table public.hrm_employee_documents
  add constraint hrm_employee_documents_type_check check (
    document_type = any (array[
      'aadhaar_card',
      'pan_card',
      'passport',
      'appointment_letter',
      'experience_letter',
      'salary_slip'
    ])
  );

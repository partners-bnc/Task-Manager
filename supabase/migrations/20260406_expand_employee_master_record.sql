alter table public.profiles
  add column if not exists phone text;

alter table public.employees
  add column if not exists phone text,
  add column if not exists personal_email text,
  add column if not exists date_of_birth date,
  add column if not exists blood_group text,
  add column if not exists father_name text,
  add column if not exists marital_status text,
  add column if not exists marriage_date date,
  add column if not exists spouse_name text,
  add column if not exists nationality text,
  add column if not exists residential_status text,
  add column if not exists place_of_birth text,
  add column if not exists country_of_origin text,
  add column if not exists religion text,
  add column if not exists is_international boolean not null default false,
  add column if not exists is_physically_challenged boolean not null default false,
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists hobby text,
  add column if not exists caste text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists state text,
  add column if not exists country text,
  add column if not exists pincode text,
  add column if not exists alternate_phone text,
  add column if not exists mobile_phone text,
  add column if not exists date_of_joining date,
  add column if not exists confirmation_date date,
  add column if not exists employee_status text,
  add column if not exists probation_period_days integer,
  add column if not exists notice_period_days integer,
  add column if not exists current_company_experience text,
  add column if not exists previous_experience text,
  add column if not exists total_experience text,
  add column if not exists referred_by text,
  add column if not exists location text,
  add column if not exists department_id uuid references public.hrm_departments(id) on delete set null,
  add column if not exists division text,
  add column if not exists designation_id uuid references public.hrm_designations(id) on delete set null,
  add column if not exists reporting_manager_id uuid references public.employees(id) on delete set null,
  add column if not exists company text,
  add column if not exists shift_id uuid references public.hrm_shifts(id) on delete set null,
  add column if not exists working_schedule_label text,
  add column if not exists working_days text[] not null default '{}',
  add column if not exists working_hours_start time,
  add column if not exists working_hours_end time,
  add column if not exists aadhaar_number text,
  add column if not exists pan_number text,
  add column if not exists passport_number text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_holder_name text,
  add column if not exists bank_ifsc text,
  add column if not exists bank_name text,
  add column if not exists created_by uuid references public.employees(id) on delete set null;

create index if not exists employees_department_id_idx on public.employees(department_id);
create index if not exists employees_designation_id_idx on public.employees(designation_id);
create index if not exists employees_reporting_manager_id_idx on public.employees(reporting_manager_id);
create index if not exists employees_shift_id_idx on public.employees(shift_id);

update public.profiles p
set
  full_name = coalesce(p.full_name, e.name),
  phone = coalesce(p.phone, e.phone),
  updated_at = timezone('utc', now())
from public.employees e
where e.auth_user_id = p.id;

update public.employees e
set
  personal_email = coalesce(e.personal_email, hp.personal_email),
  date_of_birth = coalesce(e.date_of_birth, hp.date_of_birth),
  blood_group = coalesce(e.blood_group, hp.blood_group),
  father_name = coalesce(e.father_name, hp.father_name),
  marital_status = coalesce(e.marital_status, hp.marital_status),
  marriage_date = coalesce(e.marriage_date, hp.marriage_date),
  spouse_name = coalesce(e.spouse_name, hp.spouse_name),
  nationality = coalesce(e.nationality, hp.nationality),
  residential_status = coalesce(e.residential_status, hp.residential_status),
  place_of_birth = coalesce(e.place_of_birth, hp.place_of_birth),
  country_of_origin = coalesce(e.country_of_origin, hp.country_of_origin),
  religion = coalesce(e.religion, hp.religion),
  is_international = coalesce(e.is_international, hp.is_international, false),
  is_physically_challenged = coalesce(e.is_physically_challenged, hp.is_physically_challenged, false),
  height_cm = coalesce(e.height_cm, hp.height_cm),
  weight_kg = coalesce(e.weight_kg, hp.weight_kg),
  hobby = coalesce(e.hobby, hp.hobby),
  caste = coalesce(e.caste, hp.caste),
  address = coalesce(e.address, hp.address),
  city = coalesce(e.city, hp.city),
  district = coalesce(e.district, hp.district),
  state = coalesce(e.state, hp.state),
  country = coalesce(e.country, hp.country),
  pincode = coalesce(e.pincode, hp.pincode),
  phone = coalesce(e.phone, hp.phone1),
  alternate_phone = coalesce(e.alternate_phone, hp.phone2),
  mobile_phone = coalesce(e.mobile_phone, hp.mobile),
  date_of_joining = coalesce(e.date_of_joining, hp.joined_on),
  confirmation_date = coalesce(e.confirmation_date, hp.confirmation_date),
  employee_status = coalesce(e.employee_status, hp.employment_status),
  probation_period_days = coalesce(e.probation_period_days, hp.probation_period_days),
  notice_period_days = coalesce(e.notice_period_days, hp.notice_period_days),
  current_company_experience = coalesce(e.current_company_experience, hp.current_company_experience),
  previous_experience = coalesce(e.previous_experience, hp.previous_experience),
  total_experience = coalesce(e.total_experience, hp.total_experience),
  referred_by = coalesce(e.referred_by, hp.referred_by),
  location = coalesce(e.location, hp.location),
  department_id = coalesce(e.department_id, hp.department_id),
  division = coalesce(e.division, hp.division),
  designation_id = coalesce(e.designation_id, hp.designation_id),
  reporting_manager_id = coalesce(e.reporting_manager_id, hp.reporting_to),
  company = coalesce(e.company, hp.company),
  shift_id = coalesce(e.shift_id, hp.shift_id),
  aadhaar_number = coalesce(e.aadhaar_number, hp.aadhaar_national_id),
  pan_number = coalesce(e.pan_number, hp.pan),
  bank_account_number = coalesce(e.bank_account_number, hp.bank_account_number),
  bank_ifsc = coalesce(e.bank_ifsc, hp.bank_ifsc_code),
  bank_name = coalesce(e.bank_name, hp.bank_name),
  updated_at = timezone('utc', now())
from public.hrm_employee_profiles hp
where hp.employee_id = e.id;

create table if not exists public.employee_education (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  education_level text not null,
  institution_name text,
  board_university text,
  specialization text,
  passing_year integer,
  score text,
  degree_file_url text,
  degree_file_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint employee_education_level_check check (
    education_level = any(array['10th','12th','graduation','post_graduation'])
  ),
  constraint employee_education_unique_level unique (employee_id, education_level)
);

create index if not exists employee_education_employee_id_idx on public.employee_education(employee_id);
alter table public.employee_education enable row level security;

create table if not exists public.employee_certifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  certification_name text not null,
  issuer text,
  issued_year integer,
  certificate_file_url text,
  certificate_file_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists employee_certifications_employee_id_idx on public.employee_certifications(employee_id);
alter table public.employee_certifications enable row level security;

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  document_type text not null,
  file_name text,
  file_url text,
  file_path text,
  file_size integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint employee_documents_type_check check (
    document_type = any(array[
      'aadhaar_card',
      'pan_card',
      'passport',
      'appointment_letter',
      'experience_letter',
      'salary_slip'
    ])
  )
);

create index if not exists employee_documents_employee_id_idx on public.employee_documents(employee_id);
create index if not exists employee_documents_type_idx on public.employee_documents(document_type);
alter table public.employee_documents enable row level security;

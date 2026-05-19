create table if not exists public.hrm_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null,
  candidate_email text not null,
  token_hash text,
  token_expires_at timestamptz,
  invite_sent_at timestamptz,
  status text not null default 'invited' check (
    status in (
      'invited',
      'in_progress',
      'submitted',
      'approved',
      'changes_requested',
      'rejected',
      'converted',
      'expired',
      'cancelled'
    )
  ),
  submitted boolean not null default false,
  submitted_at timestamptz,
  reviewed_by uuid references public.hrm_profiles(id) on delete set null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  review_note text,
  converted_employee_id uuid references public.hrm_employees(id) on delete set null,
  archived_at timestamptz,
  created_by uuid references public.hrm_profiles(id) on delete set null,
  declaration_name text,
  declaration_accepted boolean not null default false,
  declaration_date date,
  personal_email text,
  date_of_birth date,
  gender text,
  blood_group text,
  father_name text,
  marital_status text,
  spouse_name text,
  nationality text,
  religion text,
  is_physically_challenged boolean,
  address text,
  city text,
  district text,
  state text,
  country text,
  pincode text,
  permanent_address text,
  permanent_city text,
  permanent_district text,
  permanent_state text,
  permanent_country text,
  permanent_pincode text,
  phone text,
  alternate_phone text,
  mobile_phone text,
  emergency_contact_name text,
  emergency_contact_number text,
  current_company_experience text,
  previous_experience text,
  total_experience text,
  aadhaar_number text,
  pan_number text,
  passport_number text,
  bank_account_number text,
  bank_account_holder_name text,
  bank_ifsc text,
  bank_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hrm_onboarding_education (
  id uuid primary key default gen_random_uuid(),
  onboarding_request_id uuid not null references public.hrm_onboarding_requests(id) on delete cascade,
  sort_order integer not null default 0,
  education_level text not null,
  institution_name text,
  board_university text,
  specialization text,
  passing_year integer,
  score text,
  degree_file_name text,
  degree_file_url text,
  degree_file_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hrm_onboarding_certifications (
  id uuid primary key default gen_random_uuid(),
  onboarding_request_id uuid not null references public.hrm_onboarding_requests(id) on delete cascade,
  sort_order integer not null default 0,
  certification_name text not null,
  issuer text,
  issued_year integer,
  certificate_file_name text,
  certificate_file_url text,
  certificate_file_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hrm_onboarding_documents (
  id uuid primary key default gen_random_uuid(),
  onboarding_request_id uuid not null references public.hrm_onboarding_requests(id) on delete cascade,
  document_type text not null check (
    document_type in (
      'aadhaar_card',
      'pan_card',
      'passport',
      'appointment_letter',
      'experience_letter',
      'salary_slip'
    )
  ),
  file_name text not null,
  file_url text,
  file_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hrm_onboarding_review_events (
  id uuid primary key default gen_random_uuid(),
  onboarding_request_id uuid not null references public.hrm_onboarding_requests(id) on delete cascade,
  action text not null check (
    action in (
      'invite_created',
      'invite_regenerated',
      'draft_saved',
      'submitted',
      'approved',
      'changes_requested',
      'rejected',
      'converted',
      'archived',
      'expired',
      'cancelled'
    )
  ),
  actor_profile_id uuid references public.hrm_profiles(id) on delete set null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists hrm_onboarding_requests_status_idx
  on public.hrm_onboarding_requests(status, created_at desc);

create index if not exists hrm_onboarding_requests_email_idx
  on public.hrm_onboarding_requests(candidate_email, created_at desc);

create index if not exists hrm_onboarding_requests_converted_employee_idx
  on public.hrm_onboarding_requests(converted_employee_id);

create index if not exists hrm_onboarding_education_request_idx
  on public.hrm_onboarding_education(onboarding_request_id, sort_order asc);

create index if not exists hrm_onboarding_certifications_request_idx
  on public.hrm_onboarding_certifications(onboarding_request_id, sort_order asc);

create index if not exists hrm_onboarding_documents_request_idx
  on public.hrm_onboarding_documents(onboarding_request_id, document_type);

create index if not exists hrm_onboarding_review_events_request_idx
  on public.hrm_onboarding_review_events(onboarding_request_id, created_at desc);

create or replace function public.set_hrm_onboarding_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_hrm_onboarding_requests_updated_at on public.hrm_onboarding_requests;
create trigger trg_hrm_onboarding_requests_updated_at
before update on public.hrm_onboarding_requests
for each row
execute function public.set_hrm_onboarding_updated_at();

drop trigger if exists trg_hrm_onboarding_education_updated_at on public.hrm_onboarding_education;
create trigger trg_hrm_onboarding_education_updated_at
before update on public.hrm_onboarding_education
for each row
execute function public.set_hrm_onboarding_updated_at();

drop trigger if exists trg_hrm_onboarding_certifications_updated_at on public.hrm_onboarding_certifications;
create trigger trg_hrm_onboarding_certifications_updated_at
before update on public.hrm_onboarding_certifications
for each row
execute function public.set_hrm_onboarding_updated_at();

drop trigger if exists trg_hrm_onboarding_documents_updated_at on public.hrm_onboarding_documents;
create trigger trg_hrm_onboarding_documents_updated_at
before update on public.hrm_onboarding_documents
for each row
execute function public.set_hrm_onboarding_updated_at();

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.email_outbox'::regclass
    and contype = 'c'
    and conname = 'email_outbox_event_type_check';

  if constraint_name is not null then
    execute 'alter table public.email_outbox drop constraint ' || quote_ident(constraint_name);
  end if;

  alter table public.email_outbox
    add constraint email_outbox_event_type_check
    check (event_type in ('employee_created', 'task_assigned', 'task_due', 'task_repeat_assigned', 'onboarding_invite'));
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'hrm-onboarding-files',
  'hrm-onboarding-files',
  true,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
where not exists (
  select 1
  from storage.buckets
  where id = 'hrm-onboarding-files'
);

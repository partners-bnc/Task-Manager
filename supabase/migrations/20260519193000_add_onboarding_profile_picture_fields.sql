alter table public.hrm_onboarding_requests
  add column if not exists profile_picture_file_name text,
  add column if not exists profile_picture_url text,
  add column if not exists profile_picture_path text;

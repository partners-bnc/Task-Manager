create or replace function public.set_hrm_policy_manual_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.hrm_policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  is_published boolean not null default true,
  created_by uuid references public.hrm_profiles(id) on delete set null,
  updated_by uuid references public.hrm_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hrm_policy_documents (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.hrm_policies(id) on delete cascade,
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  sort_order integer not null default 0,
  uploaded_by uuid references public.hrm_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists hrm_policies_updated_idx
  on public.hrm_policies(updated_at desc);

create index if not exists hrm_policies_published_updated_idx
  on public.hrm_policies(is_published, updated_at desc);

create index if not exists hrm_policy_documents_policy_sort_idx
  on public.hrm_policy_documents(policy_id, sort_order asc, created_at asc);

drop trigger if exists trg_hrm_policies_updated_at on public.hrm_policies;
create trigger trg_hrm_policies_updated_at
before update on public.hrm_policies
for each row
execute function public.set_hrm_policy_manual_updated_at();

drop trigger if exists trg_hrm_policy_documents_updated_at on public.hrm_policy_documents;
create trigger trg_hrm_policy_documents_updated_at
before update on public.hrm_policy_documents
for each row
execute function public.set_hrm_policy_manual_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'hrm-policy-documents',
  'hrm-policy-documents',
  true,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
where not exists (
  select 1
  from storage.buckets
  where id = 'hrm-policy-documents'
);

create table if not exists public.task_employee_ratings (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  employee_id uuid not null references public.hrm_employees(id) on delete cascade,
  rated_by_profile_id uuid references public.hrm_profiles(id) on delete set null,
  rated_by_employee_id uuid references public.hrm_employees(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint task_employee_ratings_task_employee_key unique (task_id, employee_id),
  constraint task_employee_ratings_reviewer_check check (
    rated_by_profile_id is not null or rated_by_employee_id is not null
  )
);

create index if not exists idx_task_employee_ratings_employee_updated_at
  on public.task_employee_ratings(employee_id, updated_at desc);

create index if not exists idx_task_employee_ratings_task_updated_at
  on public.task_employee_ratings(task_id, updated_at desc);

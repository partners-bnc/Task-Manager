create table if not exists public.task_subtask_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  subtask_id uuid not null references public.task_subtasks(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_path text,
  uploaded_at timestamptz not null default timezone('utc', now()),
  uploaded_by_employee_id uuid null references public.hrm_employees(id) on delete set null,
  uploaded_by_profile_id uuid null references public.hrm_profiles(id) on delete set null
);

create index if not exists idx_task_subtask_attachments_task_subtask
  on public.task_subtask_attachments(task_id, subtask_id, uploaded_at desc);

create index if not exists idx_task_subtask_attachments_uploaded_by_employee
  on public.task_subtask_attachments(uploaded_by_employee_id);

create index if not exists idx_task_subtask_attachments_uploaded_by_profile
  on public.task_subtask_attachments(uploaded_by_profile_id);

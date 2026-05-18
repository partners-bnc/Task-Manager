alter table if exists public.tasks
  add column if not exists completed_at timestamptz null;

create index if not exists idx_tasks_completed_at
  on public.tasks(completed_at desc);

alter table if exists public.task_attachments
  add column if not exists uploaded_by_employee_id uuid null
    references public.hrm_employees(id) on delete set null,
  add column if not exists uploaded_by_profile_id uuid null
    references public.hrm_profiles(id) on delete set null;

create index if not exists idx_task_attachments_uploaded_by_employee_id
  on public.task_attachments(uploaded_by_employee_id);

create index if not exists idx_task_attachments_uploaded_by_profile_id
  on public.task_attachments(uploaded_by_profile_id);

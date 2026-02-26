alter table public.task_subtasks
  add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null;

create index if not exists idx_task_subtasks_assigned_employee_id
  on public.task_subtasks(assigned_employee_id);

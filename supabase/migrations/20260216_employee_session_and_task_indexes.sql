-- Improve real-time dashboard performance and employee session lookups

create unique index if not exists idx_employee_sessions_token
  on public.employee_sessions(token);

create index if not exists idx_employee_sessions_employee_expires
  on public.employee_sessions(employee_id, expires_at desc);

create index if not exists idx_employee_sessions_expires_at
  on public.employee_sessions(expires_at);

create unique index if not exists idx_task_assignments_task_employee
  on public.task_assignments(task_id, employee_id);

create index if not exists idx_task_assignments_employee_assigned_at
  on public.task_assignments(employee_id, assigned_at desc);

create index if not exists idx_tasks_status_created_at
  on public.tasks(status, created_at desc);

create or replace function public.cleanup_expired_employee_sessions()
returns void
language sql
as $$
  delete from public.employee_sessions
  where expires_at <= now();
$$;

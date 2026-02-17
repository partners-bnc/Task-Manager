-- Fix counter drift on task delete (cascade deletes task_assignments after task row is gone)

create or replace function public.handle_task_delete_counter_delta()
returns trigger
language plpgsql
as $$
begin
  update public.employees e
  set
    pending_tasks = greatest(
      0,
      coalesce(e.pending_tasks, 0)
      - case when old.status = 'pending' then a.cnt else 0 end
    ),
    in_progress_tasks = greatest(
      0,
      coalesce(e.in_progress_tasks, 0)
      - case when old.status = 'in_progress' then a.cnt else 0 end
    ),
    completed_tasks = greatest(
      0,
      coalesce(e.completed_tasks, 0)
      - case when old.status = 'completed' then a.cnt else 0 end
    ),
    updated_at = now()
  from (
    select employee_id, count(*)::int as cnt
    from public.task_assignments
    where task_id = old.id
    group by employee_id
  ) a
  where e.id = a.employee_id;

  return old;
end;
$$;

drop trigger if exists trg_task_delete_counter_delta on public.tasks;
create trigger trg_task_delete_counter_delta
before delete on public.tasks
for each row
execute function public.handle_task_delete_counter_delta();

-- Backfill counters after installing delete fix
update public.employees e
set
  pending_tasks = coalesce(src.pending_tasks, 0),
  in_progress_tasks = coalesce(src.in_progress_tasks, 0),
  completed_tasks = coalesce(src.completed_tasks, 0),
  updated_at = now()
from (
  select
    e2.id as employee_id,
    count(*) filter (where t.status = 'pending')::int as pending_tasks,
    count(*) filter (where t.status = 'in_progress')::int as in_progress_tasks,
    count(*) filter (where t.status = 'completed')::int as completed_tasks
  from public.employees e2
  left join public.task_assignments ta on ta.employee_id = e2.id
  left join public.tasks t on t.id = ta.task_id
  group by e2.id
) src
where e.id = src.employee_id;

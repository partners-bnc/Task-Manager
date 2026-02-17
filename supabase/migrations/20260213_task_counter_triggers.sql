-- Keep employee task counters in sync inside Postgres (no app-side counter writes)

create or replace function public._apply_employee_task_status_delta(
  p_employee_id uuid,
  p_old_status text,
  p_new_status text
)
returns void
language sql
as $$
  update public.employees
  set
    pending_tasks = greatest(
      0,
      coalesce(pending_tasks, 0)
      + case when p_new_status = 'pending' then 1 else 0 end
      - case when p_old_status = 'pending' then 1 else 0 end
    ),
    in_progress_tasks = greatest(
      0,
      coalesce(in_progress_tasks, 0)
      + case when p_new_status = 'in_progress' then 1 else 0 end
      - case when p_old_status = 'in_progress' then 1 else 0 end
    ),
    completed_tasks = greatest(
      0,
      coalesce(completed_tasks, 0)
      + case when p_new_status = 'completed' then 1 else 0 end
      - case when p_old_status = 'completed' then 1 else 0 end
    ),
    updated_at = now()
  where id = p_employee_id;
$$;

create or replace function public.handle_task_assignment_counter_delta()
returns trigger
language plpgsql
as $$
declare
  v_old_status text;
  v_new_status text;
begin
  if tg_op = 'INSERT' then
    select status into v_new_status
    from public.tasks
    where id = new.task_id;

    perform public._apply_employee_task_status_delta(new.employee_id, null, v_new_status);
    return null;
  end if;

  if tg_op = 'DELETE' then
    select status into v_old_status
    from public.tasks
    where id = old.task_id;

    perform public._apply_employee_task_status_delta(old.employee_id, v_old_status, null);
    return null;
  end if;

  -- UPDATE on task_assignments
  if old.employee_id is distinct from new.employee_id
     or old.task_id is distinct from new.task_id then
    select status into v_old_status
    from public.tasks
    where id = old.task_id;

    select status into v_new_status
    from public.tasks
    where id = new.task_id;

    perform public._apply_employee_task_status_delta(old.employee_id, v_old_status, null);
    perform public._apply_employee_task_status_delta(new.employee_id, null, v_new_status);
  end if;

  return null;
end;
$$;

drop trigger if exists trg_task_assignment_counter_delta on public.task_assignments;
create trigger trg_task_assignment_counter_delta
after insert or update or delete on public.task_assignments
for each row
execute function public.handle_task_assignment_counter_delta();

create or replace function public.handle_task_status_counter_delta()
returns trigger
language plpgsql
as $$
begin
  if old.status is not distinct from new.status then
    return null;
  end if;

  update public.employees e
  set
    pending_tasks = greatest(
      0,
      coalesce(e.pending_tasks, 0)
      + case when new.status = 'pending' then a.cnt else 0 end
      - case when old.status = 'pending' then a.cnt else 0 end
    ),
    in_progress_tasks = greatest(
      0,
      coalesce(e.in_progress_tasks, 0)
      + case when new.status = 'in_progress' then a.cnt else 0 end
      - case when old.status = 'in_progress' then a.cnt else 0 end
    ),
    completed_tasks = greatest(
      0,
      coalesce(e.completed_tasks, 0)
      + case when new.status = 'completed' then a.cnt else 0 end
      - case when old.status = 'completed' then a.cnt else 0 end
    ),
    updated_at = now()
  from (
    select employee_id, count(*)::int as cnt
    from public.task_assignments
    where task_id = new.id
    group by employee_id
  ) a
  where e.id = a.employee_id;

  return null;
end;
$$;

drop trigger if exists trg_task_status_counter_delta on public.tasks;
create trigger trg_task_status_counter_delta
after update of status on public.tasks
for each row
execute function public.handle_task_status_counter_delta();

-- One-time backfill to correct any drift
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

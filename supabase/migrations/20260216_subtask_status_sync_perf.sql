-- Optimize subtask->task status sync trigger for lower latency
-- - Avoids recounting when UPDATE does not change completion state
-- - Uses a single aggregate query instead of two separate counts

create or replace function public.handle_task_subtasks_status_sync()
returns trigger
language plpgsql
as $$
declare
  v_task_id uuid;
  v_total_subtasks int;
  v_completed_subtasks int;
  v_next_status text;
begin
  if tg_op = 'UPDATE'
     and new.task_id is not distinct from old.task_id
     and new.is_completed is not distinct from old.is_completed then
    return null;
  end if;

  v_task_id := coalesce(new.task_id, old.task_id);

  if v_task_id is null then
    return null;
  end if;

  select
    count(*)::int,
    count(*) filter (where is_completed = true)::int
  into v_total_subtasks, v_completed_subtasks
  from public.task_subtasks
  where task_id = v_task_id;

  -- Preserve existing behavior: if no subtasks exist, do not force status.
  if v_total_subtasks <= 0 then
    return null;
  end if;

  if v_completed_subtasks = v_total_subtasks then
    v_next_status := 'completed';
  else
    v_next_status := 'in_progress';
  end if;

  update public.tasks
  set
    status = v_next_status,
    updated_at = now()
  where id = v_task_id
    and status is distinct from v_next_status;

  return null;
end;
$$;

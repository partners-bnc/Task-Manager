-- Auto-sync task.status from task_subtasks changes in Postgres

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
  v_task_id := coalesce(new.task_id, old.task_id);

  if v_task_id is null then
    return null;
  end if;

  select count(*)::int into v_total_subtasks
  from public.task_subtasks
  where task_id = v_task_id;

  -- Preserve existing behavior: if no subtasks exist, do not force status.
  if v_total_subtasks <= 0 then
    return null;
  end if;

  select count(*)::int into v_completed_subtasks
  from public.task_subtasks
  where task_id = v_task_id
    and is_completed = true;

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

drop trigger if exists trg_task_subtasks_status_sync on public.task_subtasks;
create trigger trg_task_subtasks_status_sync
after insert or update or delete on public.task_subtasks
for each row
execute function public.handle_task_subtasks_status_sync();

-- One-time backfill for tasks that currently have subtasks
update public.tasks t
set
  status = case
    when agg.total_subtasks > 0 and agg.completed_subtasks = agg.total_subtasks then 'completed'
    when agg.total_subtasks > 0 then 'in_progress'
    else t.status
  end,
  updated_at = now()
from (
  select
    task_id,
    count(*)::int as total_subtasks,
    count(*) filter (where is_completed = true)::int as completed_subtasks
  from public.task_subtasks
  group by task_id
) agg
where t.id = agg.task_id
  and agg.total_subtasks > 0
  and t.status is distinct from case
    when agg.completed_subtasks = agg.total_subtasks then 'completed'
    else 'in_progress'
  end;

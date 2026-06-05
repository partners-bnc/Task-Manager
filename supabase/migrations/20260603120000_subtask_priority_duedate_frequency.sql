-- Add priority, due_date, frequency, last_cycle_reset to task_subtasks
alter table public.task_subtasks
  add column if not exists priority text check (priority in ('low', 'medium', 'high')) default 'medium',
  add column if not exists due_date timestamptz,
  add column if not exists frequency text check (frequency in ('weekly', 'monthly', 'yearly')),
  add column if not exists last_cycle_reset timestamptz;

-- Backfill last_cycle_reset for existing subtasks that already have a frequency
update public.task_subtasks
set last_cycle_reset = created_at
where last_cycle_reset is null and frequency is not null;

-- Replace process_repeating_tasks to also handle subtask-level frequency
create or replace function public.process_repeating_tasks()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_processed int := 0;
  v_task    record;
  v_subtask record;
  v_new_anchor timestamptz;
begin
  -- ── Task-level repeat ────────────────────────────────────────────────────
  for v_task in
    select t.id, t.frequency, t.last_cycle_reset, t.task_name, t.description, t.priority, t.due_date
    from public.tasks t
    where t.frequency is not null
      and (
        (t.frequency = 'weekly'  and t.last_cycle_reset + interval '1 week'  <= timezone('utc', now())) or
        (t.frequency = 'monthly' and t.last_cycle_reset + interval '1 month' <= timezone('utc', now())) or
        (t.frequency = 'yearly'  and t.last_cycle_reset + interval '1 year'  <= timezone('utc', now()))
      )
  loop
    v_new_anchor := v_task.last_cycle_reset;
    if v_task.frequency = 'weekly' then
      while v_new_anchor + interval '1 week' <= timezone('utc', now()) loop
        v_new_anchor := v_new_anchor + interval '1 week';
      end loop;
    elsif v_task.frequency = 'monthly' then
      while v_new_anchor + interval '1 month' <= timezone('utc', now()) loop
        v_new_anchor := v_new_anchor + interval '1 month';
      end loop;
    else
      while v_new_anchor + interval '1 year' <= timezone('utc', now()) loop
        v_new_anchor := v_new_anchor + interval '1 year';
      end loop;
    end if;

    if v_new_anchor > v_task.last_cycle_reset then
      update public.tasks
      set last_cycle_reset = v_new_anchor, progress_percentage = 0,
          status = 'pending', updated_at = timezone('utc', now())
      where id = v_task.id;

      update public.task_subtasks
      set is_completed = false, updated_at = timezone('utc', now())
      where task_id = v_task.id;

      insert into public.email_outbox (event_type, recipient_email, payload, dedupe_key)
      select 'task_repeat_assigned', lower(e.email),
        jsonb_build_object('task_id', v_task.id, 'task_name', v_task.task_name,
          'task_description', coalesce(v_task.description,''), 'priority', coalesce(v_task.priority,'medium'),
          'due_date', v_task.due_date, 'employee_id', e.id, 'employee_name', coalesce(e.name,'Employee')),
        concat('task_repeat:', v_task.id::text, ':', e.id::text, ':', extract(epoch from v_new_anchor)::bigint::text)
      from public.task_assignments ta
      join public.employees e on e.id = ta.employee_id
      where ta.task_id = v_task.id and coalesce(e.email,'') <> ''
      on conflict (dedupe_key) do nothing;

      v_processed := v_processed + 1;
    end if;
  end loop;

  -- ── Subtask-level repeat ─────────────────────────────────────────────────
  for v_subtask in
    select s.id, s.frequency, s.last_cycle_reset
    from public.task_subtasks s
    where s.frequency is not null and s.last_cycle_reset is not null
      and (
        (s.frequency = 'weekly'  and s.last_cycle_reset + interval '1 week'  <= timezone('utc', now())) or
        (s.frequency = 'monthly' and s.last_cycle_reset + interval '1 month' <= timezone('utc', now())) or
        (s.frequency = 'yearly'  and s.last_cycle_reset + interval '1 year'  <= timezone('utc', now()))
      )
  loop
    v_new_anchor := v_subtask.last_cycle_reset;
    if v_subtask.frequency = 'weekly' then
      while v_new_anchor + interval '1 week' <= timezone('utc', now()) loop
        v_new_anchor := v_new_anchor + interval '1 week';
      end loop;
    elsif v_subtask.frequency = 'monthly' then
      while v_new_anchor + interval '1 month' <= timezone('utc', now()) loop
        v_new_anchor := v_new_anchor + interval '1 month';
      end loop;
    else
      while v_new_anchor + interval '1 year' <= timezone('utc', now()) loop
        v_new_anchor := v_new_anchor + interval '1 year';
      end loop;
    end if;

    if v_new_anchor > v_subtask.last_cycle_reset then
      update public.task_subtasks
      set is_completed = false, last_cycle_reset = v_new_anchor, updated_at = timezone('utc', now())
      where id = v_subtask.id;

      v_processed := v_processed + 1;
    end if;
  end loop;

  return v_processed;
end;
$$;

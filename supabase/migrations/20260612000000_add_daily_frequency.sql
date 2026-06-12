-- Drop the existing constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_frequency_check;

-- Recreate the constraint with 'daily' included
ALTER TABLE public.tasks ADD CONSTRAINT tasks_frequency_check CHECK (frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text]));

-- Recreate the process_repeating_tasks function to support daily intervals
CREATE OR REPLACE FUNCTION public.process_repeating_tasks() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_processed int := 0;
  v_task record;
  v_new_anchor timestamptz;
begin
  for v_task in
    select t.id, t.frequency, t.last_cycle_reset, t.task_name, t.description, t.priority, t.due_date
    from public.tasks t
    where t.frequency is not null
      and (
        (t.frequency = 'daily' and t.last_cycle_reset + interval '1 day' <= timezone('utc'::text, now())) or
        (t.frequency = 'weekly' and t.last_cycle_reset + interval '1 week' <= timezone('utc'::text, now())) or
        (t.frequency = 'monthly' and t.last_cycle_reset + interval '1 month' <= timezone('utc'::text, now())) or
        (t.frequency = 'yearly' and t.last_cycle_reset + interval '1 year' <= timezone('utc'::text, now()))
      )
  loop
    v_new_anchor := v_task.last_cycle_reset;
    
    if v_task.frequency = 'daily' then
      while v_new_anchor + interval '1 day' <= timezone('utc'::text, now()) loop
        v_new_anchor := v_new_anchor + interval '1 day';
      end loop;
    elsif v_task.frequency = 'weekly' then
      while v_new_anchor + interval '1 week' <= timezone('utc'::text, now()) loop
        v_new_anchor := v_new_anchor + interval '1 week';
      end loop;
    elsif v_task.frequency = 'monthly' then
      while v_new_anchor + interval '1 month' <= timezone('utc'::text, now()) loop
        v_new_anchor := v_new_anchor + interval '1 month';
      end loop;
    elsif v_task.frequency = 'yearly' then
      while v_new_anchor + interval '1 year' <= timezone('utc'::text, now()) loop
        v_new_anchor := v_new_anchor + interval '1 year';
      end loop;
    end if;

    if v_new_anchor > v_task.last_cycle_reset then
      -- Update task
      update public.tasks
      set last_cycle_reset = v_new_anchor,
          progress_percentage = 0,
          status = 'pending',
          updated_at = timezone('utc'::text, now())
      where id = v_task.id;

      -- Reset subtasks
      update public.task_subtasks
      set is_completed = false,
          updated_at = timezone('utc'::text, now())
      where task_id = v_task.id;

      -- Enqueue assignment emails
      insert into public.email_outbox (
        event_type, recipient_email, payload, dedupe_key
      )
      select
        'task_repeat_assigned',
        lower(e.email),
        jsonb_build_object(
          'task_id', v_task.id,
          'task_name', v_task.task_name,
          'task_description', coalesce(v_task.description, ''),
          'priority', coalesce(v_task.priority, 'medium'),
          'due_date', v_task.due_date,
          'employee_id', e.id,
          'employee_name', coalesce(e.name, 'Employee')
        ),
        concat('task_repeat:', v_task.id::text, ':', e.id::text, ':', extract(epoch from v_new_anchor)::bigint::text)
      from public.task_assignments ta
      join public.employees e on e.id = ta.employee_id
      where ta.task_id = v_task.id and coalesce(e.email, '') <> ''
      on conflict (dedupe_key) do nothing;

      v_processed := v_processed + 1;
    end if;
  end loop;

  return v_processed;
end;
$$;

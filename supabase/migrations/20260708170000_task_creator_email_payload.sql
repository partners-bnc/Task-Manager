-- Update task assignment and task due triggers to fetch the task creator's name and include it as 'creator_name' in the payload.

-- 1. Update enqueue_task_assignment_email function
create or replace function public.enqueue_task_assignment_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_employee record;
  v_creator record;
  v_due_epoch bigint;
begin
  select
    t.id,
    t.task_name,
    t.description,
    t.priority,
    t.due_date,
    t.created_by_employee_id
  into v_task
  from public.tasks t
  where t.id = new.task_id;

  select
    e.id,
    e.name,
    e.email
  into v_employee
  from public.hrm_employees e
  where e.id = new.employee_id;

  if v_task.id is null or v_employee.id is null or coalesce(v_employee.email, '') = '' then
    return new;
  end if;

  -- Get creator/assigner name
  select
    e.name
  into v_creator
  from public.hrm_employees e
  where e.id = v_task.created_by_employee_id;

  v_due_epoch := case
    when v_task.due_date is null then 0
    else extract(epoch from v_task.due_date)::bigint
  end;

  insert into public.email_outbox (
    event_type,
    recipient_email,
    payload,
    dedupe_key
  )
  values (
    'task_assigned',
    lower(v_employee.email),
    jsonb_build_object(
      'task_id', v_task.id,
      'task_name', v_task.task_name,
      'task_description', coalesce(v_task.description, ''),
      'priority', coalesce(v_task.priority, 'medium'),
      'due_date', v_task.due_date,
      'employee_id', v_employee.id,
      'employee_name', coalesce(v_employee.name, 'Employee'),
      'creator_name', coalesce(v_creator.name, 'System / Admin')
    ),
    concat(
      'task_assigned:',
      v_task.id::text,
      ':',
      v_employee.id::text,
      ':',
      coalesce(extract(epoch from new.assigned_at)::bigint, 0)::text,
      ':',
      v_due_epoch::text
    )
  )
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

-- 2. Update enqueue_due_task_emails function
create or replace function public.enqueue_due_task_emails()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
begin
  with due_candidates as (
    select
      t.id as task_id,
      t.task_name,
      coalesce(t.description, '') as task_description,
      coalesce(t.priority, 'medium') as priority,
      t.due_date,
      e.id as employee_id,
      coalesce(e.name, 'Employee') as employee_name,
      lower(e.email) as recipient_email,
      coalesce(c.name, 'System / Admin') as creator_name,
      concat(
        'task_due:',
        t.id::text,
        ':',
        e.id::text,
        ':',
        extract(epoch from t.due_date)::bigint::text
      ) as dedupe_key
    from public.tasks t
    join public.task_assignments ta on ta.task_id = t.id
    join public.hrm_employees e on e.id = ta.employee_id
    left join public.hrm_employees c on c.id = t.created_by_employee_id
    where t.due_date is not null
      and t.due_date <= timezone('utc'::text, now())
      and t.status <> 'completed'
      and coalesce(e.email, '') <> ''
  ),
  inserted as (
    insert into public.email_outbox (
      event_type,
      recipient_email,
      payload,
      dedupe_key
    )
    select
      'task_due',
      due_candidates.recipient_email,
      jsonb_build_object(
        'task_id', due_candidates.task_id,
        'task_name', due_candidates.task_name,
        'task_description', due_candidates.task_description,
        'priority', due_candidates.priority,
        'due_date', due_candidates.due_date,
        'employee_id', due_candidates.employee_id,
        'employee_name', due_candidates.employee_name,
        'creator_name', due_candidates.creator_name
      ),
      due_candidates.dedupe_key
    from due_candidates
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*)::int into v_inserted from inserted;

  return coalesce(v_inserted, 0);
end;
$$;

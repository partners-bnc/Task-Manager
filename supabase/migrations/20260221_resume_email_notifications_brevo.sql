-- Resume email notifications and switch dispatcher payload to Brevo.

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
    join public.employees e on e.id = ta.employee_id
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
        'employee_name', due_candidates.employee_name
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

drop trigger if exists trg_task_assignment_email_outbox on public.task_assignments;
create trigger trg_task_assignment_email_outbox
after insert on public.task_assignments
for each row
execute function public.enqueue_task_assignment_email();

do $$
begin
  if exists (select 1 from cron.job where jobname = 'dispatch_email_outbox_every_minute') then
    perform cron.unschedule('dispatch_email_outbox_every_minute');
  end if;
end
$$;

select cron.schedule(
  'dispatch_email_outbox_every_minute',
  '* * * * *',
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/email-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := jsonb_build_object(
        'source', 'pg_cron',
        'timestamp', timezone('utc'::text, now()),
        'email_notifications_enabled', true,
        'brevo_api_key', (select decrypted_secret from vault.decrypted_secrets where name = 'brevo_api_key'),
        'brevo_from_email', (select decrypted_secret from vault.decrypted_secrets where name = 'brevo_from_email'),
        'brevo_from_name', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'brevo_from_name'), 'TaskFlow'),
        'app_base_url', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url'), '')
      ),
      timeout_milliseconds := 10000
    );
  $$
);

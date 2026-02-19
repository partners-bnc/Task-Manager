-- Email outbox + notification plumbing for employee onboarding and task alerts.

alter table public.employees
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_set_at timestamptz;

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('employee_created', 'task_assigned', 'task_due')),
  recipient_email text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  scheduled_for timestamptz not null default timezone('utc'::text, now()),
  attempt_count int not null default 0,
  last_error text,
  sent_at timestamptz,
  locked_at timestamptz,
  dedupe_key text not null unique,
  provider_message_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_email_outbox_status_schedule
  on public.email_outbox(status, scheduled_for);

create index if not exists idx_email_outbox_event_status
  on public.email_outbox(event_type, status);

create index if not exists idx_email_outbox_locked_at
  on public.email_outbox(locked_at);

create or replace function public.set_email_outbox_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_email_outbox_updated_at on public.email_outbox;
create trigger trg_email_outbox_updated_at
before update on public.email_outbox
for each row
execute function public.set_email_outbox_updated_at();

create or replace function public.enqueue_task_assignment_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_employee record;
  v_due_epoch bigint;
begin
  select
    t.id,
    t.task_name,
    t.description,
    t.priority,
    t.due_date
  into v_task
  from public.tasks t
  where t.id = new.task_id;

  select
    e.id,
    e.name,
    e.email
  into v_employee
  from public.employees e
  where e.id = new.employee_id;

  if v_task.id is null or v_employee.id is null or coalesce(v_employee.email, '') = '' then
    return new;
  end if;

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
      'employee_name', coalesce(v_employee.name, 'Employee')
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

drop trigger if exists trg_task_assignment_email_outbox on public.task_assignments;
create trigger trg_task_assignment_email_outbox
after insert on public.task_assignments
for each row
execute function public.enqueue_task_assignment_email();

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

create or replace function public.claim_email_outbox_jobs(p_limit int default 25)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select eo.id
    from public.email_outbox eo
    where eo.status = 'pending'
      and eo.scheduled_for <= timezone('utc'::text, now())
      and (eo.locked_at is null or eo.locked_at < timezone('utc'::text, now()) - interval '10 minutes')
    order by eo.scheduled_for asc, eo.created_at asc
    for update skip locked
    limit greatest(p_limit, 1)
  ),
  claimed as (
    update public.email_outbox eo
    set
      status = 'processing',
      locked_at = timezone('utc'::text, now()),
      attempt_count = eo.attempt_count + 1
    where eo.id in (select c.id from candidates c)
    returning eo.*
  )
  select * from claimed;
end;
$$;

create or replace function public.mark_email_outbox_success(
  p_id uuid,
  p_provider_message_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_outbox
  set
    status = 'sent',
    sent_at = timezone('utc'::text, now()),
    last_error = null,
    locked_at = null,
    provider_message_id = p_provider_message_id,
    payload = case
      when event_type = 'employee_created' then payload - 'temp_password'
      else payload
    end
  where id = p_id;
end;
$$;

create or replace function public.mark_email_outbox_failure(
  p_id uuid,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_outbox
  set
    status = case
      when attempt_count >= 4 then 'failed'
      else 'pending'
    end,
    scheduled_for = case
      when attempt_count >= 4 then timezone('utc'::text, now())
      when attempt_count = 1 then timezone('utc'::text, now()) + interval '2 minutes'
      when attempt_count = 2 then timezone('utc'::text, now()) + interval '10 minutes'
      else timezone('utc'::text, now()) + interval '30 minutes'
    end,
    last_error = left(coalesce(p_error, 'Unknown provider error'), 1200),
    locked_at = null
  where id = p_id;
end;
$$;

create extension if not exists pg_net;

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
        'resend_api_key', (select decrypted_secret from vault.decrypted_secrets where name = 'resend_api_key'),
        'resend_from_email', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'resend_from_email'), 'onboarding@resend.dev'),
        'app_base_url', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url'), '')
      ),
      timeout_milliseconds := 10000
    );
  $$
);

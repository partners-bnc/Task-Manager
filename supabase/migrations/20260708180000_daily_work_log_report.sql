-- Configure daily work log report check constraint, report generation function, and midnight scheduler.

-- 1. Update email_outbox_event_type_check check constraint
do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.email_outbox'::regclass
    and contype = 'c'
    and conname = 'email_outbox_event_type_check';

  if constraint_name is not null then
    execute 'alter table public.email_outbox drop constraint ' || quote_ident(constraint_name);
  end if;

  alter table public.email_outbox
    add constraint email_outbox_event_type_check
    check (event_type in ('employee_created', 'task_assigned', 'task_due', 'task_repeat_assigned', 'onboarding_invite', 'daily_work_log_report'));
end $$;

-- 2. Create the daily work log report generation function
create or replace function public.generate_daily_work_log_report(p_date date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_date date;
  v_missing_employees jsonb;
  v_recipient record;
  v_count integer := 0;
begin
  -- Default to yesterday's date in Asia/Kolkata timezone
  v_report_date := coalesce(p_date, (timezone('Asia/Kolkata', now()) - interval '1 day')::date);

  -- Find active employees who have not filled their daily work logs for that date
  with missing as (
    select 
      e.employee_id,
      e.name,
      e.email
    from public.hrm_employees e
    where e.employment_lifecycle_status = 'active'
      and e.id not in (
        select distinct wl.employee_id
        from public.hrm_daily_work_logs wl
        where wl.log_date = v_report_date
      )
    order by e.employee_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id', missing.employee_id,
    'name', missing.name,
    'email', missing.email
  )), '[]'::jsonb)
  into v_missing_employees
  from missing;

  -- Queue an email for every active privileged account
  for v_recipient in
    select id, name, email
    from public.privileged_accounts
    where status = 'Active'
      and role in ('super_admin', 'hr_admin', 'support')
  loop
    insert into public.email_outbox (
      event_type,
      recipient_email,
      payload,
      dedupe_key
    )
    values (
      'daily_work_log_report',
      lower(v_recipient.email),
      jsonb_build_object(
        'report_date', v_report_date,
        'recipient_name', v_recipient.name,
        'missing_employees', v_missing_employees
      ),
      concat('daily_work_log_report:', v_recipient.id::text, ':', v_report_date::text)
    )
    on conflict (dedupe_key) do nothing;
    
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 3. Schedule the daily report job using pg_cron (at 18:30 UTC = 12:00 AM IST daily)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'daily_work_log_report_job') then
    perform cron.unschedule('daily_work_log_report_job');
  end if;
end
$$;

select cron.schedule(
  'daily_work_log_report_job',
  '30 18 * * *',
  $$select public.generate_daily_work_log_report()$$
);

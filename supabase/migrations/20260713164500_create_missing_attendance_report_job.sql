-- Create missing check-in report generation function and 12:00 PM IST scheduler.

-- 1. Create the daily missing check-in report function
create or replace function public.generate_missing_attendance_report(p_date date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_date date;
  v_day_name text;
  v_missing_employees jsonb;
  v_recipient record;
  v_count integer := 0;
begin
  -- Default to today's date in Asia/Kolkata timezone
  v_report_date := coalesce(p_date, (timezone('Asia/Kolkata', now()))::date);
  v_day_name := lower(trim(to_char(v_report_date, 'Day'))); -- e.g., 'monday'

  -- Find active employees who:
  -- 1. Have today in their working_days array (lowercase)
  -- 2. Are not on holiday today
  -- 3. Have not checked in today (no hrm_attendance record with status not 'absent' or check_in not null)
  -- Compute their leave status on v_report_date (approved/pending/missing)
  with missing as (
    select 
      e.employee_id,
      e.name,
      e.email,
      coalesce(
        (
          select 
            case 
              when lr.status = 'approved' then 'On Leave (Approved)'
              when lr.status = 'pending' then 'On Leave (Pending)'
            end
          from public.hrm_leave_requests lr
          where lr.employee_id = e.id
            and lr.status in ('approved', 'pending')
            and v_report_date between lr.start_date and lr.end_date
          order by case when lr.status = 'approved' then 1 else 2 end
          limit 1
        ),
        'Missing Check-in'
      ) as status
    from public.hrm_employees e
    where e.employment_lifecycle_status = 'active'
      -- 1. Must be a working day for the employee
      and v_day_name = any(e.working_days)
      -- 2. Skip if employee has Second Saturday Off and today is indeed the 2nd Saturday
      and not (
        e.second_saturday_off = true 
        and extract(dow from v_report_date) = 6 -- Saturday
        and extract(day from v_report_date) between 8 and 14 -- 2nd week
      )
      -- 3. Skip if today is a holiday in hrm_holidays
      and not exists (
        select 1 
        from public.hrm_holidays h 
        where h.date = v_report_date
      )
      -- 4. Must have NOT checked in yet (no row in hrm_attendance or check_in is null or status is absent)
      and not exists (
        select 1 
        from public.hrm_attendance a 
        where a.employee_id = e.id 
          and a.date = v_report_date
          and a.check_in is not null
          and a.status in ('present', 'late', 'halfday')
      )
    order by e.employee_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id', missing.employee_id,
    'name', missing.name,
    'email', missing.email,
    'status', missing.status
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
        'report_type', 'missing_attendance',
        'report_date', v_report_date,
        'recipient_name', v_recipient.name,
        'missing_employees', v_missing_employees
      ),
      concat('missing_attendance_report:', v_recipient.id::text, ':', v_report_date::text)
    )
    on conflict (dedupe_key) do nothing;
    
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 2. Schedule the pg_cron job using pg_cron (at 6:30 AM UTC = 12:00 PM IST daily)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'missing_attendance_report_job') then
    perform cron.unschedule('missing_attendance_report_job');
  end if;
end
$$;

select cron.schedule(
  'missing_attendance_report_job',
  '30 6 * * *',
  $$select public.generate_missing_attendance_report()$$
);

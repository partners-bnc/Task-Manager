-- Create weekly consolidated report generation function and Sunday 10 PM IST scheduler.

-- 1. Create the weekly consolidated report function
create or replace function public.generate_weekly_summary_report(p_end_date date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end_date date; -- Sunday
  v_start_date date; -- Monday
  v_sat_date date; -- Saturday
  v_leaves_applied jsonb;
  v_missing_attendance jsonb;
  v_missing_work_logs jsonb;
  v_recipient record;
  v_count integer := 0;
begin
  -- Default to today's date in Asia/Kolkata timezone (expected to run on Sunday)
  v_end_date := coalesce(p_end_date, (timezone('Asia/Kolkata', now()))::date);
  v_start_date := v_end_date - 6; -- Monday
  v_sat_date := v_end_date - 1; -- Saturday

  -- 1. Fetch Leaves Applied / active during Monday to Saturday
  select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id', e.employee_id,
    'name', e.name,
    'leave_type', lr.leave_type,
    'status', lr.status,
    'start_date', lr.start_date,
    'end_date', lr.end_date,
    'duration_days', lr.duration_days
  )), '[]'::jsonb)
  into v_leaves_applied
  from public.hrm_leave_requests lr
  join public.hrm_employees e on e.id = lr.employee_id
  where lr.status in ('approved', 'pending')
    and (
      lr.start_date <= v_sat_date
      and lr.end_date >= v_start_date
    );

  -- 2. Fetch Missing Attendance (Monday to Saturday) grouped by employee with specific dates
  with week_days as (
    select (v_start_date + i)::date as d,
           lower(trim(to_char(v_start_date + i, 'Day'))) as day_name
    from generate_series(0, 5) i
  ),
  employee_dates as (
    select 
      e.id as employee_uuid,
      e.employee_id,
      e.name,
      e.email,
      wd.d as date,
      wd.day_name,
      e.second_saturday_off
    from public.hrm_employees e
    cross join week_days wd
    where e.employment_lifecycle_status = 'active'
      and wd.day_name = any(e.working_days)
      -- Skip second Saturday off
      and not (
        e.second_saturday_off = true 
        and extract(dow from wd.d) = 6
        and extract(day from wd.d) between 8 and 14
      )
      -- Skip public holidays
      and not exists (
        select 1 
        from public.hrm_holidays h 
        where h.date = wd.d
      )
  ),
  missing_checkins as (
    select 
      ed.employee_uuid,
      ed.employee_id,
      ed.name,
      ed.email,
      ed.date
    from employee_dates ed
    where not exists (
      select 1 
      from public.hrm_attendance a 
      where a.employee_id = ed.employee_uuid 
        and a.date = ed.date
        and a.check_in is not null
        and a.status in ('present', 'late', 'halfday')
    )
  ),
  missing_checkins_with_leave as (
    select 
      mc.employee_id,
      mc.name,
      mc.email,
      mc.date,
      coalesce(
        (
          select 
            case 
              when lr.status = 'approved' then 'On Leave (Approved)'
              when lr.status = 'pending' then 'On Leave (Pending)'
            end
          from public.hrm_leave_requests lr
          where lr.employee_id = mc.employee_uuid
            and lr.status in ('approved', 'pending')
            and mc.date between lr.start_date and lr.end_date
          order by case when lr.status = 'approved' then 1 else 2 end
          limit 1
        ),
        'Missing Check-in'
      ) as status
    from missing_checkins mc
  ),
  grouped_missing_attendance as (
    select 
      employee_id,
      name,
      email,
      jsonb_agg(jsonb_build_object('date', date, 'status', status) order by date) as dates
    from missing_checkins_with_leave
    group by employee_id, name, email
    order by employee_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id', employee_id,
    'name', name,
    'email', email,
    'dates', dates
  )), '[]'::jsonb)
  into v_missing_attendance
  from grouped_missing_attendance;

  -- 3. Fetch Missing Daily Work Logs (Monday to Saturday) grouped by employee with specific dates
  with week_days as (
    select (v_start_date + i)::date as d,
           lower(trim(to_char(v_start_date + i, 'Day'))) as day_name
    from generate_series(0, 5) i
  ),
  employee_dates as (
    select 
      e.id as employee_uuid,
      e.employee_id,
      e.name,
      e.email,
      wd.d as date,
      wd.day_name,
      e.second_saturday_off
    from public.hrm_employees e
    cross join week_days wd
    where e.employment_lifecycle_status = 'active'
      and wd.day_name = any(e.working_days)
      -- Skip second Saturday off
      and not (
        e.second_saturday_off = true 
        and extract(dow from wd.d) = 6
        and extract(day from wd.d) between 8 and 14
      )
      -- Skip public holidays
      and not exists (
        select 1 
        from public.hrm_holidays h 
        where h.date = wd.d
      )
  ),
  missing_logs as (
    select 
      ed.employee_uuid,
      ed.employee_id,
      ed.name,
      ed.email,
      ed.date
    from employee_dates ed
    where ed.employee_uuid not in (
      select distinct wl.employee_id
      from public.hrm_daily_work_logs wl
      where wl.log_date = ed.date
    )
  ),
  missing_logs_with_leave as (
    select 
      ml.employee_id,
      ml.name,
      ml.email,
      ml.date,
      coalesce(
        (
          select 
            case 
              when lr.status = 'approved' then 'On Leave (Approved)'
              when lr.status = 'pending' then 'On Leave (Pending)'
            end
          from public.hrm_leave_requests lr
          where lr.employee_id = ml.employee_uuid
            and lr.status in ('approved', 'pending')
            and ml.date between lr.start_date and lr.end_date
          order by case when lr.status = 'approved' then 1 else 2 end
          limit 1
        ),
        'Missing Log'
      ) as status
    from missing_logs ml
  ),
  grouped_missing_logs as (
    select 
      employee_id,
      name,
      email,
      jsonb_agg(jsonb_build_object('date', date, 'status', status) order by date) as dates
    from missing_logs_with_leave
    group by employee_id, name, email
    order by employee_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id', employee_id,
    'name', name,
    'email', email,
    'dates', dates
  )), '[]'::jsonb)
  into v_missing_work_logs
  from grouped_missing_logs;

  -- 4. Queue email for every active privileged account
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
      'daily_work_log_report', -- keep same allowed event type
      lower(v_recipient.email),
      jsonb_build_object(
        'report_type', 'weekly_summary',
        'report_date', v_end_date,
        'recipient_name', v_recipient.name,
        'week_start_date', v_start_date,
        'week_end_date', v_sat_date,
        'leaves_applied', v_leaves_applied,
        'missing_attendance', v_missing_attendance,
        'missing_work_logs', v_missing_work_logs
      ),
      concat('weekly_summary_report:', v_recipient.id::text, ':', v_end_date::text)
    )
    on conflict (dedupe_key) do nothing;
    
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 2. Schedule the pg_cron job (runs at 4:30 PM UTC = 10:00 PM IST every Sunday)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'weekly_summary_report_job') then
    perform cron.unschedule('weekly_summary_report_job');
  end if;
end
$$;

select cron.schedule(
  'weekly_summary_report_job',
  '30 16 * * 0',
  $$select public.generate_weekly_summary_report()$$
);

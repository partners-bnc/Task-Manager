-- 1. Unschedule the nightly auto-checkout pg_cron job
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'auto_checkout_attendance_10pm_ist') then
      perform cron.unschedule('auto_checkout_attendance_10pm_ist');
    end if;
  end if;
exception
  when others then
    null;
end $$;

-- 2. Drop the auto-checkout function
drop function if exists public.auto_checkout_open_attendance_rows();

-- 3. Update all existing records with check-in but missing check-out to status 'halfday'
update public.hrm_attendance
set status = 'halfday'
where check_in is not null
  and check_out is null
  and status != 'halfday';

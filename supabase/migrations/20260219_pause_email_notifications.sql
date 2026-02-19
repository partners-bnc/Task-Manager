-- Pause all automated email notifications until explicitly resumed.

-- 1) Stop scheduled dispatcher invocations.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'dispatch_email_outbox_every_minute') then
    perform cron.unschedule('dispatch_email_outbox_every_minute');
  end if;
end
$$;

-- 2) Stop task-assignment trigger-based enqueue.
drop trigger if exists trg_task_assignment_email_outbox on public.task_assignments;

-- 3) Stop due-email enqueue even if called manually.
create or replace function public.enqueue_due_task_emails()
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  return 0;
end;
$$;

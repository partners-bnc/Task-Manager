alter table public.tasks
add column if not exists progress_percentage integer not null default 0;

update public.tasks
set progress_percentage = 0
where progress_percentage is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_progress_percentage_range'
  ) then
    alter table public.tasks
    add constraint tasks_progress_percentage_range
    check (progress_percentage >= 0 and progress_percentage <= 100);
  end if;
end
$$;

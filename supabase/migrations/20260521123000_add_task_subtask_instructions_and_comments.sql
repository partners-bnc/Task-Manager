alter table public.task_comments
  add column if not exists subtask_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'task_comments_subtask_id_fkey'
  ) then
    alter table public.task_comments
      add constraint task_comments_subtask_id_fkey
      foreign key (subtask_id) references public.task_subtasks(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_task_comments_task_subtask_created
  on public.task_comments(task_id, subtask_id, created_at);

create table if not exists public.task_subtask_instructions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  subtask_id uuid not null references public.task_subtasks(id) on delete cascade,
  instruction_text text not null,
  sort_order integer not null default 0,
  created_by_employee_id uuid references public.hrm_employees(id) on delete set null,
  created_by_profile_id uuid references public.hrm_profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint task_subtask_instructions_text_not_blank
    check (length(btrim(instruction_text)) > 0)
);

create index if not exists idx_task_subtask_instructions_subtask_sort
  on public.task_subtask_instructions(task_id, subtask_id, sort_order, created_at);

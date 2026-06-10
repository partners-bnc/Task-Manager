-- Add 'urgent' to the tasks priority check constraint
alter table public.tasks
  drop constraint if exists tasks_priority_check;

alter table public.tasks
  add constraint tasks_priority_check
    check (priority = any (array['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]));

-- Add 'urgent' to the task_subtasks priority check constraint
alter table public.task_subtasks
  drop constraint if exists task_subtasks_priority_check;

alter table public.task_subtasks
  add constraint task_subtasks_priority_check
    check (priority = any (array['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]));

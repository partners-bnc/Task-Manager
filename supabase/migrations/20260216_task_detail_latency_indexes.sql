-- Task detail latency optimizations (index-backed access paths)
-- Speeds up task detail page reads for comments, attachments, and subtasks.

create index if not exists idx_task_attachments_task_uploaded
  on public.task_attachments(task_id, uploaded_at desc);

create index if not exists idx_task_subtasks_task_created
  on public.task_subtasks(task_id, created_at asc);

create index if not exists idx_task_comments_task_created
  on public.task_comments(task_id, created_at asc);

-- Task comments for admin + assigned employees

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_type text not null check (author_type in ('admin', 'employee')),
  author_name text not null,
  author_avatar_url text,
  employee_id uuid references public.employees(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  comment_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_comments_comment_text_not_blank check (length(btrim(comment_text)) > 0)
);

create index if not exists idx_task_comments_task_id_created_at
  on public.task_comments(task_id, created_at desc);

create or replace function public.handle_task_comments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_task_comments_updated_at on public.task_comments;
create trigger trg_task_comments_updated_at
before update on public.task_comments
for each row
execute function public.handle_task_comments_updated_at();

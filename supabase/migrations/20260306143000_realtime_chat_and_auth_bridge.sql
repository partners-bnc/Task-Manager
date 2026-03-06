-- Realtime direct messages + employee auth bridge
alter table public.employees
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists idx_employees_auth_user_id
  on public.employees(auth_user_id)
  where auth_user_id is not null;

create or replace function public.chat_current_actor_key()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid;
  employee_uuid uuid;
begin
  uid := auth.uid();

  if uid is null then
    return null;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = uid and p.role = 'admin'
  ) then
    return 'admin:' || uid::text;
  end if;

  select e.id into employee_uuid
  from public.employees e
  where e.auth_user_id = uid
  limit 1;

  if employee_uuid is not null then
    return 'employee:' || employee_uuid::text;
  end if;

  return null;
end;
$$;

grant execute on function public.chat_current_actor_key() to anon, authenticated, service_role;

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  thread_type text not null default 'dm' check (thread_type = 'dm'),
  participant_a_key text not null,
  participant_b_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint chat_threads_dm_pair_order check (participant_a_key < participant_b_key),
  constraint chat_threads_dm_pair_unique unique (thread_type, participant_a_key, participant_b_key)
);

create index if not exists idx_chat_threads_last_message_at
  on public.chat_threads(last_message_at desc nulls last, updated_at desc);

create table if not exists public.chat_thread_members (
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  member_key text not null,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (thread_id, member_key)
);

create index if not exists idx_chat_thread_members_member_key
  on public.chat_thread_members(member_key);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_key text not null,
  sender_name text not null,
  sender_avatar_url text,
  content text not null check (length(btrim(content)) > 0),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists idx_chat_messages_thread_created
  on public.chat_messages(thread_id, created_at desc);

create or replace function public.chat_touch_thread_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_chat_threads_updated_at on public.chat_threads;
create trigger trg_chat_threads_updated_at
before update on public.chat_threads
for each row
execute function public.chat_touch_thread_updated_at();

create or replace function public.chat_update_thread_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_threads
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists trg_chat_messages_thread_last_message on public.chat_messages;
create trigger trg_chat_messages_thread_last_message
after insert on public.chat_messages
for each row
execute function public.chat_update_thread_last_message();

alter table public.chat_threads enable row level security;
alter table public.chat_thread_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_threads_select_members" on public.chat_threads;
create policy "chat_threads_select_members"
  on public.chat_threads
  for select
  using (
    exists (
      select 1
      from public.chat_thread_members tm
      where tm.thread_id = chat_threads.id
        and tm.member_key = public.chat_current_actor_key()
    )
  );

drop policy if exists "chat_thread_members_select_self" on public.chat_thread_members;
create policy "chat_thread_members_select_self"
  on public.chat_thread_members
  for select
  using (
    member_key = public.chat_current_actor_key()
  );

drop policy if exists "chat_thread_members_update_self" on public.chat_thread_members;
create policy "chat_thread_members_update_self"
  on public.chat_thread_members
  for update
  using (member_key = public.chat_current_actor_key())
  with check (member_key = public.chat_current_actor_key());

drop policy if exists "chat_messages_select_members" on public.chat_messages;
create policy "chat_messages_select_members"
  on public.chat_messages
  for select
  using (
    exists (
      select 1
      from public.chat_thread_members tm
      where tm.thread_id = chat_messages.thread_id
        and tm.member_key = public.chat_current_actor_key()
    )
  );

drop policy if exists "chat_messages_insert_self" on public.chat_messages;
create policy "chat_messages_insert_self"
  on public.chat_messages
  for insert
  with check (
    sender_key = public.chat_current_actor_key()
    and exists (
      select 1
      from public.chat_thread_members tm
      where tm.thread_id = chat_messages.thread_id
        and tm.member_key = public.chat_current_actor_key()
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.chat_messages';
    exception
      when duplicate_object then
        null;
    end;
  end if;
end
$$;
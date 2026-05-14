alter table public.hrm_tickets
  add column if not exists module_key text,
  add column if not exists due_at timestamptz,
  add column if not exists late_at timestamptz,
  add column if not exists is_late boolean not null default false,
  add column if not exists is_sla_breached boolean not null default false,
  add column if not exists current_escalated_auth_user_id uuid,
  add column if not exists current_escalated_employee_id uuid references public.hrm_employees(id) on delete set null,
  add column if not exists current_escalated_role text check (current_escalated_role in ('employee', 'hr_admin', 'super_admin')),
  add column if not exists escalated_at timestamptz;

update public.hrm_tickets
set
  module_key = coalesce(nullif(module_key, ''), 'hrm'),
  late_at = coalesce(late_at, created_at + interval '24 hours'),
  due_at = coalesce(due_at, created_at + interval '72 hours'),
  is_late = coalesce(is_late, false) or (
    coalesce(closed_at, resolved_at, timezone('utc', now())) > coalesce(late_at, created_at + interval '24 hours')
    and status not in ('closed')
  ),
  is_sla_breached = coalesce(is_sla_breached, false) or (
    coalesce(closed_at, resolved_at, timezone('utc', now())) > coalesce(due_at, created_at + interval '72 hours')
    and status not in ('closed')
  )
where
  module_key is null
  or late_at is null
  or due_at is null;

alter table public.hrm_tickets
  alter column module_key set default 'hrm';

update public.hrm_tickets
set module_key = 'hrm'
where module_key is null or btrim(module_key) = '';

alter table public.hrm_tickets
  alter column module_key set not null;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'hrm_tickets'
      and constraint_name = 'hrm_tickets_module_key_check'
  ) then
    alter table public.hrm_tickets drop constraint hrm_tickets_module_key_check;
  end if;
end $$;

alter table public.hrm_tickets
  add constraint hrm_tickets_module_key_check
  check (module_key in ('hrm', 'task_manager'));

create table if not exists public.hrm_ticket_escalations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.hrm_tickets(id) on delete cascade,
  from_auth_user_id uuid,
  from_employee_id uuid references public.hrm_employees(id) on delete set null,
  from_role text check (from_role in ('employee', 'hr_admin', 'super_admin')),
  to_auth_user_id uuid not null,
  to_employee_id uuid references public.hrm_employees(id) on delete set null,
  to_role text not null check (to_role in ('employee', 'hr_admin', 'super_admin')),
  escalated_by_auth_user_id uuid not null,
  escalated_by_employee_id uuid references public.hrm_employees(id) on delete set null,
  escalated_by_role text not null check (escalated_by_role in ('employee', 'hr_admin', 'super_admin')),
  escalation_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists hrm_tickets_module_key_idx
  on public.hrm_tickets(module_key, last_activity_at desc);

create index if not exists hrm_tickets_module_status_idx
  on public.hrm_tickets(module_key, status, last_activity_at desc);

create index if not exists hrm_tickets_late_idx
  on public.hrm_tickets(module_key, is_late, is_sla_breached);

create index if not exists hrm_ticket_escalations_ticket_idx
  on public.hrm_ticket_escalations(ticket_id, created_at asc);

alter table public.privileged_accounts
  drop column if exists phone,
  drop column if exists sr_no;

insert into public.privileged_accounts (
  email,
  name,
  role,
  status,
  designation,
  password_hash,
  created_at,
  updated_at
)
values (
  'support.bncglobal@gmail.com',
  'It Support',
  'support',
  'Active',
  'IT Support',
  crypt('support@bnc123', gen_salt('bf')),
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (email) do update
set
  name = excluded.name,
  role = excluded.role,
  status = excluded.status,
  designation = excluded.designation,
  password_hash = excluded.password_hash,
  updated_at = timezone('utc', now());

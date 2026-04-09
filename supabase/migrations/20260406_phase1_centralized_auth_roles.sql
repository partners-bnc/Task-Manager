alter table public.profiles
drop constraint if exists profiles_role_check;

update public.profiles
set role = 'hr_admin'
where role = 'admin';

alter table public.profiles
add constraint profiles_role_check
check (role in ('super_admin', 'hr_admin', 'employee'));

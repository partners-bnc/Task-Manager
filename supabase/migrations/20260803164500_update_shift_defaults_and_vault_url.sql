-- 1. Update the vault secret for app_base_url to the new domain
select vault.update_secret(id, 'https://universeone.bncglobal.in/login')
from vault.decrypted_secrets
where name = 'app_base_url';

-- 2. Alter the hrm_employees table column defaults for working hours to match 9:00 AM to 5:30 PM shift
alter table public.hrm_employees
  alter column working_hours_start set default '09:00'::time,
  alter column working_hours_end set default '17:30'::time;

-- 3. Update existing active employees who have the old 10:00 AM to 7:00 PM shift to the new 9:00 AM to 5:30 PM shift
update public.hrm_employees
set
  working_hours_start = '09:00'::time,
  working_hours_end = '17:30'::time
where working_hours_start = '10:00'::time
  and working_hours_end = '19:00'::time;

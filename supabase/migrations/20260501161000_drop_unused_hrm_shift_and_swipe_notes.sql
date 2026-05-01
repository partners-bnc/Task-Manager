alter table if exists public.hrm_attendance_swipes
  drop column if exists notes;

drop index if exists public.employees_shift_id_idx;
drop index if exists public.hrm_employees_shift_id_idx;

alter table if exists public.hrm_employees
  drop constraint if exists hrm_employees_shift_id_fkey;

alter table if exists public.hrm_employees
  drop constraint if exists employees_shift_id_fkey;

alter table if exists public.hrm_employees
  drop column if exists shift_id;

alter table if exists public.hrm_employee_profiles
  drop constraint if exists hrm_employee_profiles_shift_id_fkey;

alter table if exists public.hrm_employee_profiles
  drop column if exists shift_id;

alter table if exists public.hrm_attendance
  drop constraint if exists hrm_attendance_shift_id_fkey;

alter table if exists public.hrm_attendance
  drop column if exists shift_id;

drop table if exists public.hrm_shifts;

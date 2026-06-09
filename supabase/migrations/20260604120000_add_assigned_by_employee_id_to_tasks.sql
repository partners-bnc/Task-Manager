-- Add assigned_by_employee_id to tasks table
-- This stores who explicitly assigned the task (can differ from the session creator)

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_by_employee_id uuid
    REFERENCES public.hrm_employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by_employee_id
  ON public.tasks (assigned_by_employee_id);

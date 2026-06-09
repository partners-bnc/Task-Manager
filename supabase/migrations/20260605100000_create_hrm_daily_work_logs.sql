-- Daily Work Log table
-- One row per work entry per employee per day
-- Filled during checkout, multiple entries allowed per day

CREATE TABLE IF NOT EXISTS public.hrm_daily_work_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid NOT NULL REFERENCES public.hrm_employees(id) ON DELETE CASCADE,
  log_date            date NOT NULL,
  client_name         text NOT NULL,
  task_id             uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  task_name_snapshot  text,
  hours_spent         numeric(4,2) NOT NULL CHECK (hours_spent > 0 AND hours_spent <= 24),
  remarks             text,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hrm_daily_work_logs_employee_date
  ON public.hrm_daily_work_logs (employee_id, log_date DESC);

CREATE OR REPLACE FUNCTION public.hrm_daily_work_logs_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_hrm_daily_work_logs_updated_at
  BEFORE UPDATE ON public.hrm_daily_work_logs
  FOR EACH ROW EXECUTE FUNCTION public.hrm_daily_work_logs_set_updated_at();

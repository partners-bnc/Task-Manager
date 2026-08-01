-- Add vendor module access columns to hrm_module_access
ALTER TABLE public.hrm_module_access ADD COLUMN IF NOT EXISTS vendor BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.hrm_module_access ADD COLUMN IF NOT EXISTS vendor_role TEXT CHECK (vendor_role IN ('admin','member','viewer')) DEFAULT 'viewer';

-- Create vendor payments table
CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type      TEXT NOT NULL CHECK (payment_type IN ('vendor_payment', 'full_and_final')),
  vendor_name       TEXT NOT NULL,
  nature_of_payment TEXT NOT NULL,
  amount            NUMERIC(15, 2) NOT NULL,
  invoice_date      DATE NOT NULL,
  payment_status    TEXT NOT NULL CHECK (payment_status IN ('invoice_uploaded', 'approved', 'paid')) DEFAULT 'invoice_uploaded',
  created_by_id     UUID REFERENCES public.hrm_employees(id) ON DELETE SET NULL,
  created_by_name   TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create vendor payment documents table
CREATE TABLE IF NOT EXISTS public.vendor_payment_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        UUID NOT NULL REFERENCES public.vendor_payments(id) ON DELETE CASCADE,
  file_name         TEXT NOT NULL,
  file_path         TEXT NOT NULL,
  file_url          TEXT NOT NULL,
  file_size         INT,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) and define access control helper
CREATE OR REPLACE FUNCTION public.vendor_has_module_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hrm_profiles p
    WHERE p.id = auth.uid()
      AND LOWER(COALESCE(p.role, '')) IN ('admin', 'hr_admin', 'super_admin')
  ) OR EXISTS (
    SELECT 1
    FROM public.hrm_employees e
    JOIN public.hrm_module_access ma ON ma.employee_id = e.id
    WHERE e.auth_user_id = auth.uid()
      AND COALESCE(ma.vendor, FALSE) = TRUE
  );
$$;

-- Enable RLS
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payment_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS vendor_payments_all ON public.vendor_payments;
DROP POLICY IF EXISTS vendor_payment_documents_all ON public.vendor_payment_documents;

-- Create policies
CREATE POLICY vendor_payments_all ON public.vendor_payments
  FOR ALL USING (public.vendor_has_module_access()) WITH CHECK (public.vendor_has_module_access());

CREATE POLICY vendor_payment_documents_all ON public.vendor_payment_documents
  FOR ALL USING (public.vendor_has_module_access()) WITH CHECK (public.vendor_has_module_access());

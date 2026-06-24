-- Create hrm_certificates table
CREATE TABLE IF NOT EXISTS "public"."hrm_certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "certificate_id" "text" NOT NULL,
    "employee_id" "uuid", -- Links to hrm_employees if selected from directory
    "recipient_name" "text" NOT NULL,
    "recipient_employee_id" "text" NOT NULL,
    "designation" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "issued_by" "uuid", -- Links to the admin profile who issued it
    CONSTRAINT "hrm_certificates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hrm_certificates_certificate_id_key" UNIQUE ("certificate_id"),
    CONSTRAINT "hrm_certificates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hrm_employees"("id") ON DELETE SET NULL,
    CONSTRAINT "hrm_certificates_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."hrm_profiles"("id") ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE "public"."hrm_certificates" ENABLE ROW LEVEL SECURITY;

-- Allow public read access to verify certificates via the QR code / ID
CREATE POLICY "Allow public select on certificates" ON "public"."hrm_certificates"
    FOR SELECT USING (true);

-- Allow HR Admins to manage certificates
CREATE POLICY "Allow admins to manage certificates" ON "public"."hrm_certificates"
    FOR ALL TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());

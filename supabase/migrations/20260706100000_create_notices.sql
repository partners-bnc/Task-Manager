-- Create hrm_notices table
CREATE TABLE IF NOT EXISTS "public"."hrm_notices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "content_format" "text" DEFAULT 'text' NOT NULL, -- 'text' or 'html'
    "bg_color" "text" DEFAULT '#ffffff' NOT NULL,
    "text_color" "text" DEFAULT '#0f172a' NOT NULL,
    "primary_color" "text" DEFAULT '#4f46e5' NOT NULL,
    "border_color" "text" DEFAULT '#e2e8f0' NOT NULL,
    "title_size" "text" DEFAULT '24px' NOT NULL,
    "content_size" "text" DEFAULT '16px' NOT NULL,
    "content_bold" boolean DEFAULT false NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "target_audience" "text" DEFAULT 'all' NOT NULL, -- 'all', 'admin', 'employee'
    "display_frequency" "text" DEFAULT 'always' NOT NULL, -- 'always' or 'once_per_day'
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "hrm_notices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hrm_notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hrm_profiles"("id") ON DELETE SET NULL,
    CONSTRAINT "hrm_notices_content_format_check" CHECK (("content_format" = ANY (ARRAY['text'::"text", 'html'::"text"]))),
    CONSTRAINT "hrm_notices_target_audience_check" CHECK (("target_audience" = ANY (ARRAY['all'::"text", 'admin'::"text", 'employee'::"text"]))),
    CONSTRAINT "hrm_notices_display_frequency_check" CHECK (("display_frequency" = ANY (ARRAY['always'::"text", 'once_per_day'::"text"])))
);

-- Enable RLS
ALTER TABLE "public"."hrm_notices" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select active notices
CREATE POLICY "Allow authenticated users to read notices" ON "public"."hrm_notices"
    FOR SELECT TO "authenticated" USING (true);

-- Allow HR Admins to perform all actions
CREATE POLICY "Allow admins to manage notices" ON "public"."hrm_notices"
    FOR ALL TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());

-- Index for fetching active notices quickly
CREATE INDEX IF NOT EXISTS "hrm_notices_active_idx" ON "public"."hrm_notices" ("is_active", "start_time", "end_time");

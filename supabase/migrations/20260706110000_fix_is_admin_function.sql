-- Redefine public.is_admin() to query the renamed public.hrm_profiles table 
-- and check for the correct hr_admin and super_admin roles.
CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists (
    select 1
    from public.hrm_profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'hr_admin')
  );
$$;

ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";

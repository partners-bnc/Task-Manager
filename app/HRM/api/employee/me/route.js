import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authContext = await resolveAuthenticatedUserContext(supabase, user);

    if (authContext?.accountType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employeeId =
      authContext.employee?.id ||
      user.user_metadata?.employee_uuid ||
      null;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee identity is not linked yet' }, { status: 404 });
    }

    const { data: employee, error } = await adminClient
      .from('hrm_employees')
      .select(`
        id,
        employee_id,
        name,
        email,
        role,
        profile_picture_url,
        phone,
        personal_email,
        date_of_joining,
        employee_type,
        employee_status,
        employment_lifecycle_status,
        current_stage,
        current_company_experience,
        working_schedule_label,
        working_days,
        second_saturday_off,
        address,
        nationality,
        marital_status,
        location,
        module_access:hrm_module_access!module_access_employee_id_fkey (
          task_manager
        ),
        department:hrm_departments (id, name),
        designation:hrm_designations (id, title),
        shift:hrm_shifts (id, name, start_time, end_time)
      `)
      .eq('id', employeeId)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee }, { status: 200 });
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch employee profile' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { getCurrentDateInTimeZone, mapSwipeForUi } from '@/utils/attendance';

async function requireEmployeeContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  if (authContext?.accountType !== 'employee' || !authContext.employee?.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    employeeId: authContext.employee.id,
    employeeCode: authContext.employee.employee_id || '',
  };
}

export async function GET(request) {
  try {
    const employeeContext = await requireEmployeeContext();
    if (employeeContext.error) {
      return employeeContext.error;
    }

    const date = request.nextUrl.searchParams.get('date') || getCurrentDateInTimeZone();
    const { data: swipes, error } = await adminClient
      .from('hrm_attendance_swipes')
      .select('*')
      .eq('employee_id', employeeContext.employeeId)
      .eq('swipe_date', date)
      .order('swipe_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load swipes' }, { status: 500 });
    }

    return NextResponse.json(
      {
        date,
        employeeId: employeeContext.employeeCode,
        swipes: (swipes || []).map(mapSwipeForUi),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading swipes:', error);
    return NextResponse.json({ error: error.message || 'Failed to load swipes' }, { status: 500 });
  }
}

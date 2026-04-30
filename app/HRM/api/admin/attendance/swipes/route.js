import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { mapSwipeForUi } from '@/utils/attendance';

async function requireHrAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  if (!authContext?.isHrAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { authContext };
}

export async function GET(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const employeeId = String(request.nextUrl.searchParams.get('employeeId') || '').trim();
    const date = String(request.nextUrl.searchParams.get('date') || '').trim();

    if (!employeeId || !date) {
      return NextResponse.json({ error: 'Employee and date are required.' }, { status: 400 });
    }

    const { data: swipes, error } = await adminClient
      .from('hrm_attendance_swipes')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('swipe_date', date)
      .order('swipe_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load swipe history' }, { status: 500 });
    }

    return NextResponse.json(
      {
        employeeId,
        date,
        swipes: (swipes || []).map(mapSwipeForUi),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading admin attendance swipes:', error);
    return NextResponse.json({ error: error.message || 'Failed to load swipe history' }, { status: 500 });
  }
}

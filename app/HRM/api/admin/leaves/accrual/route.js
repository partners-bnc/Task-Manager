import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { getEmployeeLeaveContext, syncEmployeeLeaveBalances } from '@/utils/leave';

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

export async function POST() {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const { data: employees, error } = await adminClient
      .from('hrm_employees')
      .select('id')
      .eq('employment_lifecycle_status', 'active');

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load employees for leave accrual' }, { status: 500 });
    }

    for (const employeeRow of employees || []) {
      const employee = await getEmployeeLeaveContext(employeeRow.id);
      await syncEmployeeLeaveBalances(employee);
    }

    return NextResponse.json({ message: 'Leave accrual synced successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Error syncing leave accrual:', error);
    if (String(error?.message || '').includes('Leave schema update is pending')) {
      return NextResponse.json(
        { error: 'Leave schema update is pending. Please apply the latest migration first.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to sync leave accrual' }, { status: 500 });
  }
}

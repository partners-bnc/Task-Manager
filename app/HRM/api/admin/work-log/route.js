import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { getCurrentDateInTimeZone } from '@/utils/attendance';

const isSuperAdminEntity = (emp) => {
  if (!emp) return false;
  if (emp.email && ['summit@bncglobal.in', 'gurvinder@bncglobal.in'].includes(emp.email.toLowerCase().trim())) {
    return true;
  }
  if (emp.employee_id) {
    const empIdUpper = String(emp.employee_id).toUpperCase().trim();
    if (empIdUpper.startsWith('SA-') || empIdUpper.startsWith('SA0') || ['SA01', 'SA02', 'SA-01', 'SA-02'].includes(empIdUpper)) {
      return true;
    }
  }
  return false;
};

async function requireAdminAccess() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  // Allow if HR Admin, Super Admin, or Support role
  const isAuthorized = authContext?.isHrAdmin || authContext?.isSuperAdmin || authContext?.accountType === 'support';
  if (!isAuthorized) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { authContext };
}

export async function GET(request) {
  try {
    const auth = await requireAdminAccess();
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const mode = String(url.searchParams.get('mode') || 'daily').toLowerCase();
    const selectedDate = url.searchParams.get('date') || getCurrentDateInTimeZone();
    const employeeId = url.searchParams.get('employeeId') || '';

    // Load active employees list for selection dropdown
    const { data: employees, error: empError } = await adminClient
      .from('hrm_employees')
      .select('id, name, employee_id, email')
      .order('name', { ascending: true });

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    const employeeOptions = (employees || [])
      .filter(emp => !isSuperAdminEntity(emp))
      .map(emp => ({
        id: emp.id,
        employeeId: emp.employee_id || '',
        name: emp.name || 'Employee',
        email: emp.email || ''
      }));

    if (mode === 'individual') {
      if (!employeeId) {
        return NextResponse.json({
          mode: 'individual',
          employeeOptions,
          logs: [],
          selectedEmployeeId: ''
        });
      }

      // Fetch all work logs for selected employee
      const { data: logs, error: logsError } = await adminClient
        .from('hrm_daily_work_logs')
        .select('id, log_date, client_name, task_id, task_name_snapshot, hours_spent, remarks, created_at')
        .eq('employee_id', employeeId)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: true });

      if (logsError) {
        return NextResponse.json({ error: logsError.message }, { status: 500 });
      }

      const selectedEmployee = employeeOptions.find(emp => emp.id === employeeId);

      return NextResponse.json({
        mode: 'individual',
        employeeOptions,
        selectedEmployee,
        logs: logs || []
      });
    }

    if (mode === 'report') {
      const startDate = url.searchParams.get('startDate') || getCurrentDateInTimeZone();
      const endDate = url.searchParams.get('endDate') || getCurrentDateInTimeZone();

      // Fetch all work logs for the selected date range
      const { data: logs, error: logsError } = await adminClient
        .from('hrm_daily_work_logs')
        .select('id, employee_id, log_date, client_name, task_id, task_name_snapshot, hours_spent, remarks, created_at')
        .gte('log_date', startDate)
        .lte('log_date', endDate)
        .order('log_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (logsError) {
        return NextResponse.json({ error: logsError.message }, { status: 500 });
      }

      return NextResponse.json({
        mode: 'report',
        startDate,
        endDate,
        employeeOptions,
        logs: logs || []
      });
    }

    // Default mode: daily (All employees on a selected date)
    const { data: workLogs, error: workLogsError } = await adminClient
      .from('hrm_daily_work_logs')
      .select('id, employee_id, client_name, task_id, task_name_snapshot, hours_spent, remarks, created_at')
      .eq('log_date', selectedDate)
      .order('created_at', { ascending: true });

    if (workLogsError) {
      return NextResponse.json({ error: workLogsError.message }, { status: 500 });
    }

    // Map logs to all active employees to see who submitted and who didn't
    const mappedLogs = employeeOptions.map(emp => {
      const empLogs = (workLogs || []).filter(log => log.employee_id === emp.id);
      const totalHours = empLogs.reduce((sum, current) => sum + Number(current.hours_spent || 0), 0);
      return {
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        employeeName: emp.name,
        employeeEmail: emp.email,
        logs: empLogs,
        totalHours: Math.round(totalHours * 100) / 100
      };
    });

    return NextResponse.json({
      mode: 'daily',
      date: selectedDate,
      employeeOptions,
      rows: mappedLogs
    });

  } catch (err) {
    console.error('Error in GET /HRM/api/admin/work-log:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

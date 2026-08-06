import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext, hasLinkedEmployeeAccess } from '@/utils/auth/context';
import { getCurrentDateInTimeZone } from '@/utils/attendance';
import { deriveEmploymentFields } from '@/utils/hrm-employment';

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

async function requireEmployeeContext() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  if (!hasLinkedEmployeeAccess(authContext)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { employeeId: authContext.employee.id };
}

export async function GET(request) {
  try {
    const ctx = await requireEmployeeContext();
    if (ctx.error) return ctx.error;

    const managerId = ctx.employeeId;

    const url = new URL(request.url);
    const mode = String(url.searchParams.get('mode') || 'daily').toLowerCase();
    const selectedDate = url.searchParams.get('date') || getCurrentDateInTimeZone();
    const employeeId = url.searchParams.get('employeeId') || '';
    const startDate = url.searchParams.get('startDate') || selectedDate;
    const endDate = url.searchParams.get('endDate') || selectedDate;

    // Load active employees list for this manager
    const { data: employees, error: empError } = await adminClient
      .from('hrm_employees')
      .select('id, name, employee_id, email, employee_status, employment_lifecycle_status, separated_at')
      .eq('reporting_manager_id', managerId)
      .order('name', { ascending: true });

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    const employeeOptions = (employees || [])
      .filter(emp => !isSuperAdminEntity(emp))
      .filter(emp => {
        const empFields = deriveEmploymentFields(emp);
        if (empFields.employmentLifecycleStatus === 'active') {
          return true;
        }
        if (empFields.employmentLifecycleStatus === 'separated') {
          const separationDate = emp.separated_at;
          if (separationDate) {
            const sepDateStr = separationDate.slice(0, 10);
            if (mode === 'daily') {
              return selectedDate <= sepDateStr;
            } else if (mode === 'report') {
              return sepDateStr >= startDate;
            } else if (mode === 'individual') {
              return true;
            }
          }
        }
        return false;
      })
      .map(emp => ({
        id: emp.id,
        employeeId: emp.employee_id || '',
        name: emp.name || 'Employee',
        email: emp.email || ''
      }));

    const teamEmployeeIds = employeeOptions.map(emp => emp.id);

    if (mode === 'individual') {
      if (!employeeId) {
        return NextResponse.json({
          mode: 'individual',
          employeeOptions,
          logs: [],
          selectedEmployeeId: ''
        });
      }

      // Check access permission: selected employee must belong to this manager's team
      if (!teamEmployeeIds.includes(employeeId)) {
        return NextResponse.json({ error: 'Access denied: Employee not in your team' }, { status: 403 });
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
      if (teamEmployeeIds.length === 0) {
        return NextResponse.json({
          mode: 'report',
          startDate,
          endDate,
          employeeOptions,
          logs: []
        });
      }

      // Fetch all work logs for the team within selected date range
      const { data: logs, error: logsError } = await adminClient
        .from('hrm_daily_work_logs')
        .select('id, employee_id, log_date, client_name, task_id, task_name_snapshot, hours_spent, remarks, created_at')
        .in('employee_id', teamEmployeeIds)
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

    // Default mode: daily
    if (teamEmployeeIds.length === 0) {
      return NextResponse.json({
        mode: 'daily',
        date: selectedDate,
        employeeOptions,
        rows: []
      });
    }

    const { data: workLogs, error: workLogsError } = await adminClient
      .from('hrm_daily_work_logs')
      .select('id, employee_id, client_name, task_id, task_name_snapshot, hours_spent, remarks, created_at')
      .in('employee_id', teamEmployeeIds)
      .eq('log_date', selectedDate)
      .order('created_at', { ascending: true });

    if (workLogsError) {
      return NextResponse.json({ error: workLogsError.message }, { status: 500 });
    }

    // Map logs to all team employees
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
    console.error('Error in GET /HRM/api/employee/team-work-log:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

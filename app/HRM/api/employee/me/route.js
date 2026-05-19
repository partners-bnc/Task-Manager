import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { deriveEmploymentFields } from '@/utils/hrm-employment';

const EMPLOYEE_PROFILE_SELECT_BASE = `
  id,
  employee_id,
  name,
  email,
  role,
  profile_picture_url,
  phone,
  personal_email,
  date_of_joining,
  employee_status,
  experience_company_name,
  total_experience,
  working_schedule_label,
  working_days,
  second_saturday_off,
  address,
  nationality,
  marital_status,
  reporting_manager_id,
  module_access:hrm_module_access!module_access_employee_id_fkey (
    task_manager,
    hrm_admin,
    auditing,
    crm
  ),
  department:hrm_departments (id, name),
  designation:hrm_designations (id, title)
`;

const EMPLOYEE_PROFILE_SELECT_WITH_SALARY = `
  ${EMPLOYEE_PROFILE_SELECT_BASE},
  salary
`;

const EMPLOYEE_PROFILE_SELECT_WITH_EMPLOYMENT_FIELDS = `
  ${EMPLOYEE_PROFILE_SELECT_WITH_SALARY},
  employee_type,
  employment_lifecycle_status,
  current_stage,
  probation_started_at,
  probation_ends_at,
  notice_started_at,
  notice_ends_at,
  separated_at,
  separation_reason,
  separation_reason_code,
  access_disabled_at
`;

function isMissingEmploymentColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('employee_type') ||
    message.includes('employment_lifecycle_status') ||
    message.includes('current_stage') ||
    message.includes('probation_started_at') ||
    message.includes('probation_ends_at') ||
    message.includes('notice_started_at') ||
    message.includes('notice_ends_at') ||
    message.includes('separated_at') ||
    message.includes('separation_reason') ||
    message.includes('separation_reason_code') ||
    message.includes('access_disabled_at') ||
    message.includes('could not find the column') ||
    (message.includes('column') && message.includes('does not exist'))
  );
}

function isMissingSalaryColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('salary') &&
    (message.includes('could not find the column') || (message.includes('column') && message.includes('does not exist')))
  );
}

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

    if (!hasLinkedEmployeeAccess(authContext)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employeeId =
      authContext.employee?.id ||
      user.user_metadata?.employee_uuid ||
      null;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee identity is not linked yet' }, { status: 404 });
    }

    let employeeResult = await adminClient
      .from('hrm_employees')
      .select(EMPLOYEE_PROFILE_SELECT_WITH_EMPLOYMENT_FIELDS)
      .eq('id', employeeId)
      .single();

    if (employeeResult.error && isMissingEmploymentColumnError(employeeResult.error)) {
      employeeResult = await adminClient
        .from('hrm_employees')
        .select(EMPLOYEE_PROFILE_SELECT_WITH_SALARY)
        .eq('id', employeeId)
        .single();
    }

    if (employeeResult.error && isMissingSalaryColumnError(employeeResult.error)) {
      employeeResult = await adminClient
        .from('hrm_employees')
        .select(EMPLOYEE_PROFILE_SELECT_BASE)
        .eq('id', employeeId)
        .single();
    }

    const { data: employee, error } = employeeResult;

    if (error || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const moduleAccess = Array.isArray(employee.module_access)
      ? employee.module_access[0]
      : employee.module_access;

    if (!moduleAccess?.hrm_admin) {
      return NextResponse.json(
        { error: 'HRM access is not enabled for your account.' },
        { status: 403 }
      );
    }

    let reportingManagerName = '';
    let reportingManagerEmployeeId = '';

    if (employee.reporting_manager_id) {
      const { data: reportingManager } = await adminClient
        .from('hrm_employees')
        .select('id, name, employee_id')
        .eq('id', employee.reporting_manager_id)
        .maybeSingle();

      reportingManagerName = reportingManager?.name || '';
      reportingManagerEmployeeId = reportingManager?.employee_id || '';
    }

    const employment = deriveEmploymentFields(employee);

    return NextResponse.json(
      {
        employee: {
          ...employee,
          reporting_manager_name: reportingManagerName,
          reporting_manager_employee_id: reportingManagerEmployeeId,
          directory_reporting_manager: reportingManagerName,
          employee_type: employee.employee_type ?? employment.employeeType,
          employment_lifecycle_status:
            employee.employment_lifecycle_status ?? employment.employmentLifecycleStatus,
          current_stage: employee.current_stage ?? employment.currentStage,
          resolved_employee_type: employment.employeeType,
          resolved_employment_lifecycle_status: employment.employmentLifecycleStatus,
          resolved_current_stage: employment.currentStage,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch employee profile' }, { status: 500 });
  }
}

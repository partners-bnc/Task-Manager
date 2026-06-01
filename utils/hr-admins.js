import { adminClient } from '@/utils/supabase/admin';

const EMPLOYEE_DASHBOARD_SELECT_BASE = `
  id,
  auth_user_id,
  employee_id,
  name,
  email,
  role,
  created_at,
  date_of_birth,
  date_of_joining,
  employee_status,
  state,
  mobile_phone,
  phone,
  experience_company_name,
  total_experience,
  created_by,
  profile_picture_url,
  department:hrm_departments (id, name),
  designation:hrm_designations (id, title)
`;

const EMPLOYEE_DASHBOARD_SELECT_OPTIONAL_FIELDS = `
  ${EMPLOYEE_DASHBOARD_SELECT_BASE},
  gender,
  salary
`;

const EMPLOYEE_DASHBOARD_SELECT_WITH_SALARY = `
  ${EMPLOYEE_DASHBOARD_SELECT_BASE},
  salary
`;

const EMPLOYEE_DASHBOARD_SELECT_WITH_GENDER = `
  ${EMPLOYEE_DASHBOARD_SELECT_BASE},
  gender
`;

const EMPLOYEE_DASHBOARD_SELECT_WITH_EMPLOYMENT_FIELDS = `
  ${EMPLOYEE_DASHBOARD_SELECT_OPTIONAL_FIELDS},
  employee_type,
  employment_lifecycle_status,
  current_stage,
  probation_ends_at,
  notice_started_at,
  notice_ends_at,
  separated_at
`;

const HR_ADMIN_SELECT = `
  id,
  auth_user_id,
  email,
  name,
  role,
  status,
  created_at,
  updated_at,
  department:hrm_departments (
    id,
    name
  ),
  designation:hrm_designations (
    id,
    title
  )
`;

export async function findHrAdminByAuthUserId(authUserId) {
  if (!authUserId) return null;

  const { data, error } = await adminClient
    .from('privileged_accounts')
    .select(HR_ADMIN_SELECT)
    .eq('role', 'hr_admin')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load HR admin');
  }

  return data || null;
}

export async function getHrAdminDashboardData() {
  const loadEmployeesForDashboard = async () => {
    const selectAttempts = [
      EMPLOYEE_DASHBOARD_SELECT_WITH_EMPLOYMENT_FIELDS,
      `
        ${EMPLOYEE_DASHBOARD_SELECT_WITH_SALARY},
        employee_type,
        employment_lifecycle_status,
        current_stage,
        probation_ends_at,
        notice_started_at,
        notice_ends_at,
        separated_at
      `,
      `
        ${EMPLOYEE_DASHBOARD_SELECT_WITH_GENDER},
        employee_type,
        employment_lifecycle_status,
        current_stage,
        probation_ends_at,
        notice_started_at,
        notice_ends_at,
        separated_at
      `,
      `
        ${EMPLOYEE_DASHBOARD_SELECT_BASE},
        employee_type,
        employment_lifecycle_status,
        current_stage,
        probation_ends_at,
        notice_started_at,
        notice_ends_at,
        separated_at
      `,
      EMPLOYEE_DASHBOARD_SELECT_OPTIONAL_FIELDS,
      EMPLOYEE_DASHBOARD_SELECT_WITH_SALARY,
      EMPLOYEE_DASHBOARD_SELECT_WITH_GENDER,
      EMPLOYEE_DASHBOARD_SELECT_BASE,
    ];

    let lastResult = null;

    for (const selectClause of selectAttempts) {
      const result = await adminClient
        .from('hrm_employees')
        .select(selectClause)
        .order('created_at', { ascending: false });

      if (!result.error) {
        return result;
      }

      lastResult = result;
      const message = String(result.error.message || '').toLowerCase();
      const isMissingColumnError =
        message.includes('could not find the column') ||
        (message.includes('column') && message.includes('does not exist'));

      if (!isMissingColumnError) {
        return result;
      }
    }

    return lastResult;
  };

  const [hrAdminsResult, employeesResult, departmentsResult, designationsResult, profilesResult] = await Promise.all([
    adminClient
      .from('privileged_accounts')
      .select(HR_ADMIN_SELECT)
      .eq('role', 'hr_admin')
      .order('name', { ascending: true }),
    loadEmployeesForDashboard(),
    adminClient
      .from('hrm_departments')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    adminClient
      .from('hrm_designations')
      .select('id, title, department_id')
      .eq('is_active', true)
      .order('title', { ascending: true }),
    adminClient
      .from('hrm_profiles')
      .select('id, full_name'),
  ]);

  if (hrAdminsResult.error) {
    throw new Error(hrAdminsResult.error.message || 'Failed to load HR admins');
  }
  if (employeesResult.error) {
    throw new Error(employeesResult.error.message || 'Failed to load employees');
  }
  if (departmentsResult.error) {
    throw new Error(departmentsResult.error.message || 'Failed to load departments');
  }
  if (designationsResult.error) {
    throw new Error(designationsResult.error.message || 'Failed to load designations');
  }
  if (profilesResult.error) {
    throw new Error(profilesResult.error.message || 'Failed to load creator profiles');
  }

  const hrAdmins = hrAdminsResult.data || [];
  const profiles = profilesResult.data || [];
  const hrAdminUserIds = new Set(hrAdmins.map((row) => row.auth_user_id).filter(Boolean));
  const hrAdminEmails = new Set(hrAdmins.map((row) => String(row.email || '').toLowerCase()).filter(Boolean));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile.full_name || '']));

  const employees = (employeesResult.data || [])
    .filter((employee) => {
      const normalizedEmail = String(employee.email || '').toLowerCase();
      return !hrAdminUserIds.has(employee.auth_user_id) && !hrAdminEmails.has(normalizedEmail);
    })
    .map((employee) => ({
      ...employee,
      created_by_name: profileMap.get(employee.created_by) || '',
    }));

  return {
    hrAdmins,
    employees,
    departments: departmentsResult.data || [],
    designations: designationsResult.data || [],
  };
}

function isMissingEmploymentColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('employee_type') ||
    message.includes('employment_lifecycle_status') ||
    message.includes('current_stage') ||
    message.includes('probation_ends_at') ||
    message.includes('notice_started_at') ||
    message.includes('notice_ends_at') ||
    message.includes('separated_at') ||
    message.includes('could not find the column') ||
    (message.includes('column') && message.includes('does not exist'))
  );
}

async function loadEmployeeStateRowsForDashboard() {
  const withEmploymentFields = await adminClient
    .from('hrm_employees')
    .select(
      'id, auth_user_id, employee_id, name, email, profile_picture_url, date_of_birth, employee_status, employee_type, employment_lifecycle_status, current_stage'
      + ', date_of_joining, probation_ends_at, notice_started_at, notice_ends_at, separated_at'
    )
    .order('date_of_birth', { ascending: true, nullsFirst: false });

  if (!withEmploymentFields.error) {
    return withEmploymentFields;
  }

  if (!isMissingEmploymentColumnError(withEmploymentFields.error)) {
    return withEmploymentFields;
  }

  return adminClient
    .from('hrm_employees')
    .select('id, auth_user_id, employee_id, name, email, profile_picture_url, date_of_birth, employee_status')
    .order('date_of_birth', { ascending: true, nullsFirst: false });
}

async function loadRecentEmployeesForDashboard() {
  return adminClient
    .from('hrm_employees')
    .select(`
      id,
      auth_user_id,
      employee_id,
      name,
      email,
      created_at,
      profile_picture_url,
      department:hrm_departments (id, name),
      designation:hrm_designations (id, title)
    `)
    .order('created_at', { ascending: false })
    .limit(12);
}

export async function getHrAdminDashboardSnapshot() {
  const [hrAdminsResult, employeeStateResult, recentEmployeesResult, departmentsResult, designationsResult] = await Promise.all([
    adminClient
      .from('privileged_accounts')
      .select('id, auth_user_id, email, name, created_at', { count: 'exact' })
      .eq('role', 'hr_admin')
      .order('created_at', { ascending: false })
      .limit(5),
    loadEmployeeStateRowsForDashboard(),
    loadRecentEmployeesForDashboard(),
    adminClient
      .from('hrm_departments')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    adminClient
      .from('hrm_designations')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  if (hrAdminsResult.error) {
    throw new Error(hrAdminsResult.error.message || 'Failed to load HR admins');
  }
  if (employeeStateResult.error) {
    throw new Error(employeeStateResult.error.message || 'Failed to load employee dashboard state');
  }
  if (recentEmployeesResult.error) {
    throw new Error(recentEmployeesResult.error.message || 'Failed to load recent employees');
  }
  if (departmentsResult.error) {
    throw new Error(departmentsResult.error.message || 'Failed to load departments');
  }
  if (designationsResult.error) {
    throw new Error(designationsResult.error.message || 'Failed to load designations');
  }

  const hrAdmins = hrAdminsResult.data || [];
  const hrAdminUserIds = new Set(hrAdmins.map((row) => row.auth_user_id).filter(Boolean));
  const hrAdminEmails = new Set(hrAdmins.map((row) => String(row.email || '').toLowerCase()).filter(Boolean));

  const isEmployeeRecord = (employee) => {
    const normalizedEmail = String(employee?.email || '').toLowerCase();
    return !hrAdminUserIds.has(employee?.auth_user_id) && !hrAdminEmails.has(normalizedEmail);
  };

  return {
    hrAdmins,
    employees: (employeeStateResult.data || []).filter(isEmployeeRecord),
    recentEmployees: (recentEmployeesResult.data || []).filter(isEmployeeRecord).slice(0, 6),
    departmentCount: departmentsResult.count || 0,
    designationCount: designationsResult.count || 0,
  };
}

export async function listHrAdminApprovers() {
  const { data, error } = await adminClient
    .from('privileged_accounts')
    .select('id, auth_user_id, name, email, status')
    .eq('role', 'hr_admin')
    .eq('status', 'Active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load HR approvers');
  }

  return (data || []).map((row) => ({
    id: row.auth_user_id,
    name: row.name || '',
    email: row.email || '',
    hrAdminId: row.id,
  }));
}

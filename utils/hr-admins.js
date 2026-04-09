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
  mobile_phone,
  phone,
  current_company_experience,
  created_by,
  profile_picture_url,
  department:hrm_departments (id, name),
  designation:hrm_designations (id, title)
`;

const EMPLOYEE_DASHBOARD_SELECT_WITH_EMPLOYMENT_FIELDS = `
  ${EMPLOYEE_DASHBOARD_SELECT_BASE},
  employee_type,
  employment_lifecycle_status,
  current_stage
`;

const HR_ADMIN_SELECT = `
  id,
  sr_no,
  auth_user_id,
  email,
  name,
  phone,
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
    .from('hr_admins')
    .select(HR_ADMIN_SELECT)
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load HR admin');
  }

  return data || null;
}

export async function getHrAdminDashboardData() {
  const loadEmployeesForDashboard = async () => {
    const withEmploymentFields = await adminClient
      .from('hrm_employees')
      .select(EMPLOYEE_DASHBOARD_SELECT_WITH_EMPLOYMENT_FIELDS)
      .order('created_at', { ascending: false });

    if (!withEmploymentFields.error) {
      return withEmploymentFields;
    }

    const message = String(withEmploymentFields.error.message || '').toLowerCase();
    const isMissingNewColumn =
      message.includes('employee_type') ||
      message.includes('employment_lifecycle_status') ||
      message.includes('current_stage');

    if (!isMissingNewColumn) {
      return withEmploymentFields;
    }

    return adminClient
      .from('hrm_employees')
      .select(EMPLOYEE_DASHBOARD_SELECT_BASE)
      .order('created_at', { ascending: false });
  };

  const [hrAdminsResult, employeesResult, departmentsResult, designationsResult, profilesResult] = await Promise.all([
    adminClient
      .from('hr_admins')
      .select(HR_ADMIN_SELECT)
      .order('sr_no', { ascending: true }),
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

export async function listHrAdminApprovers() {
  const { data, error } = await adminClient
    .from('hr_admins')
    .select('id, auth_user_id, name, email, status')
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

import { adminClient } from '@/utils/supabase/admin';
import { findSuperAdminByAuthUserId } from '@/utils/super-admins';
import { findPrivilegedAccountByAuthUserId } from '@/utils/privileged-accounts';
import { isEmployeeAccessDisabledNow } from '@/utils/hrm-employment';
import {
  isHrAdminRole,
  isSupportRole,
  isSuperAdminRole,
  normalizeProfileRole,
  resolveAccountType,
} from '@/utils/auth/roles';

function getDefaultModuleAccess() {
  return {
    task_manager: false,
    hrm_admin: false,
    auditing: false,
    crm: false,
  };
}

export function getEmployeeModuleAccessRecord(employee) {
  if (!employee?.module_access) return getDefaultModuleAccess();

  const moduleAccess = Array.isArray(employee.module_access)
    ? employee.module_access[0] || null
    : employee.module_access;

  return {
    ...getDefaultModuleAccess(),
    ...(moduleAccess || {}),
  };
}

export function buildModuleAccessState(authContext) {
  const isPrivilegedUser =
    authContext?.accountType === 'hr_admin' ||
    authContext?.accountType === 'super_admin' ||
    authContext?.accountType === 'support';
  const employeeModuleAccess = getEmployeeModuleAccessRecord(authContext?.employee);
  const employeeAccessBlocked = !isPrivilegedUser && isEmployeeAccessDisabledNow(authContext?.employee);

  const taskManagerEnabled = !employeeAccessBlocked && (isPrivilegedUser ? true : Boolean(employeeModuleAccess.task_manager));
  const hrmEnabled = !employeeAccessBlocked && (isPrivilegedUser ? true : Boolean(employeeModuleAccess.hrm_admin));
  const auditingEnabled = !employeeAccessBlocked && (isPrivilegedUser ? true : Boolean(employeeModuleAccess.auditing));
  const crmEnabled = !employeeAccessBlocked && (isPrivilegedUser ? true : Boolean(employeeModuleAccess.crm));

  return {
    taskManager: {
      enabled: taskManagerEnabled,
      href: taskManagerEnabled
        ? (isPrivilegedUser ? '/Taskmanager/admin' : '/Taskmanager/dashboard')
        : null,
    },
    hrm: {
      enabled: hrmEnabled,
      href: hrmEnabled
        ? (isPrivilegedUser ? '/HRM/hrm/admin' : '/HRM/hrm')
        : null,
    },
    auditing: {
      enabled: auditingEnabled,
      href: auditingEnabled ? '/Auditing/auditing' : null,
    },
    crm: {
      enabled: crmEnabled,
      href: crmEnabled ? null : null,
    },
  };
}

function getDefaultDestinationForResolvedContext(accountType, moduleAccessState) {
  if (accountType === 'super_admin') {
    return '/Taskmanager/admin';
  }

  if (accountType === 'hr_admin') {
    return '/HRM/hrm/admin';
  }

  if (accountType === 'support') {
    return '/Taskmanager/admin';
  }

  if (accountType === 'employee') {
    return '/other-modules';
  }

  return '/login';
}

export async function resolveAuthenticatedUserContext(supabase, user) {
  if (!user?.id) {
    return null;
  }

  const [{ data: profile, error: profileError }, { data: employeeByAuth, error: employeeError }] = await Promise.all([
    supabase.from('hrm_profiles').select('role, full_name, email, employee_id').eq('id', user.id).maybeSingle(),
    adminClient
      .from('hrm_employees')
      .select(`
        id,
        employee_id,
        name,
        email,
        role,
        profile_picture_url,
        auth_user_id,
        employment_lifecycle_status,
        current_stage,
        access_disabled_at,
        module_access:hrm_module_access!module_access_employee_id_fkey (
          task_manager,
          hrm_admin,
          auditing,
          crm
        )
      `)
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw new Error(profileError.message || 'Failed to load user profile');
  }

  if (employeeError) {
    throw new Error(employeeError.message || 'Failed to load employee profile');
  }

  let employee = employeeByAuth || null;

  if (!employee) {
    const fallbackEmployeeCode =
      profile?.employee_id ||
      (typeof user.user_metadata?.employee_id === 'string' ? user.user_metadata.employee_id.trim() : '') ||
      '';
    const fallbackEmployeeUuid =
      typeof user.user_metadata?.employee_uuid === 'string' ? user.user_metadata.employee_uuid.trim() : '';

    if (fallbackEmployeeUuid) {
      const { data: employeeByUuid } = await adminClient
        .from('hrm_employees')
        .select(`
          id,
          employee_id,
          name,
          email,
          role,
          profile_picture_url,
          auth_user_id,
          employment_lifecycle_status,
          current_stage,
          access_disabled_at,
          module_access:hrm_module_access!module_access_employee_id_fkey (
            task_manager,
            hrm_admin,
            auditing,
            crm
          )
        `)
        .eq('id', fallbackEmployeeUuid)
        .maybeSingle();
      employee = employeeByUuid || employee;
    }

    if (!employee && fallbackEmployeeCode) {
      const { data: employeeByCode } = await adminClient
        .from('hrm_employees')
        .select(`
          id,
          employee_id,
          name,
          email,
          role,
          profile_picture_url,
          auth_user_id,
          employment_lifecycle_status,
          current_stage,
          access_disabled_at,
          module_access:hrm_module_access!module_access_employee_id_fkey (
            task_manager,
            hrm_admin,
            auditing,
            crm
          )
        `)
        .ilike('employee_id', fallbackEmployeeCode)
        .maybeSingle();
      employee = employeeByCode || null;
    }
  }

  const privilegedAccount = await findPrivilegedAccountByAuthUserId(user.id);
  const profileRole = normalizeProfileRole(profile?.role || privilegedAccount?.role);
  const accountType = resolveAccountType({ profileRole, employee });

  if (!accountType) {
    return null;
  }

  let hrAdmin = null;
  let superAdmin = null;
  let support = null;

  if (accountType === 'hr_admin') {
    hrAdmin = privilegedAccount?.role === 'hr_admin' ? privilegedAccount : null;
  }

  if (accountType === 'super_admin') {
    superAdmin = privilegedAccount?.role === 'super_admin' ? privilegedAccount : await findSuperAdminByAuthUserId(user.id);
  }

  if (accountType === 'support') {
    support = privilegedAccount?.role === 'support' ? privilegedAccount : null;
  }

  if (accountType === 'super_admin' && !superAdmin) {
    return null;
  }

  if (accountType === 'hr_admin' && !hrAdmin) {
    return null;
  }

  if (accountType === 'support' && !support) {
    return null;
  }

  const displayName =
    superAdmin?.name ||
    hrAdmin?.name ||
    profile?.full_name ||
    employee?.name ||
    user.user_metadata?.full_name ||
    user.email ||
    'User';

  const partialContext = {
    accountType,
    employee: employee || null,
  };
  const moduleAccess = buildModuleAccessState(partialContext);

  return {
    userId: user.id,
    accountType,
    profileRole,
    isSuperAdmin: isSuperAdminRole(profileRole),
    isHrAdmin: isHrAdminRole(profileRole),
    isSupport: isSupportRole(profileRole),
    destination: getDefaultDestinationForResolvedContext(accountType, moduleAccess),
    user: {
      id: user.id,
      employeeId: employee?.employee_id || profile?.employee_id || '',
      email: user.email || superAdmin?.email || hrAdmin?.email || employee?.email || profile?.email || '',
      name: displayName,
      avatarUrl:
        superAdmin?.profile_picture_url ||
        support?.profile_picture_url ||
        hrAdmin?.profile_picture_url ||
        user.user_metadata?.avatar_url ||
        employee?.profile_picture_url ||
        null,
    },
    superAdmin: superAdmin || null,
    hrAdmin: hrAdmin || null,
    support: support || null,
    privilegedAccount: privilegedAccount || null,
    employee: employee || null,
    profile: profile || null,
    moduleAccess,
  };
}

export function hasLinkedEmployeeAccess(authContext) {
  return Boolean(authContext?.employee?.id);
}


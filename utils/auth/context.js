import { adminClient } from '@/utils/supabase/admin';
import { findHrAdminByAuthUserId } from '@/utils/hr-admins';
import { findSuperAdminByAuthUserId } from '@/utils/super-admins';
import {
  getDefaultDestinationForAccountType,
  isHrAdminRole,
  isSuperAdminRole,
  normalizeProfileRole,
  resolveAccountType,
} from '@/utils/auth/roles';

export async function resolveAuthenticatedUserContext(supabase, user) {
  if (!user?.id) {
    return null;
  }

  const [{ data: profile, error: profileError }, { data: employeeByAuth, error: employeeError }, hrAdmin, superAdmin] =
    await Promise.all([
      supabase.from('hrm_profiles').select('role, full_name, email, employee_id').eq('id', user.id).maybeSingle(),
      adminClient
        .from('hrm_employees')
        .select('id, employee_id, name, email, role, profile_picture_url, auth_user_id')
        .eq('auth_user_id', user.id)
        .maybeSingle(),
      findHrAdminByAuthUserId(user.id),
      findSuperAdminByAuthUserId(user.id),
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
        .select('id, employee_id, name, email, role, profile_picture_url, auth_user_id')
        .eq('id', fallbackEmployeeUuid)
        .maybeSingle();
      employee = employeeByUuid || employee;
    }

    if (!employee && fallbackEmployeeCode) {
      const { data: employeeByCode } = await adminClient
        .from('hrm_employees')
        .select('id, employee_id, name, email, role, profile_picture_url, auth_user_id')
        .ilike('employee_id', fallbackEmployeeCode)
        .maybeSingle();
      employee = employeeByCode || null;
    }
  }

  const profileRole = normalizeProfileRole(profile?.role);
  const accountType = resolveAccountType({ profileRole, employee });

  if (!accountType) {
    return null;
  }

  if (accountType === 'super_admin' && !superAdmin) {
    return null;
  }

  if (accountType === 'hr_admin' && !hrAdmin) {
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

  return {
    userId: user.id,
    accountType,
    profileRole,
    isSuperAdmin: isSuperAdminRole(profileRole),
    isHrAdmin: isHrAdminRole(profileRole),
    destination: getDefaultDestinationForAccountType(accountType),
    user: {
      id: user.id,
      email: user.email || superAdmin?.email || hrAdmin?.email || employee?.email || profile?.email || '',
      name: displayName,
      avatarUrl: user.user_metadata?.avatar_url || employee?.profile_picture_url || null,
    },
    superAdmin: superAdmin || null,
    hrAdmin: hrAdmin || null,
    employee: employee || null,
    profile: profile || null,
  };
}


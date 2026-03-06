import { adminClient } from '@/utils/supabase/admin';

function randomBootstrapPassword() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

async function findAuthUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;

  const users = data?.users || [];
  return users.find((user) => String(user.email || '').toLowerCase() === normalized) || null;
}

export async function ensureEmployeeAuthUser(employee, password) {
  if (!employee?.id) {
    throw new Error('Employee is required to ensure auth user');
  }

  if (!employee?.email) {
    throw new Error('Employee email is required to create auth user');
  }

  if (employee.auth_user_id) {
    return employee.auth_user_id;
  }

  const payload = {
    email: employee.email,
    password: password || randomBootstrapPassword(),
    email_confirm: true,
    user_metadata: {
      full_name: employee.name || '',
      employee_id: employee.employee_id || '',
      employee_uuid: employee.id,
      role: 'employee',
    },
  };

  const { data: created, error: createError } = await adminClient.auth.admin.createUser(payload);

  let authUserId = created?.user?.id || null;

  if (createError || !authUserId) {
    const fallbackUser = await findAuthUserByEmail(employee.email);
    if (!fallbackUser) {
      throw new Error(createError?.message || 'Failed to create employee auth user');
    }
    authUserId = fallbackUser.id;
  }

  const { error: updateEmployeeError } = await adminClient
    .from('employees')
    .update({ auth_user_id: authUserId })
    .eq('id', employee.id);

  if (updateEmployeeError) {
    throw new Error(updateEmployeeError.message || 'Failed to map employee auth user');
  }

  return authUserId;
}

export async function syncEmployeePasswordToAuth(employee, password) {
  if (!employee?.auth_user_id) {
    throw new Error('Employee auth_user_id is required');
  }

  const { error } = await adminClient.auth.admin.updateUserById(employee.auth_user_id, {
    password,
    email_confirm: true,
    user_metadata: {
      full_name: employee.name || '',
      employee_uuid: employee.id,
      role: 'employee',
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to sync employee password to auth');
  }
}

export async function sendEmployeeResetPasswordEmail(email, redirectTo) {
  const { error } = await adminClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send password reset email');
  }
}

export function getResetRedirectUrl(request) {
  const url = new URL(request.url);
  return `${url.origin}/login`;
}
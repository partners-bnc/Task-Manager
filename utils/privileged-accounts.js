import { adminClient } from '@/utils/supabase/admin';

const PRIVILEGED_ACCOUNT_SELECT = `
  id,
  auth_user_id,
  email,
  name,
  role,
  designation,
  profile_picture_url,
  status,
  department_id,
  designation_id,
  created_at,
  updated_at,
  department:hrm_departments (
    id,
    name
  ),
  designation_ref:hrm_designations (
    id,
    title
  )
`;

function mapPrivilegedAccountRow(row) {
  if (!row) return null;

  return {
    ...row,
    designation_ref: row.designation_ref || null,
  };
}

export async function findPrivilegedAccountByAuthUserId(authUserId) {
  if (!authUserId) return null;

  const { data, error } = await adminClient
    .from('privileged_accounts')
    .select(PRIVILEGED_ACCOUNT_SELECT)
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load privileged account');
  }

  return mapPrivilegedAccountRow(data);
}

export async function findPrivilegedAccountByEmail(email, role = null) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  let query = adminClient
    .from('privileged_accounts')
    .select(PRIVILEGED_ACCOUNT_SELECT)
    .eq('email', normalizedEmail);

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load privileged account');
  }

  return mapPrivilegedAccountRow(data);
}

export async function listActivePrivilegedAccounts() {
  const { data, error } = await adminClient
    .from('privileged_accounts')
    .select(PRIVILEGED_ACCOUNT_SELECT)
    .eq('status', 'Active')
    .order('role', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load privileged accounts');
  }

  return (data || []).map(mapPrivilegedAccountRow);
}

export async function listActivePrivilegedAccountsByRole(role) {
  if (!role) return [];

  const { data, error } = await adminClient
    .from('privileged_accounts')
    .select(PRIVILEGED_ACCOUNT_SELECT)
    .eq('role', role)
    .eq('status', 'Active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load privileged accounts');
  }

  return (data || []).map(mapPrivilegedAccountRow);
}

export async function findDefaultSupportAccount() {
  const { data, error } = await adminClient
    .from('privileged_accounts')
    .select(PRIVILEGED_ACCOUNT_SELECT)
    .eq('role', 'support')
    .eq('status', 'Active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load support account');
  }

  return mapPrivilegedAccountRow(data);
}

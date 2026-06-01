import { adminClient } from '@/utils/supabase/admin';

const SUPER_ADMIN_SELECT = `
  id,
  auth_user_id,
  email,
  name,
  designation,
  profile_picture_url,
  status,
  role,
  password_hash,
  created_at,
  updated_at
`;

export async function findSuperAdminByAuthUserId(authUserId) {
  if (!authUserId) return null;

  const { data, error } = await adminClient
    .from('privileged_accounts')
    .select(SUPER_ADMIN_SELECT)
    .eq('auth_user_id', authUserId)
    .eq('role', 'super_admin')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load super admin');
  }

  return data || null;
}

import { adminClient } from '@/utils/supabase/admin';

const SUPER_ADMIN_SELECT = `
  id,
  auth_user_id,
  email,
  name,
  designation,
  profile_picture_url,
  status,
  created_at,
  updated_at
`;

export async function findSuperAdminByAuthUserId(authUserId) {
  if (!authUserId) return null;

  const { data, error } = await adminClient
    .from('super_admins')
    .select(SUPER_ADMIN_SELECT)
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load super admin');
  }

  return data || null;
}

import bcrypt from 'bcryptjs';
import { adminClient } from '@/utils/supabase/admin';

const SUPER_ADMIN_AUTH_SELECT = `
  id,
  auth_user_id,
  email,
  name,
  password_hash,
  status,
  designation,
  profile_picture_url
`;

function randomBootstrapPassword() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function looksLikeBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || '').trim());
}

async function findAuthUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw new Error(error.message || 'Failed to list auth users');
  }

  return (data?.users || []).find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
}

async function upsertSuperAdminProfile(authUserId, superAdmin) {
  const { error } = await adminClient
    .from('hrm_profiles')
    .upsert(
      {
        id: authUserId,
        full_name: superAdmin.name || null,
        email: superAdmin.email || null,
        role: 'super_admin',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw new Error(error.message || 'Failed to upsert super admin profile');
  }
}

function buildSuperAdminUserMetadata(superAdmin) {
  return {
    full_name: superAdmin.name || '',
    avatar_url: superAdmin.profile_picture_url || '',
  };
}

export async function findSuperAdminByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const { data, error } = await adminClient
    .from('privileged_accounts')
    .select(SUPER_ADMIN_AUTH_SELECT)
    .eq('email', normalizedEmail)
    .eq('role', 'super_admin')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load super admin');
  }

  return data || null;
}

export async function verifySuperAdminPassword(superAdmin, password) {
  const storedPassword = String(superAdmin?.password_hash || '');
  if (!storedPassword) {
    return false;
  }

  if (looksLikeBcryptHash(storedPassword)) {
    return bcrypt.compare(password, storedPassword);
  }

  return storedPassword === String(password || '');
}

export async function ensureSuperAdminAuthUser(superAdmin, password) {
  if (!superAdmin?.id) {
    throw new Error('Super admin is required to ensure auth user');
  }

  if (!superAdmin?.email) {
    throw new Error('Super admin email is required to ensure auth user');
  }

  const payload = {
    email: superAdmin.email,
    password: password || randomBootstrapPassword(),
    email_confirm: true,
    user_metadata: buildSuperAdminUserMetadata(superAdmin),
    app_metadata: {
      role: 'super_admin',
    },
  };

  let authUserId = superAdmin.auth_user_id || null;

  if (authUserId) {
    const { error } = await adminClient.auth.admin.updateUserById(authUserId, payload);
    if (error) {
      throw new Error(error.message || 'Failed to update super admin auth user');
    }
  } else {
    const existingAuthUser = await findAuthUserByEmail(superAdmin.email);

    if (existingAuthUser?.id) {
      authUserId = existingAuthUser.id;
      const { error } = await adminClient.auth.admin.updateUserById(authUserId, payload);
      if (error) {
        throw new Error(error.message || 'Failed to update super admin auth user');
      }
    } else {
      const { data, error } = await adminClient.auth.admin.createUser(payload);
      if (error || !data?.user?.id) {
        throw new Error(error?.message || 'Failed to create super admin auth user');
      }
      authUserId = data.user.id;
    }
  }

  const { error: updatePrivilegedAccountError } = await adminClient
    .from('privileged_accounts')
    .update({
      auth_user_id: authUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', superAdmin.id);

  if (updatePrivilegedAccountError) {
    throw new Error(updatePrivilegedAccountError.message || 'Failed to map super admin auth user');
  }

  await upsertSuperAdminProfile(authUserId, superAdmin);
  return authUserId;
}

export async function syncSuperAdminPasswordToAuth(superAdmin, password) {
  if (!superAdmin?.auth_user_id) {
    throw new Error('Super admin auth_user_id is required');
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(superAdmin.auth_user_id, {
    email: superAdmin.email,
    password,
    email_confirm: true,
    user_metadata: buildSuperAdminUserMetadata(superAdmin),
    app_metadata: {
      role: 'super_admin',
    },
  });

  if (authError) {
    throw new Error(authError.message || 'Failed to sync super admin password to auth');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { error: updatePrivilegedAccountError } = await adminClient
    .from('privileged_accounts')
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', superAdmin.id);

  if (updatePrivilegedAccountError) {
    throw new Error(updatePrivilegedAccountError.message || 'Failed to update super admin password');
  }

  await upsertSuperAdminProfile(superAdmin.auth_user_id, superAdmin);
}

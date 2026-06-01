import bcrypt from 'bcryptjs';
import { adminClient } from '@/utils/supabase/admin';

const SUPPORT_AUTH_SELECT = `
  id,
  auth_user_id,
  email,
  name,
  password_hash,
  status,
  profile_picture_url,
  designation
`;

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

async function upsertSupportProfile(authUserId, supportAccount) {
  const { error } = await adminClient
    .from('hrm_profiles')
    .upsert(
      {
        id: authUserId,
        full_name: supportAccount.name || null,
        email: supportAccount.email || null,
        role: 'support',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw new Error(error.message || 'Failed to upsert support profile');
  }
}

function buildSupportUserMetadata(supportAccount) {
  return {
    full_name: supportAccount.name || '',
    avatar_url: supportAccount.profile_picture_url || '',
  };
}

export async function findSupportByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const { data, error } = await adminClient
    .from('privileged_accounts')
    .select(SUPPORT_AUTH_SELECT)
    .eq('email', normalizedEmail)
    .eq('role', 'support')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load support account');
  }

  return data || null;
}

export async function verifySupportPassword(supportAccount, password) {
  const storedPassword = String(supportAccount?.password_hash || '');
  if (!storedPassword) {
    return false;
  }

  if (looksLikeBcryptHash(storedPassword)) {
    return bcrypt.compare(password, storedPassword);
  }

  return storedPassword === String(password || '');
}

export async function ensureSupportAuthUser(supportAccount, password) {
  if (!supportAccount?.id) {
    throw new Error('Support account is required to ensure auth user');
  }

  if (!supportAccount?.email) {
    throw new Error('Support account email is required to ensure auth user');
  }

  const payload = {
    email: supportAccount.email,
    password,
    email_confirm: true,
    user_metadata: buildSupportUserMetadata(supportAccount),
    app_metadata: {
      role: 'support',
    },
  };

  let authUserId = supportAccount.auth_user_id || null;

  if (authUserId) {
    const { error } = await adminClient.auth.admin.updateUserById(authUserId, payload);
    if (error) {
      throw new Error(error.message || 'Failed to update support auth user');
    }
  } else {
    const existingAuthUser = await findAuthUserByEmail(supportAccount.email);

    if (existingAuthUser?.id) {
      authUserId = existingAuthUser.id;
      const { error } = await adminClient.auth.admin.updateUserById(authUserId, payload);
      if (error) {
        throw new Error(error.message || 'Failed to update support auth user');
      }
    } else {
      const { data, error } = await adminClient.auth.admin.createUser(payload);
      if (error || !data?.user?.id) {
        throw new Error(error?.message || 'Failed to create support auth user');
      }
      authUserId = data.user.id;
    }
  }

  const { error: accountUpdateError } = await adminClient
    .from('privileged_accounts')
    .update({
      auth_user_id: authUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supportAccount.id);

  if (accountUpdateError) {
    throw new Error(accountUpdateError.message || 'Failed to map support auth user');
  }

  await upsertSupportProfile(authUserId, supportAccount);
  return authUserId;
}

export async function syncSupportPasswordToAuth(supportAccount, password) {
  if (!supportAccount?.auth_user_id) {
    throw new Error('Support auth_user_id is required');
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(supportAccount.auth_user_id, {
    email: supportAccount.email,
    password,
    email_confirm: true,
    user_metadata: buildSupportUserMetadata(supportAccount),
    app_metadata: {
      role: 'support',
    },
  });

  if (authError) {
    throw new Error(authError.message || 'Failed to sync support password to auth');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { error: accountUpdateError } = await adminClient
    .from('privileged_accounts')
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supportAccount.id);

  if (accountUpdateError) {
    throw new Error(accountUpdateError.message || 'Failed to update support password');
  }

  await upsertSupportProfile(supportAccount.auth_user_id, supportAccount);
}

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const superAdmin = {
  name: 'Summit Goyal',
  email: 'summit@bncglobal.in',
  password: 'Admin@2026!',
};

async function findAuthUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw new Error(error.message || 'Failed to list auth users');
  }

  return data.users.find((user) => String(user.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function ensureAuthUser(account) {
  const existing = await findAuthUserByEmail(account.email);

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.name,
      },
      app_metadata: {
        role: 'super_admin',
      },
    });

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update super admin auth user');
    }

    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      full_name: account.name,
    },
    app_metadata: {
      role: 'super_admin',
    },
  });

  if (error || !data.user?.id) {
    throw new Error(error?.message || 'Failed to create super admin auth user');
  }

  return data.user.id;
}

async function ensureProfile(authUserId, account) {
  const { error } = await supabase
    .from('hrm_profiles')
    .upsert(
      {
        id: authUserId,
        full_name: account.name,
        email: account.email,
        role: 'super_admin',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw new Error(error.message || 'Failed to upsert super admin profile');
  }
}

async function ensureSuperAdminRow(authUserId, account) {
  const passwordHash = await bcrypt.hash(account.password, 10);

  const { error } = await supabase
    .from('super_admins')
    .upsert(
      {
        auth_user_id: authUserId,
        email: account.email,
        name: account.name,
        password_hash: passwordHash,
        status: 'Active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );

  if (error) {
    throw new Error(error.message || 'Failed to upsert super admin row');
  }
}

async function main() {
  const authUserId = await ensureAuthUser(superAdmin);
  await ensureProfile(authUserId, superAdmin);
  await ensureSuperAdminRow(authUserId, superAdmin);

  console.log(`Super admin ready: ${superAdmin.email}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

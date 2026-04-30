import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  getAccountTypeLabel,
  matchesLoginPortal,
  normalizeLoginPortal,
} from '@/utils/auth/roles';
import { isEmployeeLoginBlocked } from '@/utils/hrm-employment';
import {
  ensureEmployeeAuthUser,
  syncEmployeePasswordToAuth,
} from '@/utils/employee-auth';
import {
  ensureSuperAdminAuthUser,
  findSuperAdminByEmail,
  syncSuperAdminPasswordToAuth,
  verifySuperAdminPassword,
} from '@/utils/super-admin-auth';

const EMPLOYEE_AUTH_SELECT_BASE =
  'id, employee_id, name, email, role, password_hash, must_change_password, auth_user_id, employee_status';

async function findEmployeeBy(column, value) {
  return adminClient
    .from('hrm_employees')
    .select(EMPLOYEE_AUTH_SELECT_BASE)
    .eq(column, value)
    .limit(1)
    .maybeSingle();
}

async function tryPrivilegedLogin(identifier, password, loginAs) {
  const normalizedEmail = String(identifier).trim().toLowerCase();

  if (!normalizedEmail.includes('@')) {
    return { ok: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data?.user) {
    return { ok: false };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, data.user);

  if (!authContext || authContext.accountType === 'employee') {
    await supabase.auth.signOut();
    return { ok: false };
  }

  if (!matchesLoginPortal(loginAs, authContext.accountType)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      payload: {
        error: `This account belongs to ${getAccountTypeLabel(authContext.accountType)}. Please choose the correct login type.`,
      },
      status: 403,
    };
  }

  return {
    ok: true,
    payload: {
      success: true,
      role: authContext.accountType,
      destination: authContext.destination,
      workspaceHref: authContext.destination,
      taskManagerHref: authContext.moduleAccess?.taskManager?.href || '/login',
      modules: authContext.moduleAccess,
      user: {
        id: authContext.user.id,
        email: authContext.user.email,
        name: authContext.user.name,
      },
    },
  };
}

async function tryLegacySuperAdminLogin(identifier, password, loginAs) {
  if (normalizeLoginPortal(loginAs) !== 'super_admin') {
    return { ok: false };
  }

  const superAdmin = await findSuperAdminByEmail(identifier);

  if (!superAdmin) {
    return { ok: false };
  }

  if (String(superAdmin.status || '').toLowerCase() !== 'active') {
    return {
      ok: false,
      payload: {
        error: 'This super admin account is inactive.',
      },
      status: 403,
    };
  }

  const passwordValid = await verifySuperAdminPassword(superAdmin, password);
  if (!passwordValid) {
    return { ok: false };
  }

  const authUserId = await ensureSuperAdminAuthUser(superAdmin, password);
  const nextSuperAdmin = {
    ...superAdmin,
    auth_user_id: authUserId,
  };

  await syncSuperAdminPasswordToAuth(nextSuperAdmin, password);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: nextSuperAdmin.email,
    password,
  });

  if (error || !data?.user) {
    return {
      ok: false,
      payload: {
        error: 'Super admin account was prepared, but sign-in could not be completed. Please try again.',
      },
      status: 500,
    };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, data.user);

  if (!authContext || authContext.accountType !== 'super_admin') {
    await supabase.auth.signOut();
    return { ok: false };
  }

  return {
    ok: true,
    payload: {
      success: true,
      role: authContext.accountType,
      destination: authContext.destination,
      workspaceHref: authContext.destination,
      taskManagerHref: authContext.moduleAccess?.taskManager?.href || '/login',
      modules: authContext.moduleAccess,
      user: {
        id: authContext.user.id,
        email: authContext.user.email,
        name: authContext.user.name,
      },
    },
  };
}

async function tryEmployeeLogin(identifier, password, loginAs) {
  const supabase = await createClient();

  const rawIdentifier = String(identifier).trim();
  const normalizedIdentifier = rawIdentifier.toLowerCase();

  let { data: employee, error: employeeError } = await findEmployeeBy('email', normalizedIdentifier);

  if (!employee || employeeError) {
    const employeeByIdResult = await adminClient
      .from('hrm_employees')
      .select(EMPLOYEE_AUTH_SELECT_BASE)
      .ilike('employee_id', rawIdentifier)
      .limit(1)
      .maybeSingle();

    const { data: byEmployeeId, error: byEmployeeIdError } = employeeByIdResult;
    employee = byEmployeeId;
    employeeError = byEmployeeIdError;
  }

  if (employeeError) {
    throw new Error(employeeError.message || 'Employee auth query failed');
  }

  if (!employee) {
    return { ok: false };
  }

  if (isEmployeeLoginBlocked(employee)) {
    return {
      ok: false,
      payload: {
        error: 'Your employee account is inactive or separated. Please contact HR.',
      },
      status: 403,
    };
  }

  const authUserId = await ensureEmployeeAuthUser(employee);
  employee = { ...employee, auth_user_id: authUserId };

  const attemptSupabaseSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: employee.email,
      password,
    });
    return { data, error };
  };

  if (employee.must_change_password) {
    const isOldPassword = await bcrypt.compare(password, employee.password_hash || '');

    if (isOldPassword) {
      await syncEmployeePasswordToAuth(employee, password);
    }

    const { data, error } = await attemptSupabaseSignIn();
    if (error || !data?.user) {
      return { ok: false };
    }

    await adminClient
      .from('hrm_employees')
      .update({
        must_change_password: false,
        password_set_at: new Date().toISOString(),
      })
      .eq('id', employee.id);

    const authContext = await resolveAuthenticatedUserContext(supabase, data.user);

    if (!authContext || authContext.accountType !== 'employee') {
      await supabase.auth.signOut();
      return { ok: false };
    }

    if (!matchesLoginPortal(loginAs, authContext.accountType)) {
      await supabase.auth.signOut();
      return {
        ok: false,
        payload: {
          error: `This account belongs to ${getAccountTypeLabel(authContext.accountType)}. Please choose the correct login type.`,
        },
        status: 403,
      };
    }

    return {
      ok: true,
      payload: {
        success: true,
        role: 'employee',
        destination: authContext.destination,
        workspaceHref: authContext.destination,
        taskManagerHref: authContext.moduleAccess?.taskManager?.href || '/login',
        modules: authContext.moduleAccess,
        user: {
          id: authContext.user.id,
          email: authContext.user.email,
          name: authContext.user.name,
        },
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
        },
      },
    };
  }

  let { data, error } = await attemptSupabaseSignIn();

  if (error || !data?.user) {
    const legacyPasswordValid = await bcrypt.compare(password, employee.password_hash || '');
    if (!legacyPasswordValid) {
      return { ok: false };
    }

    await syncEmployeePasswordToAuth(employee, password);
    const retry = await attemptSupabaseSignIn();
    data = retry.data;
    error = retry.error;

    if (error || !data?.user) {
      return { ok: false };
    }
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, data.user);

  if (!authContext || authContext.accountType !== 'employee') {
    await supabase.auth.signOut();
    return { ok: false };
  }

  if (!matchesLoginPortal(loginAs, authContext.accountType)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      payload: {
        error: `This account belongs to ${getAccountTypeLabel(authContext.accountType)}. Please choose the correct login type.`,
      },
      status: 403,
    };
  }

  return {
    ok: true,
    payload: {
      success: true,
      role: 'employee',
      destination: authContext.destination,
      workspaceHref: authContext.destination,
      taskManagerHref: authContext.moduleAccess?.taskManager?.href || '/login',
      modules: authContext.moduleAccess,
      user: {
        id: authContext.user.id,
        email: authContext.user.email,
        name: authContext.user.name,
      },
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    },
  };
}

export async function POST(request) {
  try {
    const { email, password, loginAs } = await request.json();
    const selectedPortal = normalizeLoginPortal(loginAs);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const privilegedResult = await tryPrivilegedLogin(email, password, selectedPortal);
    if (privilegedResult.ok) {
      return NextResponse.json(privilegedResult.payload);
    }

    if (privilegedResult.payload?.error) {
      return NextResponse.json(privilegedResult.payload, { status: privilegedResult.status || 403 });
    }

    const legacySuperAdminResult = await tryLegacySuperAdminLogin(email, password, selectedPortal);
    if (legacySuperAdminResult.ok) {
      return NextResponse.json(legacySuperAdminResult.payload);
    }

    if (legacySuperAdminResult.payload?.error) {
      return NextResponse.json(legacySuperAdminResult.payload, { status: legacySuperAdminResult.status || 403 });
    }

    const employeeResult = await tryEmployeeLogin(email, password, selectedPortal);

    if (!employeeResult.ok && employeeResult.payload?.error) {
      return NextResponse.json(employeeResult.payload, { status: employeeResult.status || 403 });
    }

    if (!employeeResult.ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json(employeeResult.payload);
  } catch (error) {
    console.error('Error in unified login:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


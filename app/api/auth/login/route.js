import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  ensureEmployeeAuthUser,
  getResetRedirectUrl,
  sendEmployeeResetPasswordEmail,
  syncEmployeePasswordToAuth,
} from '@/utils/employee-auth';

const SESSION_COOKIE = 'employee_session';

async function findEmployeeBy(column, value) {
  return adminClient
    .from('employees')
    .select('id, employee_id, name, email, role, password_hash, must_change_password, auth_user_id')
    .eq(column, value)
    .limit(1)
    .maybeSingle();
}

async function tryAdminLogin(email, password) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.user) {
    return { ok: false };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profile?.role !== 'admin') {
    await supabase.auth.signOut();
    return { ok: false };
  }

  return {
    ok: true,
    payload: {
      success: true,
      role: 'admin',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    },
  };
}

async function tryEmployeeLogin(request, email, password) {
  const supabase = await createClient();

  const normalizedIdentifier = String(email).trim().toLowerCase();
  const localPart = normalizedIdentifier.includes('@')
    ? normalizedIdentifier.split('@')[0]
    : normalizedIdentifier;

  let { data: employee, error: employeeError } = await findEmployeeBy('email', normalizedIdentifier);

  if ((!employee || employeeError) && localPart) {
    const { data: byUsername, error: byUsernameError } = await findEmployeeBy('username', localPart);
    employee = byUsername;
    employeeError = byUsernameError;
  }

  if (employeeError) {
    throw new Error(employeeError.message || 'Employee auth query failed');
  }

  if (!employee) {
    return { ok: false };
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
      await sendEmployeeResetPasswordEmail(employee.email, getResetRedirectUrl(request));
      return {
        ok: false,
        resetRequired: true,
        message: 'Password reset required. We sent a reset link to your email.',
      };
    }

    const { data, error } = await attemptSupabaseSignIn();
    if (error || !data?.user) {
      return { ok: false };
    }

    await adminClient
      .from('employees')
      .update({
        must_change_password: false,
        password_set_at: new Date().toISOString(),
      })
      .eq('id', employee.id);

    return {
      ok: true,
      payload: {
        success: true,
        role: 'employee',
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

  return {
    ok: true,
    payload: {
      success: true,
      role: 'employee',
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    },
  };
}

function clearLegacyEmployeeSessionCookie(response) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const adminResult = await tryAdminLogin(email, password);
    if (adminResult.ok) {
      const response = NextResponse.json(adminResult.payload);
      clearLegacyEmployeeSessionCookie(response);
      return response;
    }

    const employeeResult = await tryEmployeeLogin(request, email, password);

    if (employeeResult.resetRequired) {
      return NextResponse.json(
        {
          error: employeeResult.message,
          code: 'PASSWORD_RESET_REQUIRED',
        },
        { status: 403 }
      );
    }

    if (!employeeResult.ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json(employeeResult.payload);
    clearLegacyEmployeeSessionCookie(response);
    return response;
  } catch (error) {
    console.error('Error in unified login:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
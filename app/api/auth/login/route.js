import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';

const SESSION_COOKIE = 'employee_session';
const SESSION_DAYS = 7;

async function findEmployeeBy(column, value) {
  return adminClient
    .from('employees')
    .select('id, name, email, role, password_hash')
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

async function tryEmployeeLogin(email, password) {
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
    const details = [
      employeeError.code || 'NO_CODE',
      employeeError.message || 'No message',
      employeeError.details || '',
    ]
      .filter(Boolean)
      .join(' | ');

    throw new Error(`Employee auth query failed: ${details}`);
  }

  if (!employee) {
    return { ok: false };
  }

  const isPasswordValid = await bcrypt.compare(password, employee.password_hash || '');
  if (!isPasswordValid) {
    return { ok: false };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: sessionInsertError } = await adminClient
    .from('employee_sessions')
    .insert({
      employee_id: employee.id,
      token,
      expires_at: expiresAt,
    });

  if (sessionInsertError) {
    throw new Error('Failed to create session');
  }

  const payload = {
    success: true,
    role: 'employee',
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
    },
  };

  return { ok: true, payload, token };
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1) Try admin auth (Supabase Auth + profiles.role=admin)
    const adminResult = await tryAdminLogin(email, password);
    if (adminResult.ok) {
      return NextResponse.json(adminResult.payload);
    }

    // 2) Try employee auth (employees + employee_sessions)
    const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'your_supabase_service_role_key') {
      return NextResponse.json(
        { error: 'Employee auth is not configured. Set NEXT_SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the server.' },
        { status: 500 }
      );
    }

    const employeeResult = await tryEmployeeLogin(email, password);
    if (!employeeResult.ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json(employeeResult.payload);
    response.cookies.set({
      name: SESSION_COOKIE,
      value: employeeResult.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Error in unified login:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'your_supabase_service_role_key') {
      return NextResponse.json(
        { error: 'Employee auth is not configured. Set NEXT_SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the server.' },
        { status: 500 }
      );
    }

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

      console.error('Employee lookup error:', employeeError);
      return NextResponse.json({ error: `Employee auth query failed: ${details}` }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password_hash || '');

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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
      console.error('Failed to create employee session:', sessionInsertError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      role: 'employee',
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Error in employee login:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

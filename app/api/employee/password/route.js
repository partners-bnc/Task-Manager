import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminClient } from '@/utils/supabase/admin';
import { getActor } from '@/utils/api-helpers';

export async function POST(request) {
  try {
    const actor = await getActor(request);

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (actor.type !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const currentPassword = String(body?.currentPassword ?? '');
    const newPassword = String(body?.newPassword ?? '');

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .select('id, password_hash')
      .eq('id', actor.employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, employee.password_hash || '');
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const nextPasswordHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await adminClient
      .from('employees')
      .update({
        password_hash: nextPasswordHash,
        must_change_password: false,
        password_set_at: new Date().toISOString(),
      })
      .eq('id', actor.employeeId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: 'Password updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating employee password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

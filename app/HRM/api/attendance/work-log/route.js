import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { getCurrentDateInTimeZone } from '@/utils/attendance';

async function requireEmployeeContext() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  if (!hasLinkedEmployeeAccess(authContext)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { employeeId: authContext.employee.id };
}

// GET /HRM/api/attendance/work-log?date=YYYY-MM-DD
export async function GET(request) {
  try {
    const ctx = await requireEmployeeContext();
    if (ctx.error) return ctx.error;

    const date = request.nextUrl.searchParams.get('date') || getCurrentDateInTimeZone();

    const { data, error } = await adminClient
      .from('hrm_daily_work_logs')
      .select('id, client_name, task_id, task_name_snapshot, hours_spent, remarks, created_at')
      .eq('employee_id', ctx.employeeId)
      .eq('log_date', date)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ date, logs: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to load work log' }, { status: 500 });
  }
}

// POST /HRM/api/attendance/work-log
export async function POST(request) {
  try {
    const ctx = await requireEmployeeContext();
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const { date, entries } = body;
    const logDate = date || getCurrentDateInTimeZone();

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'At least one work log entry is required' }, { status: 400 });
    }

    const rows = entries.map((entry) => ({
      employee_id: ctx.employeeId,
      log_date: logDate,
      client_name: String(entry.client_name || '').trim(),
      task_id: entry.task_id || null,
      task_name_snapshot: entry.task_name_snapshot ? String(entry.task_name_snapshot).trim() : null,
      hours_spent: Number(entry.hours_spent),
      remarks: entry.remarks ? String(entry.remarks).trim() : null,
    }));

    const invalid = rows.find((r) => !r.client_name || !r.hours_spent || r.hours_spent <= 0);
    if (invalid) {
      return NextResponse.json({ error: 'Each entry must have a client name and valid hours' }, { status: 400 });
    }

    const { data, error } = await adminClient.from('hrm_daily_work_logs').insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, logs: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to save work log' }, { status: 500 });
  }
}

// PATCH /HRM/api/attendance/work-log?id=UUID
export async function PATCH(request) {
  try {
    const ctx = await requireEmployeeContext();
    if (ctx.error) return ctx.error;

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Log entry ID is required' }, { status: 400 });

    const body = await request.json();
    const { client_name, task_id, task_name_snapshot, hours_spent, remarks } = body;

    if (!client_name || !hours_spent || Number(hours_spent) <= 0) {
      return NextResponse.json({ error: 'Client name and valid hours are required' }, { status: 400 });
    }

    const { error } = await adminClient
      .from('hrm_daily_work_logs')
      .update({
        client_name: String(client_name).trim(),
        task_id: task_id || null,
        task_name_snapshot: task_name_snapshot ? String(task_name_snapshot).trim() : null,
        hours_spent: Number(hours_spent),
        remarks: remarks ? String(remarks).trim() : null,
      })
      .eq('id', id)
      .eq('employee_id', ctx.employeeId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to update work log' }, { status: 500 });
  }
}

// DELETE /HRM/api/attendance/work-log?id=UUID
export async function DELETE(request) {
  try {
    const ctx = await requireEmployeeContext();
    if (ctx.error) return ctx.error;

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Log entry ID is required' }, { status: 400 });

    const { error } = await adminClient
      .from('hrm_daily_work_logs')
      .delete()
      .eq('id', id)
      .eq('employee_id', ctx.employeeId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to delete work log' }, { status: 500 });
  }
}

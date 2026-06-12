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

function isDateEditable(dateStr) {
  const todayStr = getCurrentDateInTimeZone();
  
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const val = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const yesterdayStr = `${val.year}-${val.month}-${val.day}`;

  return dateStr === todayStr || dateStr === yesterdayStr;
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

    if (!isDateEditable(logDate)) {
      return NextResponse.json({ error: 'Work logs can only be modified for today and yesterday.' }, { status: 400 });
    }

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

    const invalid = rows.find((r) => !r.client_name || !r.hours_spent || r.hours_spent <= 0 || !r.task_id || !r.remarks);
    if (invalid) {
      return NextResponse.json({ error: 'Each entry must have client name, project/task, valid hours, and remarks.' }, { status: 400 });
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

    const { data: existingLog, error: fetchError } = await adminClient
      .from('hrm_daily_work_logs')
      .select('log_date')
      .eq('id', id)
      .eq('employee_id', ctx.employeeId)
      .single();

    if (fetchError || !existingLog) {
      return NextResponse.json({ error: 'Work log entry not found' }, { status: 404 });
    }

    if (!isDateEditable(existingLog.log_date)) {
      return NextResponse.json({ error: 'Work logs can only be modified for today and yesterday.' }, { status: 403 });
    }

    const body = await request.json();
    const { client_name, task_id, task_name_snapshot, hours_spent, remarks } = body;

    if (!client_name || !hours_spent || Number(hours_spent) <= 0 || !task_id || !remarks) {
      return NextResponse.json({ error: 'Client name, project/task, valid hours, and remarks are required' }, { status: 400 });
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

    const { data: existingLog, error: fetchError } = await adminClient
      .from('hrm_daily_work_logs')
      .select('log_date')
      .eq('id', id)
      .eq('employee_id', ctx.employeeId)
      .single();

    if (fetchError || !existingLog) {
      return NextResponse.json({ error: 'Work log entry not found' }, { status: 404 });
    }

    if (!isDateEditable(existingLog.log_date)) {
      return NextResponse.json({ error: 'Work logs can only be modified for today and yesterday.' }, { status: 403 });
    }

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

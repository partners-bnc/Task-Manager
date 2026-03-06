import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';

const SESSION_COOKIE = 'employee_session';

export function getActorKey(actor) {
  if (!actor) return null;
  if (actor.type === 'admin' && actor.userId) return `admin:${actor.userId}`;
  if (actor.type === 'employee' && actor.employeeId) return `employee:${actor.employeeId}`;
  return null;
}

export function parseActorKey(actorKey) {
  if (!actorKey || typeof actorKey !== 'string') return null;
  const [type, id] = actorKey.split(':');
  if (!type || !id) return null;
  if (type !== 'admin' && type !== 'employee') return null;
  return { type, id };
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase, user };
}

export async function requireTaskManager(request) {
  const actor = await getActor(request);
  if (!actor) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (actor.type !== 'admin' && actor.type !== 'employee') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase: adminClient, actor };
}

async function getActorFromSupabaseUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'admin') {
    return {
      type: 'admin',
      userId: user.id,
      authUserId: user.id,
      name: profile?.full_name || user.email || 'Admin',
      email: user.email || '',
      avatarUrl: user.user_metadata?.avatar_url || null,
    };
  }

  const { data: employee } = await adminClient
    .from('employees')
    .select('id, name, email, role, profile_picture_url')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!employee) return null;

  return {
    type: 'employee',
    employeeId: employee.id,
    authUserId: user.id,
    name: employee.name || user.email || 'Employee',
    email: employee.email || user.email || '',
    role: employee.role || 'Employee',
    avatarUrl: employee.profile_picture_url || user.user_metadata?.avatar_url || null,
  };
}

async function getActorFromLegacyEmployeeSession(request) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const { data: session, error } = await adminClient
    .from('employee_sessions')
    .select('employee_id, expires_at, employee:employees(id, name, email, role, profile_picture_url)')
    .eq('token', sessionToken)
    .single();

  if (error || !session) return null;

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await adminClient.from('employee_sessions').delete().eq('token', sessionToken);
    return null;
  }

  return {
    type: 'employee',
    employeeId: session.employee_id,
    authUserId: null,
    name: session.employee?.name || 'Employee',
    email: session.employee?.email || '',
    role: session.employee?.role || 'Employee',
    avatarUrl: session.employee?.profile_picture_url || null,
  };
}

export async function getActor(request) {
  const jwtActor = await getActorFromSupabaseUser();
  if (jwtActor) return jwtActor;
  return getActorFromLegacyEmployeeSession(request);
}

export async function hasTaskAccess(taskId, actor) {
  if (!actor) return false;
  if (actor.type === 'admin') return true;

  const { data: assignment, error } = await adminClient
    .from('task_assignments')
    .select('task_id')
    .eq('task_id', taskId)
    .eq('employee_id', actor.employeeId)
    .single();

  return !error && !!assignment;
}

export function normalizeDueDate(input) {
  if (!input) return null;
  const parsedDate = new Date(input);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate.toISOString();
}

export function normalizeSubtasks(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((subtask) => {
      if (typeof subtask === 'string') {
        return { title: subtask.trim(), is_completed: false };
      }
      return {
        id: subtask?.id,
        title: String(subtask?.title || '').trim(),
        is_completed: Boolean(subtask?.is_completed),
        assigned_employee_id: subtask?.assigned_employee_id || null,
      };
    })
    .filter((subtask) => subtask.title.length > 0);
}

export async function syncTaskSubtasks(supabase, taskId, subtasks) {
  const { data: existingSubtasks, error: existingSubtasksError } = await supabase
    .from('task_subtasks')
    .select('id, title, is_completed, assigned_employee_id')
    .eq('task_id', taskId);

  if (existingSubtasksError) {
    throw new Error(existingSubtasksError.message);
  }

  const existingById = new Map((existingSubtasks || []).map((subtask) => [subtask.id, subtask]));
  const incomingWithId = subtasks.filter((subtask) => subtask.id);
  const incomingIds = new Set(incomingWithId.map((subtask) => subtask.id));

  const toDeleteIds = (existingSubtasks || [])
    .filter((subtask) => !incomingIds.has(subtask.id))
    .map((subtask) => subtask.id);

  if (toDeleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('task_id', taskId)
      .in('id', toDeleteIds);
    if (deleteError) throw new Error(deleteError.message);
  }

  const toInsert = subtasks
    .filter((subtask) => !subtask.id)
    .map((subtask) => ({
      task_id: taskId,
      title: subtask.title,
      is_completed: !!subtask.is_completed,
      assigned_employee_id: subtask.assigned_employee_id || null,
    }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('task_subtasks').insert(toInsert);
    if (insertError) throw new Error(insertError.message);
  }

  const toUpdate = incomingWithId.filter((subtask) => {
    const existing = existingById.get(subtask.id);
    if (!existing) return false;

    return !(
      existing.title === subtask.title &&
      existing.is_completed === !!subtask.is_completed &&
      (existing.assigned_employee_id || null) === (subtask.assigned_employee_id || null)
    );
  });

  if (toUpdate.length > 0) {
    const now = new Date().toISOString();
    const results = await Promise.all(
      toUpdate.map((subtask) =>
        supabase
          .from('task_subtasks')
          .update({
            title: subtask.title,
            is_completed: !!subtask.is_completed,
            assigned_employee_id: subtask.assigned_employee_id || null,
            updated_at: now,
          })
          .eq('id', subtask.id)
          .eq('task_id', taskId)
      )
    );

    for (const result of results) {
      if (result.error) throw new Error(result.error.message);
    }
  }
}
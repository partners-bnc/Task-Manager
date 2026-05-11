import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { isHrAdminRole, isSuperAdminRole, normalizeProfileRole } from '@/utils/auth/roles';

const EMPLOYEE_DIRECTORY_SELECT = `
  id,
  employee_id,
  username,
  name,
  email,
  role,
  profile_picture_url,
  module_access:hrm_module_access!module_access_employee_id_fkey (
    task_manager,
    task_manager_role,
    hrm_admin,
    auditing,
    crm
  )
`;
const ASSIGNMENT_ACTIVITY_SELECT = `
  id,
  entity_type,
  action,
  assigned_by_actor_type,
  created_at,
  subtask_id,
  subtask:task_subtasks!task_assignment_activity_subtask_id_fkey (
    id,
    title
  ),
  from_employee:hrm_employees!task_assignment_activity_from_employee_id_fkey (
    id,
    name,
    email,
    role,
    profile_picture_url
  ),
  to_employee:hrm_employees!task_assignment_activity_to_employee_id_fkey (
    id,
    name,
    email,
    role,
    profile_picture_url
  ),
  assigned_by_employee:hrm_employees!task_assignment_activity_assigned_by_employee_id_fkey (
    id,
    name,
    email,
    role,
    profile_picture_url
  ),
  assigned_by_admin:hrm_profiles!task_assignment_activity_assigned_by_admin_user_id_fkey (
    id,
    full_name,
    email
  )
`;

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

function getModuleAccessRecord(employee) {
  if (!employee?.module_access) return null;
  return Array.isArray(employee.module_access)
    ? employee.module_access[0] || null
    : employee.module_access;
}

function employeeHasTaskManagerAccess(employee) {
  return Boolean(getModuleAccessRecord(employee)?.task_manager);
}

export function isMissingTaskCreatorEmployeeColumn(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('created_by_employee_id') && message.includes('does not exist');
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
    .from('hrm_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!isHrAdminRole(profile?.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase, user };
}

export async function requireTaskManager(request) {
  const actor = await getActor(request, { requireTaskManagerAccess: true });
  if (!actor) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (actor.type !== 'admin' && actor.type !== 'employee') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase: adminClient, actor };
}

async function getActorFromSupabaseUser() {
  return getActorFromSupabaseUserWithOptions({});
}

async function getActorFromSupabaseUserWithOptions(options = {}) {
  const { requireTaskManagerAccess = false } = options;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Run profile + employee lookups in parallel (both only need user.id)
  const [{ data: profile }, { data: employee }] = await Promise.all([
    supabase
      .from('hrm_profiles')
      .select('role, full_name, email, employee_id')
      .eq('id', user.id)
      .maybeSingle(),
    adminClient
      .from('hrm_employees')
      .select(`
        id,
        employee_id,
        username,
        name,
        email,
        role,
        profile_picture_url,
        module_access:hrm_module_access!module_access_employee_id_fkey (
          task_manager,
          task_manager_role,
          hrm_admin,
          auditing,
          crm
        )
      `)
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ]);

  let resolvedEmployee = employee || null;

  if (!resolvedEmployee) {
    const profileEmployeeId =
      typeof profile?.employee_id === 'string' ? profile.employee_id.trim() : '';
    const metadataEmployeeId =
      typeof user.user_metadata?.employee_id === 'string' ? user.user_metadata.employee_id.trim() : '';
    const metadataEmployeeUuid =
      typeof user.user_metadata?.employee_uuid === 'string' ? user.user_metadata.employee_uuid.trim() : '';

    if (metadataEmployeeUuid) {
      const { data: employeeByUuid } = await adminClient
        .from('hrm_employees')
        .select(`
          id,
          employee_id,
          username,
          name,
          email,
          role,
          profile_picture_url,
          module_access:hrm_module_access!module_access_employee_id_fkey (
            task_manager,
            task_manager_role,
            hrm_admin,
            auditing,
            crm
          )
        `)
        .eq('id', metadataEmployeeUuid)
        .maybeSingle();

      resolvedEmployee = employeeByUuid || resolvedEmployee;
    }

    if (!resolvedEmployee && (profileEmployeeId || metadataEmployeeId)) {
      const employeeCode = profileEmployeeId || metadataEmployeeId;
      const { data: employeeByCode } = await adminClient
        .from('hrm_employees')
        .select(`
          id,
          employee_id,
          username,
          name,
          email,
          role,
          profile_picture_url,
          module_access:hrm_module_access!module_access_employee_id_fkey (
            task_manager,
            task_manager_role,
            hrm_admin,
            auditing,
            crm
          )
        `)
        .ilike('employee_id', employeeCode)
        .maybeSingle();

      resolvedEmployee = employeeByCode || null;
    }
  }

  if (isHrAdminRole(profile?.role)) {
    return {
      type: 'admin',
      userId: user.id,
      authUserId: user.id,
      adminRole: normalizeProfileRole(profile?.role),
      isSuperAdmin: isSuperAdminRole(profile?.role),
      name: profile?.full_name || user.email || 'Admin',
      email: user.email || '',
      avatarUrl: user.user_metadata?.avatar_url || null,
    };
  }

  if (!resolvedEmployee) return null;
  if (requireTaskManagerAccess && !employeeHasTaskManagerAccess(resolvedEmployee)) return null;

  return {
    type: 'employee',
    employeeId: resolvedEmployee.id,
    authUserId: user.id,
    isSuperAdmin: false,
    name: resolvedEmployee.name || profile?.full_name || user.email || 'Employee',
    email: resolvedEmployee.email || profile?.email || user.email || '',
    role: resolvedEmployee.role || 'Employee',
    avatarUrl: resolvedEmployee.profile_picture_url || user.user_metadata?.avatar_url || null,
    moduleAccess: getModuleAccessRecord(resolvedEmployee),
  };
}

export async function getActor(request, options = {}) {
  return getActorFromSupabaseUserWithOptions(options);
}

export async function hasTaskAccess(taskId, actor) {
  if (!actor) return false;
  if (actor.type === 'admin') return true;

  const [{ data: assignment, error: assignmentError }, { data: createdTask, error: createdTaskError }] = await Promise.all([
    adminClient
    .from('task_assignments')
    .select('task_id')
    .eq('task_id', taskId)
    .eq('employee_id', actor.employeeId)
      .maybeSingle(),
    adminClient
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('created_by_employee_id', actor.employeeId)
      .maybeSingle(),
  ]);

  return (
    (!assignmentError && !!assignment) ||
    (!isMissingTaskCreatorEmployeeColumn(createdTaskError) && !createdTaskError && !!createdTask)
  );
}

export function isTaskCreator(task, actor) {
  if (!task || !actor) return false;
  if (actor.type === 'admin') return !!actor.authUserId && task.created_by === actor.authUserId;
  if (actor.type === 'employee') return !!actor.employeeId && task.created_by_employee_id === actor.employeeId;
  return false;
}

export async function fetchEmployeeDirectory(supabase = adminClient, options = {}) {
  const { taskManagerOnly = false } = options;
  const { data, error } = await supabase
    .from('hrm_employees')
    .select(EMPLOYEE_DIRECTORY_SELECT)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const employees = data || [];
  return taskManagerOnly
    ? employees.filter((employee) => employeeHasTaskManagerAccess(employee))
    : employees;
}

export async function findEmployeeById(employeeId, supabase = adminClient, options = {}) {
  const { taskManagerOnly = false } = options;
  if (!employeeId) return null;

  const { data, error } = await supabase
    .from('hrm_employees')
    .select(EMPLOYEE_DIRECTORY_SELECT)
    .eq('id', employeeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;
  if (taskManagerOnly && !employeeHasTaskManagerAccess(data)) {
    return null;
  }

  return data;
}

export async function getTaskAssignmentEmployeeIds(taskId, supabase = adminClient) {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('employee_id')
    .eq('task_id', taskId);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => row.employee_id).filter(Boolean);
}

export function getAssignmentActivityActorPayload(actor) {
  if (!actor?.type) {
    throw new Error('Assignment activity actor is required');
  }

  if (actor.type === 'admin') {
    if (!actor.userId) {
      throw new Error('Admin actor is missing userId');
    }

    return {
      assigned_by_actor_type: 'admin',
      assigned_by_admin_user_id: actor.userId,
      assigned_by_employee_id: null,
    };
  }

  if (actor.type === 'employee') {
    if (!actor.employeeId) {
      throw new Error('Employee actor is missing employeeId');
    }

    return {
      assigned_by_actor_type: 'employee',
      assigned_by_admin_user_id: null,
      assigned_by_employee_id: actor.employeeId,
    };
  }

  throw new Error(`Unsupported actor type: ${actor.type}`);
}

export function getAssignmentActivityAction(fromEmployeeId, toEmployeeId) {
  const fromId = fromEmployeeId || null;
  const toId = toEmployeeId || null;

  if (fromId === toId) {
    return null;
  }

  if (!fromId && toId) {
    return 'assigned';
  }

  if (fromId && !toId) {
    return 'unassigned';
  }

  if (fromId && toId) {
    return 'reassigned';
  }

  return null;
}

export async function insertAssignmentActivityRows(rows, supabase = adminClient) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('task_assignment_activity')
    .insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchAssignmentActivity(taskId, supabase = adminClient) {
  const { data, error } = await supabase
    .from('task_assignment_activity')
    .select(ASSIGNMENT_ACTIVITY_SELECT)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    action: row.action,
    createdAt: row.created_at,
    subtaskId: row.subtask_id,
    subtaskTitle: row.subtask?.title || null,
    fromEmployee: row.from_employee || null,
    toEmployee: row.to_employee || null,
    actor: row.assigned_by_actor_type === 'employee'
      ? row.assigned_by_employee || null
      : {
          id: row.assigned_by_admin?.id || null,
          name: row.assigned_by_admin?.full_name || row.assigned_by_admin?.email || null,
          email: row.assigned_by_admin?.email || '',
          role: 'admin',
          profile_picture_url: null,
        },
  }));
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


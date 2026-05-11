import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  findEmployeeById,
  insertAssignmentActivityRows,
  isMissingTaskCreatorEmployeeColumn,
} from '@/utils/api-helpers';

const EMPLOYEE_TASK_SELECT = `
  id,
  task_name,
  description,
  label,
  priority,
  status,
  progress_percentage,
  created_by,
  created_by_employee_id,
  created_at,
  due_date,
  task_attachments (
    id
  ),
  task_subtasks (
    id,
    title,
    is_completed,
    assigned_employee_id,
    created_at
  ),
  task_assignments (
    employee:hrm_employees (
      id,
      name,
      email,
      role,
      profile_picture_url
    )
  )
`;

const EMPLOYEE_TASK_SELECT_LEGACY = EMPLOYEE_TASK_SELECT
  .replace(/\s*created_by_employee_id,\n/, '\n');

async function attachTaskCreatorNames(tasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const employeeIds = Array.from(
    new Set(tasks.map((task) => task?.created_by_employee_id).filter(Boolean))
  );
  const profileIds = Array.from(
    new Set(tasks.map((task) => task?.created_by).filter(Boolean))
  );

  const [employeeResult, profileResult] = await Promise.all([
    employeeIds.length > 0
      ? adminClient
        .from('hrm_employees')
        .select('id, name, email')
        .in('id', employeeIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length > 0
      ? adminClient
        .from('hrm_profiles')
        .select('id, full_name, email')
        .in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (employeeResult.error) {
    throw new Error(employeeResult.error.message || 'Failed to load task creators');
  }

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Failed to load task creators');
  }

  const employeeById = new Map((employeeResult.data || []).map((item) => [item.id, item]));
  const profileById = new Map((profileResult.data || []).map((item) => [item.id, item]));

  return tasks.map((task) => {
    const employeeCreator = task?.created_by_employee_id
      ? employeeById.get(task.created_by_employee_id)
      : null;
    const profileCreator = task?.created_by
      ? profileById.get(task.created_by)
      : null;

    return {
      ...task,
      creator_name:
        employeeCreator?.name ||
        profileCreator?.full_name ||
        employeeCreator?.email ||
        profileCreator?.email ||
        null,
    };
  });
}

async function employeeCanAccessTask(taskId, employeeId) {
  const [{ data: assignment, error: assignmentError }, { data: createdTask, error: createdTaskError }] = await Promise.all([
    adminClient
      .from('task_assignments')
      .select('task_id')
      .eq('task_id', taskId)
      .eq('employee_id', employeeId)
      .maybeSingle(),
    adminClient
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('created_by_employee_id', employeeId)
      .maybeSingle(),
  ]);

  return (
    (!assignmentError && !!assignment) ||
    (!isMissingTaskCreatorEmployeeColumn(createdTaskError) && !createdTaskError && !!createdTask)
  );
}

async function findTaskManagerMembers() {
  const { data: members, error } = await adminClient
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
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to load task members');
  }

  return (members || []).filter((member) => {
    const access = Array.isArray(member.module_access) ? member.module_access[0] : member.module_access;
    return Boolean(access?.task_manager);
  });
}

async function getEmployeeActor(request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);

  if (!hasLinkedEmployeeAccess(authContext)) {
    return { error: 'Forbidden', status: 403 };
  }

  const employeeId =
    authContext.employee?.id ||
    user.user_metadata?.employee_uuid ||
    null;

  if (!employeeId) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: employee, error: employeeError } = await adminClient
    .from('hrm_employees')
    .select(`
      id,
      name,
      email,
      role,
      employee_id,
      username,
      profile_picture_url,
      module_access:hrm_module_access!module_access_employee_id_fkey (
        task_manager
      )
    `)
    .eq('id', employeeId)
    .single();

  if (employeeError || !employee) {
    return { error: 'Unauthorized', status: 401 };
  }

  const moduleAccess = Array.isArray(employee.module_access)
    ? employee.module_access[0]
    : employee.module_access;

  if (!moduleAccess?.task_manager) {
    return { error: 'Task Manager access is not enabled', status: 403 };
  }

  return { employee };
}

export async function GET(request) {
  try {
    const actorData = await getEmployeeActor(request);

    if (actorData.error) {
      return NextResponse.json({ error: actorData.error }, { status: actorData.status });
    }

    const employee = actorData.employee;

    let [{ data: assignmentRows, error: tasksError }, { data: createdTasks, error: createdTasksError }] = await Promise.all([
      adminClient
      .from('task_assignments')
      .select(`
        task:tasks (
          ${EMPLOYEE_TASK_SELECT}
        )
      `)
      .eq('employee_id', employee.id)
        .order('assigned_at', { ascending: false }),
      adminClient
        .from('tasks')
        .select(EMPLOYEE_TASK_SELECT)
        .eq('created_by_employee_id', employee.id)
        .order('created_at', { ascending: false }),
    ]);

    if (isMissingTaskCreatorEmployeeColumn(tasksError) || isMissingTaskCreatorEmployeeColumn(createdTasksError)) {
      const legacyResult = await adminClient
        .from('task_assignments')
        .select(`
          task:tasks (
            ${EMPLOYEE_TASK_SELECT_LEGACY}
          )
        `)
        .eq('employee_id', employee.id)
        .order('assigned_at', { ascending: false });

      assignmentRows = legacyResult.data || [];
      tasksError = legacyResult.error;
      createdTasks = [];
      createdTasksError = null;
    }

    if (tasksError) {
      return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    if (createdTasksError) {
      return NextResponse.json({ error: createdTasksError.message }, { status: 500 });
    }

    const tasksById = new Map();
    for (const task of (assignmentRows || []).map((row) => row.task).filter(Boolean)) {
      tasksById.set(task.id, task);
    }
    for (const task of createdTasks || []) {
      tasksById.set(task.id, task);
    }
    const tasks = Array.from(tasksById.values()).sort(
      (left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
    );
    const tasksWithCreators = await attachTaskCreatorNames(tasks);

    const members = await findTaskManagerMembers();

    const stats = {
      total: tasksWithCreators.length,
      pending: tasksWithCreators.filter((task) => task.status === 'pending').length,
      inProgress: tasksWithCreators.filter((task) => task.status === 'in_progress').length,
      completed: tasksWithCreators.filter((task) => task.status === 'completed').length,
    };

    return NextResponse.json({ employee, tasks: tasksWithCreators, members, stats, success: true });
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks', success: false }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const actorData = await getEmployeeActor(request);

    if (actorData.error) {
      return NextResponse.json({ error: actorData.error }, { status: actorData.status });
    }

    const employee = actorData.employee;
    const { taskId, status, subtaskTitle, subtaskId, isCompleted, assignedEmployeeId } = await request.json();

    if (taskId && subtaskTitle) {
      const cleanTitle = String(subtaskTitle).trim();
      const nextAssignedEmployeeId = assignedEmployeeId || null;

      if (!cleanTitle) {
        return NextResponse.json({ error: 'subtaskTitle is required' }, { status: 400 });
      }

      const canAccessTask = await employeeCanAccessTask(taskId, employee.id);

      if (!canAccessTask) {
        return NextResponse.json({ error: 'Task is not assigned to you or created by you' }, { status: 403 });
      }

      if (nextAssignedEmployeeId) {
        const employeeRecord = await findEmployeeById(nextAssignedEmployeeId, adminClient, {
          taskManagerOnly: true,
        });
        if (!employeeRecord) {
          return NextResponse.json({ error: 'Assigned employee not found' }, { status: 400 });
        }
      }

      const { data: subtask, error: subtaskInsertError } = await adminClient
        .from('task_subtasks')
        .insert({
          task_id: taskId,
          title: cleanTitle,
          is_completed: false,
          assigned_employee_id: nextAssignedEmployeeId,
        })
        .select()
        .single();

      if (subtaskInsertError) {
        return NextResponse.json({ error: subtaskInsertError.message }, { status: 500 });
      }

      if (nextAssignedEmployeeId) {
        await insertAssignmentActivityRows([
          {
            task_id: taskId,
            subtask_id: subtask.id,
            entity_type: 'subtask',
            action: 'assigned',
            assigned_by_actor_type: 'employee',
            assigned_by_admin_user_id: null,
            assigned_by_employee_id: employee.id,
            from_employee_id: null,
            to_employee_id: nextAssignedEmployeeId,
          },
        ], adminClient);
      }

      return NextResponse.json({ success: true, subtask });
    }

    if (subtaskId && typeof isCompleted === 'boolean') {
      const { data: subtask, error: subtaskError } = await adminClient
        .from('task_subtasks')
        .select('id, task_id, assigned_employee_id')
        .eq('id', subtaskId)
        .single();

      if (subtaskError || !subtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }

      const canAccessTask = await employeeCanAccessTask(subtask.task_id, employee.id);

      if (!canAccessTask) {
        return NextResponse.json({ error: 'Task is not assigned to you or created by you' }, { status: 403 });
      }

      if (subtask.assigned_employee_id && subtask.assigned_employee_id !== employee.id) {
        return NextResponse.json({ error: 'Subtask is assigned to another employee' }, { status: 403 });
      }

      const { error: subtaskUpdateError } = await adminClient
        .from('task_subtasks')
        .update({
          is_completed: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subtaskId);

      if (subtaskUpdateError) {
        return NextResponse.json({ error: subtaskUpdateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Subtask updated' });
    }

    if (!taskId || !status) {
      return NextResponse.json({ error: 'taskId and status are required' }, { status: 400 });
    }

    const allowedStatuses = ['pending', 'in_progress', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Employees can only set status to pending, in_progress, or completed' },
        { status: 400 }
      );
    }

    const canAccessTask = await employeeCanAccessTask(taskId, employee.id);

    if (!canAccessTask) {
      return NextResponse.json({ error: 'Task is not assigned to you or created by you' }, { status: 403 });
    }

    const { data: updatedTasks, error: updateTaskError } = await adminClient
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .neq('status', status)
      .select('id');

    if (updateTaskError) {
      return NextResponse.json({ error: updateTaskError.message }, { status: 500 });
    }

    if (!updatedTasks || updatedTasks.length === 0) {
      return NextResponse.json({ success: true, message: 'Task status unchanged' });
    }

    return NextResponse.json({ success: true, message: 'Task status updated' });
  } catch (error) {
    console.error('Error updating employee task status:', error);
    return NextResponse.json({ error: 'Failed to update task status', success: false }, { status: 500 });
  }
}


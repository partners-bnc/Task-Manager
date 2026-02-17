import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';

const SESSION_COOKIE = 'employee_session';

async function getSessionEmployee(request) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: session, error: sessionError } = await adminClient
    .from('employee_sessions')
    .select('employee_id, expires_at')
    .eq('token', sessionToken)
    .single();

  if (sessionError || !session) {
    return { error: 'Unauthorized', status: 401 };
  }

  const isExpired = new Date(session.expires_at).getTime() <= Date.now();
  if (isExpired) {
    await adminClient.from('employee_sessions').delete().eq('token', sessionToken);
    return { error: 'Session expired', status: 401 };
  }

  if (!session.employee_id) {
    await adminClient.from('employee_sessions').delete().eq('token', sessionToken);
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: employee, error: employeeError } = await adminClient
    .from('employees')
    .select('id, name, email, role, employee_id, username, profile_picture_url')
    .eq('id', session.employee_id)
    .single();

  if (employeeError || !employee) {
    await adminClient.from('employee_sessions').delete().eq('token', sessionToken);
    return { error: 'Unauthorized', status: 401 };
  }

  return { sessionToken, employee };
}

export async function GET(request) {
  try {
    const sessionData = await getSessionEmployee(request);

    if (sessionData.error) {
      return NextResponse.json({ error: sessionData.error }, { status: sessionData.status });
    }

    const employee = sessionData.employee;

    const { data: assignmentRows, error: tasksError } = await adminClient
      .from('task_assignments')
      .select(`
        task:tasks (
          id,
          task_name,
          description,
          priority,
          status,
          created_at,
          due_date,
          task_attachments (
            id
          ),
          task_subtasks (
            id,
            title,
            is_completed,
            created_at
          ),
          task_assignments (
            employee:employees (
              id,
              name,
              email,
              role,
              profile_picture_url
            )
          )
        )
      `)
      .eq('employee_id', employee.id)
      .order('assigned_at', { ascending: false });

    if (tasksError) {
      return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    const tasks = (assignmentRows || []).map((row) => row.task).filter(Boolean);

    const memberMap = new Map();
    memberMap.set(employee.id, employee);

    for (const task of tasks) {
      const assignments = Array.isArray(task?.task_assignments) ? task.task_assignments : [];
      for (const assignment of assignments) {
        const teammate = assignment?.employee;
        if (teammate?.id) {
          memberMap.set(teammate.id, teammate);
        }
      }
    }

    const members = Array.from(memberMap.values());

    const stats = {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    };

    return NextResponse.json({ employee, tasks, members, stats, success: true });
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks', success: false }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const sessionData = await getSessionEmployee(request);

    if (sessionData.error) {
      return NextResponse.json({ error: sessionData.error }, { status: sessionData.status });
    }

    const employee = sessionData.employee;
    const { taskId, status, subtaskTitle, subtaskId, isCompleted } = await request.json();

    if (taskId && subtaskTitle) {
      const cleanTitle = String(subtaskTitle).trim();

      if (!cleanTitle) {
        return NextResponse.json({ error: 'subtaskTitle is required' }, { status: 400 });
      }

      const { data: assignment, error: assignmentError } = await adminClient
        .from('task_assignments')
        .select('task_id')
        .eq('task_id', taskId)
        .eq('employee_id', employee.id)
        .single();

      if (assignmentError || !assignment) {
        return NextResponse.json({ error: 'Task is not assigned to you' }, { status: 403 });
      }

      const { data: subtask, error: subtaskInsertError } = await adminClient
        .from('task_subtasks')
        .insert({
          task_id: taskId,
          title: cleanTitle,
          is_completed: false,
        })
        .select()
        .single();

      if (subtaskInsertError) {
        return NextResponse.json({ error: subtaskInsertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, subtask });
    }

    if (subtaskId && typeof isCompleted === 'boolean') {
      const { data: subtask, error: subtaskError } = await adminClient
        .from('task_subtasks')
        .select('id, task_id')
        .eq('id', subtaskId)
        .single();

      if (subtaskError || !subtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }

      const { data: assignment, error: assignmentError } = await adminClient
        .from('task_assignments')
        .select('task_id')
        .eq('task_id', subtask.task_id)
        .eq('employee_id', employee.id)
        .single();

      if (assignmentError || !assignment) {
        return NextResponse.json({ error: 'Task is not assigned to you' }, { status: 403 });
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

    const allowedStatuses = ['in_progress', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Employees can only set status to in_progress or completed' },
        { status: 400 }
      );
    }

    const { data: assignment, error: assignmentError } = await adminClient
      .from('task_assignments')
      .select('task_id')
      .eq('task_id', taskId)
      .eq('employee_id', employee.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Task is not assigned to you' }, { status: 403 });
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

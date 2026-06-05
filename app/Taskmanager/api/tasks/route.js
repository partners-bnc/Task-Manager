import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  fetchEmployeeDirectory,
  getActor,
  getAssignmentActivityActorPayload,
  isTaskCreator,
  isMissingTaskCreatorEmployeeColumn,
  normalizeDueDate,
  normalizeSubtasks,
  requireTaskManager,
  syncTaskSubtasks,
  insertAssignmentActivityRows,
} from '@/utils/api-helpers';

function normalizeLabel(label) {
  if (typeof label !== 'string') return null;
  const trimmed = label.trim();
  return trimmed || null;
}

async function ensureTaskLabelExists(supabase, label) {
  if (!label) return;

  const { error } = await supabase
    .from('task_labels')
    .upsert({ name: label }, { onConflict: 'name', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}

async function attachTaskCreatorNames(tasks = [], supabase) {
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
      ? supabase
        .from('hrm_employees')
        .select('id, name, email')
        .in('id', employeeIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length > 0
      ? supabase
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

async function taskHasIncompleteSubtasks(taskId, supabase) {
  const { count, error } = await supabase
    .from('task_subtasks')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId)
    .eq('is_completed', false);

  if (error) {
    throw error;
  }

  return (count || 0) > 0;
}


export async function GET() {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignments (
        employee:hrm_employees!task_assignments_employee_id_fkey (
          id,
          name,
          email,
          role,
          profile_picture_url
        )
      ),
      task_attachments (*),
      task_subtasks (
        id,
        title,
        is_completed,
        assigned_employee_id,
        created_at,
        updated_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tasksWithCreators = await attachTaskCreatorNames(tasks || [], supabase);
  return NextResponse.json({ tasks: tasksWithCreators });
}

export async function POST(request) {
  try {
    const auth = await requireTaskManager(request);
    if (auth.error) return auth.error;
    const { supabase, actor } = auth;

    const body = await request.json();
    const { taskName, description, priority, dueDate, assignedMembers, attachments, subtasks, label, frequency } = body;
    const normalizedSubtasks = normalizeSubtasks(subtasks);
    const normalizedDueDate = normalizeDueDate(dueDate);
    const normalizedLabel = normalizeLabel(label);
    const normalizedFrequency = ['weekly', 'monthly', 'yearly'].includes(frequency) ? frequency : null;
    const actorPayload = getAssignmentActivityActorPayload(actor);
    const employeeDirectory = await fetchEmployeeDirectory(supabase, { taskManagerOnly: true });
    const validEmployeeIds = new Set(employeeDirectory.map((employee) => employee.id));
    const invalidAssignments = (assignedMembers || []).filter((employeeId) => !validEmployeeIds.has(employeeId));

    if (invalidAssignments.length > 0) {
      return NextResponse.json({ error: 'One or more assigned members were not found' }, { status: 400 });
    }

    const invalidSubtaskAssignees = normalizedSubtasks
      .map((subtask) => subtask.assigned_employee_id)
      .filter((employeeId) => employeeId && !validEmployeeIds.has(employeeId));

    if (invalidSubtaskAssignees.length > 0) {
      return NextResponse.json({ error: 'One or more subtask assignees were not found' }, { status: 400 });
    }

    await ensureTaskLabelExists(supabase, normalizedLabel);

    const taskInsertPayload = {
      task_name: taskName,
      description,
      label: normalizedLabel,
      priority,
      due_date: normalizedDueDate,
      frequency: normalizedFrequency,
      last_cycle_reset: new Date().toISOString(),
      status: 'pending',
      created_by: actor.type === 'admin' ? actor.userId : null,
      created_by_employee_id: actor.type === 'employee' ? actor.employeeId : null,
    };

    // Insert task
    let { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert(taskInsertPayload)
      .select()
      .single();

    if (isMissingTaskCreatorEmployeeColumn(taskError)) {
      const legacyTaskInsertPayload = { ...taskInsertPayload };
      delete legacyTaskInsertPayload.created_by_employee_id;
      const legacyResult = await supabase
        .from('tasks')
        .insert(legacyTaskInsertPayload)
        .select()
        .single();
      task = legacyResult.data;
      taskError = legacyResult.error;
    }

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // Insert task attachments
    if (attachments && attachments.length > 0) {
      const attachmentRecords = attachments.map(attachment => ({
        task_id: task.id,
        file_name: attachment.file_name,
        file_url: attachment.file_url,
        file_path: attachment.file_path,
        uploaded_by_employee_id: actor.type === 'employee' ? actor.employeeId : null,
        uploaded_by_profile_id: actor.type === 'admin' ? actor.userId : null,
      }));

      const { error: attachmentError } = await supabase
        .from('task_attachments')
        .insert(attachmentRecords);

      if (attachmentError) {
        console.error('Error inserting attachments:', attachmentError);
        // Don't rollback task, just log the error
      }
    }

    // Insert task subtasks
    let createdSubtasks = [];
    if (normalizedSubtasks.length > 0) {
      const subtaskRecords = normalizedSubtasks.map((subtask) => ({
        task_id: task.id,
        title: subtask.title,
        is_completed: !!subtask.is_completed,
        assigned_employee_id: subtask.assigned_employee_id || null,
        priority: ['low', 'medium', 'high'].includes(subtask.priority) ? subtask.priority : 'medium',
        due_date: subtask.due_date || null,
        frequency: ['weekly', 'monthly', 'yearly'].includes(subtask.frequency) ? subtask.frequency : null,
        last_cycle_reset: ['weekly', 'monthly', 'yearly'].includes(subtask.frequency) ? new Date().toISOString() : null,
      }));

      const { data: insertedSubtasks, error: subtaskError } = await supabase
        .from('task_subtasks')
        .insert(subtaskRecords)
        .select('id, assigned_employee_id');

      if (subtaskError) {
        console.error('Error inserting subtasks:', subtaskError);
      } else {
        createdSubtasks = insertedSubtasks || [];
      }
    }

    // Insert task assignments
    if (assignedMembers && assignedMembers.length > 0) {
      const assignments = assignedMembers.map(employeeId => ({
        task_id: task.id,
        employee_id: employeeId
      }));

      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .insert(assignments);

      if (assignmentError) {
        // Rollback task if assignment fails
        await supabase.from('tasks').delete().eq('id', task.id);
        return NextResponse.json({ error: assignmentError.message }, { status: 500 });
      }

      await insertAssignmentActivityRows(
        assignedMembers.map((employeeId) => ({
          task_id: task.id,
          subtask_id: null,
          entity_type: 'task',
          action: 'assigned',
          from_employee_id: null,
          to_employee_id: employeeId,
          ...actorPayload,
        })),
        supabase
      );
    }

    const subtaskActivityRows = createdSubtasks
      .filter((subtask) => subtask.assigned_employee_id)
      .map((subtask) => ({
        task_id: task.id,
        subtask_id: subtask.id,
        entity_type: 'subtask',
        action: 'assigned',
        from_employee_id: null,
        to_employee_id: subtask.assigned_employee_id,
        ...actorPayload,
      }));

    await insertAssignmentActivityRows(subtaskActivityRows, supabase);

    return NextResponse.json({ task, success: true });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create task',
      success: false
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await requireTaskManager(request);
    if (auth.error) return auth.error;
    const { supabase, actor } = auth;

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { taskName, description, priority, status, dueDate, assignedMembers, removedAttachments, newAttachments, subtasks, label } = body;
    const normalizedSubtasks = normalizeSubtasks(subtasks);
    const normalizedDueDate = normalizeDueDate(dueDate);
    const normalizedLabel = normalizeLabel(label);
    const actorPayload = getAssignmentActivityActorPayload(actor);
    const employeeDirectory = await fetchEmployeeDirectory(supabase, { taskManagerOnly: true });
    const validEmployeeIds = new Set(employeeDirectory.map((employee) => employee.id));
    const invalidAssignments = (assignedMembers || []).filter((employeeId) => !validEmployeeIds.has(employeeId));

    if (invalidAssignments.length > 0) {
      return NextResponse.json({ error: 'One or more assigned members were not found' }, { status: 400 });
    }

    const invalidSubtaskAssignees = normalizedSubtasks
      .map((subtask) => subtask.assigned_employee_id)
      .filter((employeeId) => employeeId && !validEmployeeIds.has(employeeId));

    if (invalidSubtaskAssignees.length > 0) {
      return NextResponse.json({ error: 'One or more subtask assignees were not found' }, { status: 400 });
    }

    await ensureTaskLabelExists(supabase, normalizedLabel);

    // Get old task data for employee count updates
    const { data: oldTask } = await supabase
      .from('tasks')
      .select(`
        task_assignments (employee_id)
      `)
      .eq('id', taskId)
      .single();

    if (status === 'completed') {
      const hasIncompleteSubtasks = await taskHasIncompleteSubtasks(taskId, supabase);
      if (hasIncompleteSubtasks) {
        return NextResponse.json({ error: 'Complete all subtasks before marking the task as completed' }, { status: 400 });
      }
    }

    // Update task
    const nextUpdatedAt = new Date().toISOString();
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        task_name: taskName,
        description,
        label: normalizedLabel,
        priority,
        status,
        due_date: normalizedDueDate,
        completed_at: status === 'completed' ? nextUpdatedAt : null,
        updated_at: nextUpdatedAt
      })
      .eq('id', taskId);

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // Handle assignment changes
    const oldAssignments = oldTask?.task_assignments?.map(a => a.employee_id) || [];
    const newAssignments = assignedMembers || [];

    const toRemove = oldAssignments.filter(id => !newAssignments.includes(id));
    const toAdd = newAssignments.filter(id => !oldAssignments.includes(id));

    // Remove old assignments
    if (toRemove.length > 0) {
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)
        .in('employee_id', toRemove);

      await insertAssignmentActivityRows(
        toRemove.map((employeeId) => ({
          task_id: taskId,
          subtask_id: null,
          entity_type: 'task',
          action: 'unassigned',
          from_employee_id: employeeId,
          to_employee_id: null,
          ...actorPayload,
        })),
        supabase
      );
    }

    // Add new assignments
    if (toAdd.length > 0) {
      const assignments = toAdd.map(employeeId => ({
        task_id: taskId,
        employee_id: employeeId
      }));

      await supabase
        .from('task_assignments')
        .insert(assignments);

      await insertAssignmentActivityRows(
        toAdd.map((employeeId) => ({
          task_id: taskId,
          subtask_id: null,
          entity_type: 'task',
          action: 'assigned',
          from_employee_id: null,
          to_employee_id: employeeId,
          ...actorPayload,
        })),
        supabase
      );
    }

    // Remove attachments
    if (removedAttachments && removedAttachments.length > 0) {
      await supabase
        .from('task_attachments')
        .delete()
        .in('id', removedAttachments);
    }

    // Add new attachments
    if (newAttachments && newAttachments.length > 0) {
      const attachmentRecords = newAttachments.map(attachment => ({
        task_id: taskId,
        file_name: attachment.file_name,
        file_url: attachment.file_url,
        file_path: attachment.file_path,
        uploaded_by_employee_id: actor.type === 'employee' ? actor.employeeId : null,
        uploaded_by_profile_id: actor.type === 'admin' ? actor.userId : null,
      }));

      const { error: attachmentError } = await supabase
        .from('task_attachments')
        .insert(attachmentRecords);

      if (attachmentError) {
        console.error('Error inserting new attachments:', attachmentError);
        // Don't fail the request, just log the error
      }
    }

    await syncTaskSubtasks(supabase, taskId, normalizedSubtasks);

    return NextResponse.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({
      error: error.message || 'Failed to update task',
      success: false
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = adminClient;

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const { data: taskToDelete, error: fetchError } = await supabase
      .from('tasks')
      .select('created_by, created_by_employee_id')
      .eq('id', taskId)
      .single();
    let resolvedTaskToDelete = taskToDelete;
    let resolvedFetchError = fetchError;

    if (isMissingTaskCreatorEmployeeColumn(fetchError)) {
      const legacyResult = await supabase
        .from('tasks')
        .select('created_by')
        .eq('id', taskId)
        .single();
      resolvedTaskToDelete = legacyResult.data;
      resolvedFetchError = legacyResult.error;
    }

    if (resolvedFetchError || !resolvedTaskToDelete) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (actor.type !== 'admin' && !isTaskCreator(resolvedTaskToDelete, actor)) {
      return NextResponse.json({ error: 'Only task creators can delete tasks' }, { status: 403 });
    }

    // Delete the task (cascade will delete assignments and attachments)
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({
      error: error.message || 'Failed to delete task',
      success: false
    }, { status: 500 });
  }
}

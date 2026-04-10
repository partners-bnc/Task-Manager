import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  fetchAssignmentActivity,
  fetchEmployeeDirectory,
  findEmployeeById,
  getActor,
  getAssignmentActivityAction,
  getAssignmentActivityActorPayload,
  hasTaskAccess,
  normalizeDueDate,
  insertAssignmentActivityRows,
} from '@/utils/api-helpers';

const TASK_FILES_BUCKET_CANDIDATES = ['task-files', 'task_files'];

function isBucketNotFoundError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket') && message.includes('not found');
}

async function ensureTaskLabelExists(label) {
  if (!label) return;

  const { error } = await adminClient
    .from('task_labels')
    .upsert({ name: label }, { onConflict: 'name', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}

async function listStorageAttachments(bucket, folderPath) {
  const { data: items, error } = await adminClient.storage
    .from(bucket)
    .list(folderPath, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error && isBucketNotFoundError(error)) {
    return [];
  }

  if (error || !Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items
    .filter((item) => !!item?.name && !item?.metadata?.isDir)
    .map((item) => {
      const filePath = `${folderPath}/${item.name}`;
      const { data: urlData } = adminClient.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        id: `storage:${bucket}:${filePath}`,
        file_name: item.name,
        file_url: urlData?.publicUrl || '',
        file_path: filePath,
        uploaded_at: item.updated_at || item.created_at || null,
      };
    });
}

async function fetchStorageAttachments(taskId) {
  const allResults = await Promise.all(
    TASK_FILES_BUCKET_CANDIDATES.flatMap((bucket) => [
      listStorageAttachments(bucket, String(taskId)),
      listStorageAttachments(bucket, `tasks/${taskId}`),
    ])
  );

  const dedupeByPath = new Map();
  for (const attachments of allResults) {
    for (const attachment of attachments) {
      if (attachment?.id) {
        dedupeByPath.set(attachment.id, attachment);
      }
    }
  }

  return Array.from(dedupeByPath.values());
}

async function fetchTaskById(taskId) {
  const { data: task, error } = await adminClient
    .from('tasks')
    .select(`
      id,
      task_name,
      description,
      label,
      priority,
      status,
      progress_percentage,
      due_date,
      frequency,
      last_cycle_reset,
      rating,
      created_by,
      created_at,
      updated_at,
      task_assignments (
        employee_id,
        employee:hrm_employees!task_assignments_employee_id_fkey (
          id,
          name,
          email,
          role,
          profile_picture_url
        )
      ),
      task_attachments (
        id,
        file_name,
        file_url,
        file_path,
        uploaded_at
      ),
      task_subtasks (
        id,
        title,
        is_completed,
        assigned_employee_id,
        created_at,
        updated_at
      )
    `)
    .eq('id', taskId)
    .order('assigned_at', { ascending: false, referencedTable: 'task_assignments' })
    .order('uploaded_at', { ascending: false, referencedTable: 'task_attachments' })
    .order('created_at', { ascending: true, referencedTable: 'task_subtasks' })
    .single();

  if (error || !task) {
    return null;
  }

  const storageAttachments = await fetchStorageAttachments(taskId);
  const dbAttachments = Array.isArray(task.task_attachments) ? task.task_attachments : [];
  const existingFilePaths = new Set(dbAttachments.map((attachment) => attachment.file_path).filter(Boolean));

  const mergedAttachments = [
    ...dbAttachments,
    ...storageAttachments.filter((attachment) => !existingFilePaths.has(attachment.file_path)),
  ];

  return {
    ...task,
    task_attachments: mergedAttachments,
    task_subtasks: Array.isArray(task.task_subtasks) ? task.task_subtasks : [],
  };
}

export async function GET(request, { params }) {
  try {
    const { id: taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const [actor, task] = await Promise.all([
      getActor(request),
      fetchTaskById(taskId),
    ]);

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const canAccess = await hasTaskAccess(taskId, actor);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [employees, assignmentActivity, commentsResult, labelsResult] = await Promise.all([
      fetchEmployeeDirectory(adminClient, { taskManagerOnly: true }),
      fetchAssignmentActivity(taskId, adminClient),
      adminClient
        .from('task_comments')
        .select('id, task_id, author_type, author_name, author_avatar_url, comment_text, created_at, updated_at, employee_id, profile_id')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true }),
      adminClient
        .from('task_labels')
        .select('id, name, created_at')
        .order('name', { ascending: true }),
    ]);

    const comments = (commentsResult.data || []).map((comment) => ({
      ...comment,
      can_delete:
        (actor.type === 'admin' && comment.author_type === 'admin' && comment.profile_id === actor.userId) ||
        (actor.type === 'employee' && comment.author_type === 'employee' && comment.employee_id === actor.employeeId),
    }));

    const taskLabels = (labelsResult.data || []).map((item) => item.name).filter(Boolean);

    const viewer = {
      type: actor.type,
      employeeId: actor.type === 'employee' ? actor.employeeId : null,
      canManageTask: actor.type === 'admin',
      canManageSubtasks: actor.type === 'admin' || actor.type === 'employee',
      canComment: actor.type === 'admin' || actor.type === 'employee',
      canRateTask: task.status === 'completed' && !!actor.authUserId && task.created_by === actor.authUserId,
    };

    return NextResponse.json({ success: true, task, viewer, employees, assignmentActivity, comments, taskLabels });
  } catch (error) {
    console.error('Error fetching task detail:', error);
    return NextResponse.json({ error: 'Failed to fetch task detail' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id: taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAccess = await hasTaskAccess(taskId, actor);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const actorPayload = getAssignmentActivityActorPayload(actor);

    if (typeof body?.rating === 'number') {
      const { data: taskToCheck, error: fetchError } = await adminClient
        .from('tasks')
        .select('created_by, status')
        .eq('id', taskId)
        .single();
        
      if (fetchError || !taskToCheck) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      
      if (taskToCheck.created_by !== actor.authUserId) {
        return NextResponse.json({ error: 'Only the task creator can rate this task' }, { status: 403 });
      }
      if (taskToCheck.status !== 'completed') {
        return NextResponse.json({ error: 'Task must be completed before rating' }, { status: 400 });
      }
      if (body.rating < 1 || body.rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
      }
      
      const { error: ratingError } = await adminClient
        .from('tasks')
        .update({
          rating: Math.round(body.rating),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (ratingError) {
        return NextResponse.json({ error: ratingError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Task rating updated' });
    }

    if (body?.subtaskId && typeof body?.isCompleted === 'boolean') {
      if (actor.type === 'employee') {
        const { data: existingSubtask, error: subtaskFetchError } = await adminClient
          .from('task_subtasks')
          .select('id, assigned_employee_id')
          .eq('id', body.subtaskId)
          .eq('task_id', taskId)
          .maybeSingle();

        if (subtaskFetchError) {
          return NextResponse.json({ error: subtaskFetchError.message }, { status: 500 });
        }

        if (!existingSubtask) {
          return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
        }

        if (
          existingSubtask.assigned_employee_id &&
          existingSubtask.assigned_employee_id !== actor.employeeId
        ) {
          return NextResponse.json(
            { error: 'Subtask is assigned to another employee' },
            { status: 403 }
          );
        }
      }

      const { data: updatedSubtask, error: updateError } = await adminClient
        .from('task_subtasks')
        .update({
          is_completed: body.isCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.subtaskId)
        .eq('task_id', taskId)
        .select('id')
        .maybeSingle();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      if (!updatedSubtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Subtask updated' });
    }

    if (body?.subtaskId && Object.prototype.hasOwnProperty.call(body, 'assignedEmployeeId')) {
      const assignedEmployeeId = body.assignedEmployeeId || null;
      const [nextEmployee, existingSubtask] = await Promise.all([
        assignedEmployeeId
          ? findEmployeeById(assignedEmployeeId, adminClient, { taskManagerOnly: true })
          : Promise.resolve(null),
        adminClient
          .from('task_subtasks')
          .select('id, title, assigned_employee_id')
          .eq('id', body.subtaskId)
          .eq('task_id', taskId)
          .maybeSingle(),
      ]);

      if (assignedEmployeeId && !nextEmployee) {
        return NextResponse.json({ error: 'Assigned employee not found' }, { status: 400 });
      }

      if (existingSubtask.error) {
        return NextResponse.json({ error: existingSubtask.error.message }, { status: 500 });
      }

      if (!existingSubtask.data) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }

      const previousAssigneeId = existingSubtask.data.assigned_employee_id || null;
      const action = getAssignmentActivityAction(previousAssigneeId, assignedEmployeeId);
      if (!action) {
        return NextResponse.json({ success: true, message: 'Subtask assignee unchanged' });
      }

      const { data: updatedSubtask, error: updateError } = await adminClient
        .from('task_subtasks')
        .update({
          assigned_employee_id: assignedEmployeeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.subtaskId)
        .eq('task_id', taskId)
        .select('id')
        .maybeSingle();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      if (!updatedSubtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }

      await insertAssignmentActivityRows([
        {
          task_id: taskId,
          subtask_id: body.subtaskId,
          entity_type: 'subtask',
          action,
          from_employee_id: previousAssigneeId,
          to_employee_id: assignedEmployeeId,
          ...actorPayload,
        },
      ], adminClient);

      return NextResponse.json({ success: true, message: 'Subtask assignee updated' });
    }

    if (body?.subtaskId && typeof body?.subtaskTitle === 'string') {
      const title = String(body.subtaskTitle || '').trim();
      if (!title) {
        return NextResponse.json({ error: 'Subtask title is required' }, { status: 400 });
      }

      const { data: existingSubtask, error: fetchError } = await adminClient
        .from('task_subtasks')
        .select('id, title')
        .eq('id', body.subtaskId)
        .eq('task_id', taskId)
        .maybeSingle();

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      if (!existingSubtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }

      const previousTitle = existingSubtask.title || '';
      if (title === previousTitle) {
        return NextResponse.json({ success: true, message: 'Subtask title unchanged' });
      }

      const { error: updateError } = await adminClient
        .from('task_subtasks')
        .update({
          title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.subtaskId)
        .eq('task_id', taskId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Subtask title updated' });
    }

    if (body?.subtaskTitle && !body?.subtaskId) {
      const title = String(body.subtaskTitle || '').trim();
      if (!title) {
        return NextResponse.json({ error: 'Subtask title is required' }, { status: 400 });
      }

      const assignedEmployeeId = body.assignedEmployeeId || null;
      if (assignedEmployeeId) {
        const employee = await findEmployeeById(assignedEmployeeId, adminClient, {
          taskManagerOnly: true,
        });
        if (!employee) {
          return NextResponse.json({ error: 'Assigned employee not found' }, { status: 400 });
        }
      }

      const { data: newSubtask, error: insertError } = await adminClient
        .from('task_subtasks')
        .insert({
          task_id: taskId,
          title,
          assigned_employee_id: assignedEmployeeId,
        })
        .select('id')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      if (assignedEmployeeId) {
        await insertAssignmentActivityRows([
          {
            task_id: taskId,
            subtask_id: newSubtask.id,
            entity_type: 'subtask',
            action: 'assigned',
            from_employee_id: null,
            to_employee_id: assignedEmployeeId,
            ...actorPayload,
          },
        ], adminClient);
      }

      return NextResponse.json({ success: true, message: 'Subtask created', subtaskId: newSubtask.id });
    }

    // Handle status-only update (allowed for employees with task access and admins)
    // This is used by the status buttons in the UI
    if (typeof body?.status === 'string' && Object.keys(body).length === 1) {
      const normalizedStatus = ['pending', 'in_progress', 'completed'].includes(body.status) ? body.status : 'pending';

      const { error: updateError } = await adminClient
        .from('tasks')
        .update({
          status: normalizedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Task status updated' });
    }

    // Handle task main fields update (taskName, description, label, priority, dueDate, frequency, status)
    // These fields require admin privileges
    const hasMainFields =
      typeof body?.taskName === 'string' ||
      typeof body?.description === 'string' ||
      typeof body?.label === 'string' ||
      typeof body?.priority === 'string' ||
      Object.prototype.hasOwnProperty.call(body, 'dueDate') ||
      Object.prototype.hasOwnProperty.call(body, 'frequency') ||
      typeof body?.status === 'string';

    if (hasMainFields) {
      // Require admin for main task fields update
      if (actor.type !== 'admin') {
        return NextResponse.json({ error: 'Only admins can update task details' }, { status: 403 });
      }

      const updatePayload = {};
      if (typeof body?.taskName === 'string') {
        const taskName = body.taskName.trim();
        if (!taskName) {
          return NextResponse.json({ error: 'Task name cannot be empty' }, { status: 400 });
        }
        updatePayload.task_name = taskName;
      }
      if (typeof body?.description === 'string') {
        updatePayload.description = body.description;
      }
      if (typeof body?.label === 'string') {
        updatePayload.label = body.label || null;
        await ensureTaskLabelExists(updatePayload.label);
      }
      if (typeof body?.priority === 'string') {
        const priority = ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium';
        updatePayload.priority = priority;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'dueDate')) {
        updatePayload.due_date = normalizeDueDate(body.dueDate);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'frequency')) {
        const frequency = ['weekly', 'monthly', 'yearly'].includes(body.frequency) ? body.frequency : null;
        updatePayload.frequency = frequency;
      }
      if (typeof body?.status === 'string') {
        const normalizedStatus = ['pending', 'in_progress', 'completed'].includes(body.status) ? body.status : 'pending';
        updatePayload.status = normalizedStatus;
      }

      if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
      }

      updatePayload.updated_at = new Date().toISOString();

      const { error: updateError } = await adminClient
        .from('tasks')
        .update(updatePayload)
        .eq('id', taskId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Task updated' });
    }

    // Handle progress percentage update (allowed for admins and employees with task access)
    if (typeof body?.progressPercentage === 'number') {
      const progress = Math.min(100, Math.max(0, Math.round(body.progressPercentage)));

      const { error: updateError } = await adminClient
        .from('tasks')
        .update({
          progress_percentage: progress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Task progress updated' });
    }

    // If nothing matched, return error
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

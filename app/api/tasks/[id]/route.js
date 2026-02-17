import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { getActor, hasTaskAccess, normalizeDueDate } from '@/utils/api-helpers';

const TASK_FILES_BUCKET_CANDIDATES = ['task-files', 'task_files'];

function isBucketNotFoundError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket') && message.includes('not found');
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
  const allAttachments = [];

  for (const bucket of TASK_FILES_BUCKET_CANDIDATES) {
    const [taskFolderAttachments, tasksFolderAttachments] = await Promise.all([
      listStorageAttachments(bucket, String(taskId)),
      listStorageAttachments(bucket, `tasks/${taskId}`),
    ]);

    allAttachments.push(...taskFolderAttachments, ...tasksFolderAttachments);
  }

  const dedupeByPath = new Map();
  for (const attachment of allAttachments) {
    if (attachment?.id) {
      dedupeByPath.set(attachment.id, attachment);
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
      priority,
      status,
      due_date,
      created_at,
      updated_at,
      task_assignments (
        employee_id,
        employee:employees (
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

    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAccess = await hasTaskAccess(taskId, actor);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const task = await fetchTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const viewer = {
      type: actor.type,
      canManageTask: actor.type === 'admin',
      canManageSubtasks: actor.type === 'admin' || actor.type === 'employee',
      canComment: actor.type === 'admin' || actor.type === 'employee',
    };

    return NextResponse.json({ success: true, task, viewer });
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

    if (body?.subtaskId && typeof body?.isCompleted === 'boolean') {
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

    if (body?.subtaskTitle) {
      const title = String(body.subtaskTitle || '').trim();
      if (!title) {
        return NextResponse.json({ error: 'Subtask title is required' }, { status: 400 });
      }

      const { data: subtask, error: insertError } = await adminClient
        .from('task_subtasks')
        .insert({
          task_id: taskId,
          title,
          is_completed: false,
        })
        .select('id, task_id, title, is_completed, created_at, updated_at')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Subtask added', subtask });
    }

    const allowedStatuses = ['pending', 'in_progress', 'completed'];
    const allowedPriorities = ['low', 'medium', 'high'];

    if (actor.type !== 'admin' && body?.status) {
      if (!['pending', 'in_progress', 'completed'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Employees can only set status to pending, in_progress, or completed' },
          { status: 400 }
        );
      }

      const { error: statusError } = await adminClient
        .from('tasks')
        .update({
          status: body.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (statusError) {
        return NextResponse.json({ error: statusError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Task status updated' });
    }

    if (actor.type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      updatePayload.description = body.description.trim();
    }

    if (typeof body?.priority === 'string') {
      if (!allowedPriorities.includes(body.priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
      }
      updatePayload.priority = body.priority;
    }

    if (typeof body?.status === 'string') {
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updatePayload.status = body.status;
    }

    if (Object.prototype.hasOwnProperty.call(body || {}, 'dueDate')) {
      updatePayload.due_date = normalizeDueDate(body?.dueDate);
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
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
  } catch (error) {
    console.error('Error updating task detail:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

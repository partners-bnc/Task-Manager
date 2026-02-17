import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin, normalizeDueDate, normalizeSubtasks, syncTaskSubtasks } from '@/utils/api-helpers';


export async function GET() {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignments (
        employee:employees (
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
        created_at,
        updated_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks });
}

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { supabase, user } = auth;

    const body = await request.json();
    const { taskName, description, priority, dueDate, assignedMembers, attachments, subtasks } = body;
    const normalizedSubtasks = normalizeSubtasks(subtasks);
    const normalizedDueDate = normalizeDueDate(dueDate);

    // Insert task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        task_name: taskName,
        description,
        priority,
        due_date: normalizedDueDate,
        status: 'pending',
        created_by: user.id
      })
      .select()
      .single();

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // Insert task attachments
    if (attachments && attachments.length > 0) {
      const attachmentRecords = attachments.map(attachment => ({
        task_id: task.id,
        file_name: attachment.file_name,
        file_url: attachment.file_url,
        file_path: attachment.file_path
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
    if (normalizedSubtasks.length > 0) {
      const subtaskRecords = normalizedSubtasks.map((subtask) => ({
        task_id: task.id,
        title: subtask.title,
        is_completed: !!subtask.is_completed,
      }));

      const { error: subtaskError } = await supabase
        .from('task_subtasks')
        .insert(subtaskRecords);

      if (subtaskError) {
        console.error('Error inserting subtasks:', subtaskError);
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

    }

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
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { taskName, description, priority, status, dueDate, assignedMembers, removedAttachments, newAttachments, subtasks } = body;
    const normalizedSubtasks = normalizeSubtasks(subtasks);
    const normalizedDueDate = normalizeDueDate(dueDate);

    // Get old task data for employee count updates
    const { data: oldTask } = await supabase
      .from('tasks')
      .select(`
        task_assignments (employee_id)
      `)
      .eq('id', taskId)
      .single();

    // Update task
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        task_name: taskName,
        description,
        priority,
        status,
        due_date: normalizedDueDate,
        updated_at: new Date().toISOString()
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
        file_path: attachment.file_path
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
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
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

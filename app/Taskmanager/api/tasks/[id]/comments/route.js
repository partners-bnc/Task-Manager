import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { getActor, hasTaskAccess } from '@/utils/api-helpers';

function canDeleteComment(comment, actor) {
  if (actor.type === 'admin') {
    return comment.author_type === 'admin' && comment.profile_id === actor.userId;
  }
  if (actor.type === 'employee') {
    return comment.author_type === 'employee' && comment.employee_id === actor.employeeId;
  }
  return false;
}

async function validateSubtask(taskId, subtaskId) {
  if (!subtaskId) return null;

  const { data: subtask, error } = await adminClient
    .from('task_subtasks')
    .select('id, task_id')
    .eq('id', subtaskId)
    .eq('task_id', taskId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return subtask || null;
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

    const { searchParams } = new URL(request.url);
    const subtaskId = searchParams.get('subtaskId');

    if (subtaskId) {
      const subtask = await validateSubtask(taskId, subtaskId);
      if (!subtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }
    }

    let query = adminClient
      .from('task_comments')
      .select('id, task_id, subtask_id, author_type, author_name, author_avatar_url, comment_text, created_at, updated_at, employee_id, profile_id')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (subtaskId) {
      query = query.eq('subtask_id', subtaskId);
    }

    const { data: comments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const hydratedComments = (comments || []).map((comment) => ({
      ...comment,
      can_delete: canDeleteComment(comment, actor),
    }));

    return NextResponse.json({ success: true, comments: hydratedComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
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
    const commentText = String(body?.commentText || '').trim();
    const subtaskId = String(body?.subtaskId || '').trim() || null;

    if (!commentText) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    if (subtaskId) {
      const subtask = await validateSubtask(taskId, subtaskId);
      if (!subtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }
    }

    const insertData = {
      task_id: taskId,
      subtask_id: subtaskId,
      comment_text: commentText,
      author_type: actor.type,
      author_name: actor.name || actor.email || 'Unknown',
      author_avatar_url: actor.avatarUrl || null,
    };

    if (actor.type === 'employee') {
      insertData.employee_id = actor.employeeId;
    }
    if (actor.type === 'admin') {
      insertData.profile_id = actor.userId;
    }

    const { data: comment, error } = await adminClient
      .from('task_comments')
      .insert(insertData)
      .select('id, task_id, subtask_id, author_type, author_name, author_avatar_url, comment_text, created_at, updated_at, employee_id, profile_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment: { ...comment, can_delete: true } });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const subtaskId = searchParams.get('subtaskId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    if (subtaskId) {
      const subtask = await validateSubtask(taskId, subtaskId);
      if (!subtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }
    }

    let fetchQuery = adminClient
      .from('task_comments')
      .select('id, task_id, subtask_id, author_type, author_name, author_avatar_url, comment_text, created_at, updated_at, employee_id, profile_id')
      .eq('id', commentId)
      .eq('task_id', taskId);

    if (subtaskId) {
      fetchQuery = fetchQuery.eq('subtask_id', subtaskId);
    }

    const { data: existingComment, error: fetchError } = await fetchQuery.maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (!canDeleteComment(existingComment, actor)) {
      return NextResponse.json({ error: 'You are not authorized to delete this comment' }, { status: 403 });
    }

    let deleteQuery = adminClient
      .from('task_comments')
      .delete()
      .eq('id', commentId)
      .eq('task_id', taskId);

    if (subtaskId) {
      deleteQuery = deleteQuery.eq('subtask_id', subtaskId);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
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
    const commentId = body?.commentId;
    const commentText = String(body?.commentText || '').trim();
    const subtaskId = body?.subtaskId || null;

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    if (!commentText) {
      return NextResponse.json({ error: 'Comment text cannot be empty' }, { status: 400 });
    }

    if (subtaskId) {
      const subtask = await validateSubtask(taskId, subtaskId);
      if (!subtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }
    }

    const { data: existingComment, error: fetchError } = await adminClient
      .from('task_comments')
      .select('id, task_id, subtask_id, author_type, employee_id, profile_id')
      .eq('id', commentId)
      .eq('task_id', taskId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (!canDeleteComment(existingComment, actor)) {
      return NextResponse.json({ error: 'You are not authorized to edit this comment' }, { status: 403 });
    }

    const { data: updatedComment, error: updateError } = await adminClient
      .from('task_comments')
      .update({ comment_text: commentText, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('id, task_id, subtask_id, author_type, author_name, author_avatar_url, comment_text, created_at, updated_at, employee_id, profile_id')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment: { ...updatedComment, can_delete: true } });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

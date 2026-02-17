import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { getActor, hasTaskAccess } from '@/utils/api-helpers';



function canDeleteComment(comment, actor) {
  if (!comment || !actor) return false;

  if (actor.type === 'admin') {
    return comment.author_type === 'admin' && comment.profile_id === actor.userId;
  }

  if (actor.type === 'employee') {
    return comment.author_type === 'employee' && comment.employee_id === actor.employeeId;
  }

  return false;
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

    const { data: comments, error } = await adminClient
      .from('task_comments')
      .select('id, task_id, author_type, author_name, author_avatar_url, comment_text, created_at, updated_at, employee_id, profile_id')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

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

    if (!commentText) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }

    const insertPayload = {
      task_id: taskId,
      author_type: actor.type,
      author_name: actor.name,
      author_avatar_url: actor.avatarUrl,
      comment_text: commentText,
      employee_id: actor.type === 'employee' ? actor.employeeId : null,
      profile_id: actor.type === 'admin' ? actor.userId : null,
    };

    const { data: comment, error } = await adminClient
      .from('task_comments')
      .insert(insertPayload)
      .select('id, task_id, author_type, author_name, author_avatar_url, comment_text, created_at, updated_at, employee_id, profile_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        can_delete: canDeleteComment(comment, actor),
      },
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
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

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const { data: comment, error: commentError } = await adminClient
      .from('task_comments')
      .select('id, task_id, author_type, employee_id, profile_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment || comment.task_id !== taskId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (!canDeleteComment(comment, actor)) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 });
    }

    const { error: deleteError } = await adminClient
      .from('task_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedCommentId: commentId });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

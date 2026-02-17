'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_BUTTON_STYLES = {
  pending: {
    active: 'border-purple-300 bg-purple-100 text-purple-800',
    inactive: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100',
    dot: 'bg-purple-500',
  },
  in_progress: {
    active: 'border-sky-300 bg-sky-100 text-sky-800',
    inactive: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
    dot: 'bg-sky-500',
  },
  completed: {
    active: 'border-green-300 bg-green-100 text-green-800',
    inactive: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    dot: 'bg-green-500',
  },
};

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function Avatar({ name, src, size = 'w-9 h-9' }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || 'U';

  if (!src) {
    return (
      <div
        className={`${size} rounded-full bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center`}
        title={name || 'User'}
        aria-label={name || 'User'}
      >
        {initial}
      </div>
    );
  }

  return <Image src={src} alt={name || 'User avatar'} width={36} height={36} className={`${size} rounded-full object-cover`} unoptimized />;
}

export default function TaskDetailPage({ taskId, mode = 'employee' }) {
  const [task, setTask] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingSubtaskIds, setPendingSubtaskIds] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [editForm, setEditForm] = useState({
    taskName: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
  });

  const backHref = mode === 'admin' ? '/admin/tasks' : '/dashboard';

  const canEditTask = !!viewer?.canManageTask;
  const canComment = !!viewer?.canComment;
  const canManageSubtasks = !!viewer?.canManageSubtasks;
  const canManageStatus = viewer?.type === 'admin' || viewer?.type === 'employee';

  const completion = useMemo(() => {
    const subtasks = task?.task_subtasks || [];
    const done = subtasks.filter((subtask) => subtask.is_completed).length;
    return { done, total: subtasks.length };
  }, [task]);

  const loadTaskData = async () => {
    setLoading(true);
    setError('');

    try {
      const [taskRes, commentsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`, { method: 'GET' }),
        fetch(`/api/tasks/${taskId}/comments`, { method: 'GET' }),
      ]);

      const taskJson = await taskRes.json();
      const commentsJson = await commentsRes.json();

      if (!taskRes.ok) {
        throw new Error(taskJson.error || 'Failed to load task details');
      }

      if (!commentsRes.ok) {
        throw new Error(commentsJson.error || 'Failed to load task comments');
      }

      const fetchedTask = taskJson.task;

      setTask(fetchedTask);
      setViewer(taskJson.viewer || null);
      setComments(commentsJson.comments || []);
      setEditForm({
        taskName: fetchedTask.task_name || '',
        description: fetchedTask.description || '',
        priority: fetchedTask.priority || 'medium',
        status: fetchedTask.status || 'pending',
        dueDate: fetchedTask.due_date ? new Date(fetchedTask.due_date).toISOString().slice(0, 10) : '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaskData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const handleSaveTask = async () => {
    if (!canEditTask) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update task');
      }

      await loadTaskData();
    } catch (err) {
      setError(err.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubtask = async (subtaskId, isCompleted) => {
    if (!canManageSubtasks) return;

    if (pendingSubtaskIds.includes(subtaskId)) return;

    const nextCompleted = !isCompleted;

    setPendingSubtaskIds((prev) => [...prev, subtaskId]);
    setTask((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        task_subtasks: (prev.task_subtasks || []).map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, is_completed: nextCompleted } : subtask
        ),
      };
    });

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, isCompleted: nextCompleted }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update subtask');
      }
    } catch (err) {
      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          task_subtasks: (prev.task_subtasks || []).map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, is_completed: isCompleted } : subtask
          ),
        };
      });
      setError(err.message || 'Failed to update subtask');
    } finally {
      setPendingSubtaskIds((prev) => prev.filter((id) => id !== subtaskId));
    }
  };

  const updateTaskStatus = async (nextStatus) => {
    if (!canManageStatus || !task || task.status === nextStatus) return;

    const previousStatus = task.status;
    setSaving(true);
    setError('');
    setTask((prev) => (prev ? { ...prev, status: nextStatus } : prev));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update task status');
      }
    } catch (err) {
      setTask((prev) => (prev ? { ...prev, status: previousStatus } : prev));
      setError(err.message || 'Failed to update task status');
    } finally {
      setSaving(false);
    }
  };

  const addChecklistItem = async () => {
    const title = newSubtaskTitle.trim();
    if (!title || !canManageSubtasks) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskTitle: title }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add checklist item');
      }

      if (result.subtask) {
        setTask((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            task_subtasks: [...(prev.task_subtasks || []), result.subtask],
          };
        });
      }

      setNewSubtaskTitle('');
    } catch (err) {
      setError(err.message || 'Failed to add checklist item');
    } finally {
      setSaving(false);
    }
  };

  const postComment = async () => {
    const text = commentText.trim();
    if (!text || !canComment) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentText: text }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to post comment');
      }

      setComments((prev) => [...prev, result.comment]);
      setCommentText('');
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSaving(false);
    }
  };

  const removeComment = async (commentId) => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete comment');
      }

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (err) {
      setError(err.message || 'Failed to delete comment');
    } finally {
      setSaving(false);
    }
  };

  const deleteTaskFromDetail = async () => {
    if (!canEditTask || !taskId) return;

    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Are you sure you want to delete this task? This action cannot be undone.')
      : false;

    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete task');
      }

      if (typeof window !== 'undefined') {
        window.location.href = backHref;
      }
    } catch (err) {
      setError(err.message || 'Failed to delete task');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 p-8'>
        <div className='mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-6 text-slate-500'>
          Loading task details...
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className='min-h-screen bg-slate-50 p-8'>
        <div className='mx-auto max-w-5xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700'>
          {error || 'Task not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50 p-8'>
      <div className='mx-auto max-w-5xl space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <Link href={backHref} className='text-sm font-medium text-[#7F40EE] hover:underline'>
              ← Back to tasks
            </Link>
            <h1 className='mt-2 text-2xl font-bold text-slate-900'>{task.task_name}</h1>
            <p className='mt-1 text-sm text-slate-500'>Created {formatDate(task.created_at)}</p>
          </div>

          {canEditTask && (
            <button
              type='button'
              disabled={saving}
              onClick={deleteTaskFromDetail}
              className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60'
            >
              Delete Task
            </button>
          )}
        </div>

        {error && (
          <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        <div className='grid gap-6 lg:grid-cols-[2fr_1fr]'>
          <section className='rounded-xl bg-white p-6 shadow-sm space-y-5'>
            <div className='flex flex-wrap gap-2'>
              <span className='rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold uppercase text-purple-700'>
                {task.status.replace('_', ' ')}
              </span>
              <span className='rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase text-orange-700'>
                {task.priority} priority
              </span>
            </div>

            {canManageStatus && (
              <div>
                <h2 className='mb-3 text-sm font-semibold text-slate-600'>Update Status</h2>
                <div className='flex flex-wrap gap-2'>
                  {STATUS_OPTIONS.map((option) => {
                    const isActive = task.status === option.value;
                    const style = STATUS_BUTTON_STYLES[option.value] || {
                      active: 'border-slate-300 bg-slate-100 text-slate-800',
                      inactive: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                      dot: 'bg-slate-500',
                    };
                    return (
                      <button
                        key={option.value}
                        type='button'
                        disabled={saving || isActive}
                        onClick={() => updateTaskStatus(option.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isActive ? style.active : style.inactive
                        }`}
                      >
                        <span className='inline-flex items-center gap-2'>
                          <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} aria-hidden='true'></span>
                          <span>Mark as {option.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h2 className='text-sm font-semibold text-slate-600'>Description</h2>
              <p className='mt-2 whitespace-pre-wrap text-slate-800'>{task.description || 'No description provided.'}</p>
            </div>

            <div>
              <div className='mb-2 flex items-center justify-between text-sm text-slate-600'>
                <span>Checklist progress</span>
                <span>{completion.done}/{completion.total}</span>
              </div>
              <div className='h-2 w-full rounded-full bg-slate-100'>
                <div
                  className='h-2 rounded-full bg-[#7F40EE] transition-all'
                  style={{ width: `${completion.total ? (completion.done / completion.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <h2 className='mb-3 text-sm font-semibold text-slate-600'>Subtasks</h2>
              {canManageSubtasks && (
                <div className='mb-3 flex gap-2'>
                  <input
                    value={newSubtaskTitle}
                    onChange={(event) => setNewSubtaskTitle(event.target.value)}
                    placeholder='Add checklist item...'
                    className='flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm'
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addChecklistItem();
                      }
                    }}
                  />
                  <button
                    type='button'
                    disabled={saving || !newSubtaskTitle.trim()}
                    onClick={addChecklistItem}
                    className='rounded-lg bg-[#7F40EE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6A31D1] disabled:opacity-60'
                  >
                    Add
                  </button>
                </div>
              )}
              <div className='space-y-2'>
                {(task.task_subtasks || []).map((subtask) => (
                  <label key={subtask.id} className='flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2'>
                    <input
                      type='checkbox'
                      checked={!!subtask.is_completed}
                      disabled={!canManageSubtasks || saving || pendingSubtaskIds.includes(subtask.id)}
                      onChange={() => toggleSubtask(subtask.id, subtask.is_completed)}
                    />
                    <span className={subtask.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}>
                      {subtask.title}
                    </span>
                  </label>
                ))}
                {(!task.task_subtasks || task.task_subtasks.length === 0) && (
                  <p className='text-sm text-slate-500'>No subtasks.</p>
                )}
              </div>
            </div>

            <div>
              <h2 className='mb-3 text-sm font-semibold text-slate-600'>Attachments</h2>
              <div className='space-y-2'>
                {(task.task_attachments || []).map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target='_blank'
                    rel='noreferrer'
                    className='block rounded-lg border border-slate-100 px-3 py-2 text-sm text-[#7F40EE] hover:bg-slate-50'
                  >
                    {attachment.file_name || 'Attachment'}
                  </a>
                ))}
                {(!task.task_attachments || task.task_attachments.length === 0) && (
                  <p className='text-sm text-slate-500'>No attachments.</p>
                )}
              </div>
            </div>
          </section>

          <aside className='space-y-6'>
            <section className='rounded-xl bg-white p-5 shadow-sm'>
              <h3 className='mb-3 text-sm font-semibold text-slate-600'>Assigned Members</h3>
              <div className='space-y-3'>
                {(task.task_assignments || []).map((assignment) => {
                  const employee = assignment.employee;
                  return (
                    <div key={assignment.employee_id} className='flex items-center gap-3'>
                      <Avatar name={employee?.name} src={employee?.profile_picture_url} />
                      <div>
                        <div className='text-sm font-semibold text-slate-800'>{employee?.name || 'Unknown'}</div>
                        <div className='text-xs text-slate-500'>{employee?.email || '—'}</div>
                      </div>
                    </div>
                  );
                })}
                {(!task.task_assignments || task.task_assignments.length === 0) && (
                  <p className='text-sm text-slate-500'>No assignees.</p>
                )}
              </div>
            </section>

            {canEditTask && (
              <section className='rounded-xl bg-white p-5 shadow-sm space-y-3'>
                <h3 className='text-sm font-semibold text-slate-600'>Edit Task</h3>

                <input
                  value={editForm.taskName}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, taskName: event.target.value }))}
                  className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
                  placeholder='Task name'
                />

                <textarea
                  value={editForm.description}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                  className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
                  rows={3}
                  placeholder='Description'
                />

                <div className='grid grid-cols-2 gap-2'>
                  <select
                    value={editForm.priority}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, priority: event.target.value }))}
                    className='rounded-lg border border-slate-200 px-3 py-2 text-sm'
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <select
                    value={editForm.status}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                    className='rounded-lg border border-slate-200 px-3 py-2 text-sm'
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <input
                  type='date'
                  value={editForm.dueDate}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
                />

                <button
                  type='button'
                  disabled={saving}
                  onClick={handleSaveTask}
                  className='w-full rounded-lg bg-[#7F40EE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6A31D1] disabled:opacity-60'
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </section>
            )}
          </aside>
        </div>

        <section className='rounded-xl bg-white p-6 shadow-sm'>
          <h2 className='mb-4 text-lg font-semibold text-slate-800'>Comments</h2>

          <div className='space-y-3'>
            {comments.map((comment) => (
              <div key={comment.id} className='rounded-lg border border-slate-100 p-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <Avatar name={comment.author_name} src={comment.author_avatar_url} size='w-8 h-8' />
                    <div>
                      <div className='text-sm font-semibold text-slate-800'>{comment.author_name}</div>
                      <div className='text-xs text-slate-500'>{formatDate(comment.created_at)}</div>
                    </div>
                  </div>
                  {comment.can_delete && (
                    <button
                      type='button'
                      onClick={() => removeComment(comment.id)}
                      className='text-xs font-medium text-red-600 hover:underline'
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className='mt-2 text-sm text-slate-700'>{comment.comment_text}</p>
              </div>
            ))}
            {comments.length === 0 && <p className='text-sm text-slate-500'>No comments yet.</p>}
          </div>

          {canComment && (
            <div className='mt-4 flex gap-3'>
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder='Write a comment...'
                className='flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm'
              />
              <button
                type='button'
                disabled={saving || !commentText.trim()}
                onClick={postComment}
                className='rounded-lg bg-[#7F40EE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6A31D1] disabled:opacity-60'
              >
                Comment
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';

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

const getDisplayName = (person, fallback = 'Unknown user') => {
  if (!person) return fallback;
  return person.name || person.full_name || person.email || fallback;
};

const buildAssignmentActivityText = (item) => {
  const actorName = getDisplayName(item.actor, 'Unknown actor');
  const targetLabel = item.entityType === 'subtask'
    ? (item.subtaskTitle || 'Untitled subtask')
    : 'the task';
  const fromName = getDisplayName(item.fromEmployee, 'Former assignee');
  const toName = getDisplayName(item.toEmployee, 'Unknown assignee');

  if (item.action === 'assigned') {
    return `${actorName} assigned ${targetLabel} to ${toName}`;
  }

  if (item.action === 'reassigned') {
    return `${actorName} reassigned ${targetLabel} from ${fromName} to ${toName}`;
  }

  if (item.action === 'unassigned') {
    return `${actorName} unassigned ${targetLabel} from ${fromName}`;
  }

  return `${actorName} updated ${targetLabel}`;
};

const getActivityAccent = (action) => {
  if (action === 'assigned') {
    return {
      rail: 'from-emerald-500 to-teal-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Assigned',
    };
  }

  if (action === 'reassigned') {
    return {
      rail: 'from-amber-500 to-orange-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Reassigned',
    };
  }

  if (action === 'unassigned') {
    return {
      rail: 'from-rose-500 to-pink-500',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      label: 'Unassigned',
    };
  }

  return {
    rail: 'from-slate-400 to-slate-500',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    label: 'Updated',
  };
};

function TaskRating({ rating, hoverRating, setHoverRating, onRate, canRate }) {
  return (
    <div className="flex items-center gap-1" title={canRate ? "Rate this task" : "Task rating"}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = (hoverRating || rating) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={!canRate}
            onMouseEnter={() => canRate && setHoverRating(star)}
            onMouseLeave={() => canRate && setHoverRating(0)}
            onClick={() => canRate && onRate(star)}
            className={`p-1 transition-transform ${canRate ? 'cursor-pointer hover:scale-110' : 'cursor-default opacity-90'}`}
            aria-label={`Rate ${star} stars`}
          >
            <Star
              size={20}
              className={`transition-colors ${isFilled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300'}`}
            />
          </button>
        );
      })}
    </div>
  );
}

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

function AssigneePicker({
  value,
  onChange,
  options,
  disabled = false,
  compact = false,
  placeholder = 'Unassigned',
}) {
  const selected = options.find((option) => String(option.id) === String(value));
  const triggerSize = compact ? 'w-6 h-6' : 'w-7 h-7';

  const handlePick = (nextValue, event) => {
    onChange(nextValue);
    event.currentTarget.closest('details')?.removeAttribute('open');
  };

  return (
    <details className='relative min-w-[180px]' data-assignee-picker>
      <summary
        className={`flex list-none items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm text-slate-700 shadow-sm transition marker:content-none ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-slate-300'
          }`}
      >
        <span className='flex min-w-0 items-center gap-2'>
          {selected ? (
            <>
              <Avatar
                name={selected.name}
                src={selected.profile_picture_url || selected.avatar}
                size={triggerSize}
              />
              <span className='truncate text-xs font-medium text-slate-700'>{selected.name}</span>
            </>
          ) : (
            <span className='text-xs text-slate-500'>{placeholder}</span>
          )}
        </span>
        <span className='text-[10px] text-slate-400'>▼</span>
      </summary>
      {!disabled && (
        <div className='absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl'>
          <button
            type='button'
            onClick={(event) => handlePick('', event)}
            className='flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50'
          >
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500'>
              -
            </div>
            <span>{placeholder}</span>
          </button>
          {options.map((option) => (
            <button
              key={option.id}
              type='button'
              onClick={(event) => handlePick(option.id, event)}
              className='flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50'
            >
              <Avatar
                name={option.name}
                src={option.profile_picture_url || option.avatar}
                size='w-8 h-8'
              />
              <div className='min-w-0'>
                <div className='truncate font-medium text-slate-800'>{option.name}</div>
                <div className='truncate text-xs text-slate-500'>{option.email || option.role || 'Team member'}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </details>
  );
}

function AssignmentActivityItem({ item }) {
  const actorName = getDisplayName(item.actor, 'Unknown actor');
  const targetLabel = item.entityType === 'subtask'
    ? (item.subtaskTitle || 'Untitled subtask')
    : 'Task assignment';
  const toName = getDisplayName(item.toEmployee, 'Unknown assignee');
  const fromName = getDisplayName(item.fromEmployee, 'Former assignee');
  const accent = getActivityAccent(item.action);

  return (
    <div className='group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]'>
      <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent.rail}`}></div>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.08),transparent_38%)] pointer-events-none'></div>
      <div className='relative'>
        <div className='flex items-start gap-3'>
          <div className='relative mt-0.5'>
            <Avatar
              name={actorName}
              src={item.actor?.profile_picture_url}
              size='w-10 h-10'
            />
            <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${accent.dot}`}></span>
          </div>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='text-sm font-semibold tracking-tight text-slate-900'>{actorName}</p>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}>
                {accent.label}
              </span>
            </div>
            <p className='mt-1 text-sm leading-6 text-slate-700'>{buildAssignmentActivityText(item)}</p>
            <div className='mt-3 flex flex-wrap items-center gap-2'>
              <span className='rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600'>
                {item.entityType === 'subtask' ? 'Subtask' : 'Task'}
              </span>
              <span className='max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700'>
                {targetLabel}
              </span>
              {item.action !== 'unassigned' && (
                <span className='rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700'>
                  To {toName}
                </span>
              )}
              {item.action === 'reassigned' && (
                <span className='rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700'>
                  From {fromName}
                </span>
              )}
            </div>
            <p className='mt-3 text-xs font-medium text-slate-500'>{formatDate(item.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskDetailPage({ taskId, mode = 'employee' }) {
  const [task, setTask] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [assignmentActivity, setAssignmentActivity] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingSubtaskIds, setPendingSubtaskIds] = useState([]);
  const [pendingSubtaskTitleIds, setPendingSubtaskTitleIds] = useState([]);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState('');
  const [progressDraft, setProgressDraft] = useState(0);
  const [taskLabels, setTaskLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [ratingDraft, setRatingDraft] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const [editForm, setEditForm] = useState({
    taskName: '',
    description: '',
    label: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
  });

  const backHref = mode === 'admin' ? '/admin/tasks' : '/dashboard';

  const canEditTask = !!viewer?.canManageTask;
  const canComment = !!viewer?.canComment;
  const canManageSubtasks = !!viewer?.canManageSubtasks;
  const canManageStatus = viewer?.type === 'admin' || viewer?.type === 'employee';

  const subtaskAssignees = useMemo(
    () => employees.filter(Boolean),
    [employees]
  );

  const employeeDirectoryById = useMemo(
    () => new Map(subtaskAssignees.map((employee) => [employee.id, employee])),
    [subtaskAssignees]
  );

  const completion = useMemo(() => {
    const subtasks = task?.task_subtasks || [];
    const done = subtasks.filter((subtask) => subtask.is_completed).length;
    return { done, total: subtasks.length };
  }, [task]);

  const loadTaskData = async () => {
    setLoading(true);
    setError('');

    try {
      const [taskRes, commentsRes, taskLabelsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`, { method: 'GET' }),
        fetch(`/api/tasks/${taskId}/comments`, { method: 'GET' }),
        fetch('/api/task-labels', { method: 'GET' }),
      ]);

      const taskJson = await taskRes.json();
      const commentsJson = await commentsRes.json();
      const taskLabelsJson = await taskLabelsRes.json();

      if (!taskRes.ok) {
        throw new Error(taskJson.error || 'Failed to load task details');
      }

      if (!commentsRes.ok) {
        throw new Error(commentsJson.error || 'Failed to load task comments');
      }

      if (taskLabelsRes.ok) {
        setTaskLabels(
          Array.isArray(taskLabelsJson.labels)
            ? taskLabelsJson.labels.map((item) => item.name).filter(Boolean)
            : []
        );
      }

      const fetchedTask = taskJson.task;

      setTask(fetchedTask);
      setRatingDraft(typeof fetchedTask?.rating === 'number' ? fetchedTask.rating : 0);
      setProgressDraft(
        Number.isFinite(Number(fetchedTask?.progress_percentage))
          ? Math.min(100, Math.max(0, Math.round(Number(fetchedTask.progress_percentage))))
          : 0
      );
      setViewer(taskJson.viewer || null);
      setEmployees(taskJson.employees || []);
      setAssignmentActivity(taskJson.assignmentActivity || []);
      setComments(commentsJson.comments || []);
      setEditForm({
        taskName: fetchedTask.task_name || '',
        description: fetchedTask.description || '',
        label: fetchedTask.label || '',
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
        body: JSON.stringify({
          subtaskTitle: title,
          assignedEmployeeId: newSubtaskAssigneeId || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add checklist item');
      }

      setNewSubtaskTitle('');
      setNewSubtaskAssigneeId('');
      await loadTaskData();
    } catch (err) {
      setError(err.message || 'Failed to add checklist item');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLabel = async () => {
    const cleanLabel = newLabelName.trim();
    if (!cleanLabel || !canEditTask) return;

    setCreatingLabel(true);
    setError('');

    try {
      const response = await fetch('/api/task-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanLabel }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create task label');
      }

      const createdLabel = result?.label?.name || cleanLabel;
      setTaskLabels((prev) => Array.from(new Set([...prev, createdLabel])).sort((a, b) => a.localeCompare(b)));
      setEditForm((prev) => ({ ...prev, label: createdLabel }));
      setNewLabelName('');
    } catch (err) {
      setError(err.message || 'Failed to create task label');
    } finally {
      setCreatingLabel(false);
    }
  };

  const updateTaskProgress = async (nextProgress) => {
    if (!canManageStatus || !task) return;

    const normalized = Math.min(100, Math.max(0, Math.round(Number(nextProgress) || 0)));
    const previousProgress = Number.isFinite(Number(task.progress_percentage))
      ? Math.min(100, Math.max(0, Math.round(Number(task.progress_percentage))))
      : 0;

    if (normalized === previousProgress) return;

    setSaving(true);
    setError('');
    setTask((prev) => (prev ? { ...prev, progress_percentage: normalized } : prev));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPercentage: normalized }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update task progress');
      }
    } catch (err) {
      setTask((prev) => (prev ? { ...prev, progress_percentage: previousProgress } : prev));
      setProgressDraft(previousProgress);
      setError(err.message || 'Failed to update task progress');
    } finally {
      setSaving(false);
    }
  };

  const updateTaskRating = async (nextRating) => {
    if (!viewer?.canRateTask || !task) return;

    const previousRating = task.rating || 0;
    if (nextRating === previousRating) return;

    setSaving(true);
    setError('');
    setTask((prev) => (prev ? { ...prev, rating: nextRating } : prev));
    setRatingDraft(nextRating);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: nextRating }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update task rating');
      }
    } catch (err) {
      setTask((prev) => (prev ? { ...prev, rating: previousRating } : prev));
      setRatingDraft(previousRating);
      setError(err.message || 'Failed to update task rating');
    } finally {
      setSaving(false);
    }
  };

  const canEditSubtaskTitle = (subtask) => {
    if (!canManageSubtasks || !subtask) return false;
    if (viewer?.type === 'admin') return true;
    if (viewer?.type !== 'employee') return false;
    return !subtask.assigned_employee_id || subtask.assigned_employee_id === viewer?.employeeId;
  };

  const startSubtaskTitleEdit = (subtask) => {
    if (!canEditSubtaskTitle(subtask) || pendingSubtaskTitleIds.includes(subtask.id)) return;
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title || '');
    setError('');
  };

  const cancelSubtaskTitleEdit = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  const saveSubtaskTitle = async (subtask) => {
    if (!subtask || editingSubtaskId !== subtask.id) return;

    const nextTitle = editingSubtaskTitle.trim();
    const previousTitle = subtask.title || '';

    if (!nextTitle) {
      setError('Subtask title cannot be empty');
      cancelSubtaskTitleEdit();
      return;
    }

    if (nextTitle === previousTitle) {
      cancelSubtaskTitleEdit();
      return;
    }

    if (!canEditSubtaskTitle(subtask) || pendingSubtaskTitleIds.includes(subtask.id)) {
      cancelSubtaskTitleEdit();
      return;
    }

    setPendingSubtaskTitleIds((prev) => [...prev, subtask.id]);
    setTask((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        task_subtasks: (prev.task_subtasks || []).map((item) =>
          item.id === subtask.id ? { ...item, title: nextTitle } : item
        ),
      };
    });

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId: subtask.id, subtaskTitle: nextTitle }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update subtask title');
      }

      cancelSubtaskTitleEdit();
    } catch (err) {
      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          task_subtasks: (prev.task_subtasks || []).map((item) =>
            item.id === subtask.id ? { ...item, title: previousTitle } : item
          ),
        };
      });
      setError(err.message || 'Failed to update subtask title');
    } finally {
      setPendingSubtaskTitleIds((prev) => prev.filter((id) => id !== subtask.id));
    }
  };

  const updateSubtaskAssignee = async (subtaskId, assignedEmployeeId) => {
    if (!canManageSubtasks) return;

    const nextAssignee = assignedEmployeeId || null;
    const previousSubtasks = task?.task_subtasks || [];

    setTask((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        task_subtasks: (prev.task_subtasks || []).map((subtask) =>
          subtask.id === subtaskId
            ? { ...subtask, assigned_employee_id: nextAssignee }
            : subtask
        ),
      };
    });

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, assignedEmployeeId: nextAssignee }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign subtask');
      }

      await loadTaskData();
    } catch (err) {
      setTask((prev) => (prev ? { ...prev, task_subtasks: previousSubtasks } : prev));
      setError(err.message || 'Failed to assign subtask');
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
              Back to tasks
            </Link>
            <h1 className='mt-2 text-2xl font-bold text-slate-900'>{task.task_name}</h1>
            <div className='mt-3 flex flex-wrap items-center gap-4'>
              {(task.status === 'completed' || ratingDraft > 0) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-600">Rating:</span>
                  <TaskRating
                    rating={ratingDraft}
                    hoverRating={hoverRating}
                    setHoverRating={setHoverRating}
                    onRate={updateTaskRating}
                    canRate={!!viewer?.canRateTask}
                  />
                </div>
              )}
              {task.label && (
                <span className='inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700'>
                  {task.label}
                </span>
              )}
            </div>
            <p className='mt-2 text-sm text-slate-500'>Created {formatDate(task.created_at)}</p>
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

        <div className='grid gap-6 lg:grid-cols-3'>
          <section className='rounded-xl bg-white p-6 shadow-sm space-y-5 lg:col-span-2'>
            <div className='flex flex-wrap gap-2'>
              <span className='rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold uppercase text-purple-700'>
                {task.status.replace('_', ' ')}
              </span>
              <span className='rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase text-orange-700'>
                {task.priority} priority
              </span>
              {task.label && (
                <span className='rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700'>
                  {task.label}
                </span>
              )}
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
                        disabled={saving}
                        onClick={() => updateTaskStatus(option.value)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${isActive ? style.active : style.inactive
                          }`}
                        aria-pressed={isActive}
                      >
                        <span className='inline-flex items-center gap-2.5'>
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold leading-none ${isActive
                                ? 'border-current bg-white/80 text-current'
                                : 'border-slate-400 bg-white text-transparent'
                              }`}
                            aria-hidden='true'
                          >
                            ✓
                          </span>
                          <span>{option.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {canManageStatus && (
              <div>
                <div className='mb-2 flex items-center justify-between text-sm text-slate-600'>
                  <span>Task Progress</span>
                  <span className='font-semibold text-slate-800'>{progressDraft}%</span>
                </div>
                <input
                  type='range'
                  min={0}
                  max={100}
                  step={1}
                  value={progressDraft}
                  disabled={saving}
                  onChange={(event) => setProgressDraft(Number(event.target.value))}
                  onMouseUp={() => updateTaskProgress(progressDraft)}
                  onTouchEnd={() => updateTaskProgress(progressDraft)}
                  onKeyUp={(event) => {
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
                      updateTaskProgress(progressDraft);
                    }
                  }}
                  aria-label='Task progress percentage'
                  style={{
                    background: `linear-gradient(to right, #7F40EE 0%, #7F40EE ${progressDraft}%, #e2e8f0 ${progressDraft}%, #e2e8f0 100%)`,
                  }}
                  className='h-2 w-full cursor-pointer appearance-none rounded-lg'
                />
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
                  {canManageSubtasks && (
                    <AssigneePicker
                      value={newSubtaskAssigneeId}
                      onChange={setNewSubtaskAssigneeId}
                      options={subtaskAssignees}
                    />
                  )}
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
                  <div key={subtask.id} className='flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2'>
                    <input
                      type='checkbox'
                      checked={!!subtask.is_completed}
                      disabled={
                        !canManageSubtasks ||
                        saving ||
                        pendingSubtaskIds.includes(subtask.id) ||
                        pendingSubtaskTitleIds.includes(subtask.id)
                      }
                      onChange={() => toggleSubtask(subtask.id, subtask.is_completed)}
                      aria-label={`Toggle subtask ${subtask.title}`}
                    />
                    {editingSubtaskId === subtask.id ? (
                      <input
                        value={editingSubtaskTitle}
                        onChange={(event) => setEditingSubtaskTitle(event.target.value)}
                        onBlur={() => saveSubtaskTitle(subtask)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            saveSubtaskTitle(subtask);
                            return;
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelSubtaskTitleEdit();
                          }
                        }}
                        autoFocus
                        className='flex-1 min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700'
                        disabled={pendingSubtaskTitleIds.includes(subtask.id)}
                        aria-label='Edit subtask title'
                      />
                    ) : (
                      <button
                        type='button'
                        onClick={() => startSubtaskTitleEdit(subtask)}
                        disabled={!canEditSubtaskTitle(subtask) || pendingSubtaskTitleIds.includes(subtask.id)}
                        className={`flex-1 min-w-0 text-left break-words ${subtask.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'
                          } ${canEditSubtaskTitle(subtask) ? 'cursor-text' : 'cursor-default'
                          } disabled:opacity-70`}
                        title={canEditSubtaskTitle(subtask) ? 'Click to edit subtask title' : subtask.title}
                      >
                        {subtask.title}
                      </button>
                    )}
                    {canManageSubtasks ? (
                      <AssigneePicker
                        value={subtask.assigned_employee_id || ''}
                        onChange={(value) => updateSubtaskAssignee(subtask.id, value)}
                        disabled={saving || pendingSubtaskTitleIds.includes(subtask.id)}
                        options={subtaskAssignees}
                        compact
                      />
                    ) : (
                      (() => {
                        const assigned = employeeDirectoryById.get(subtask.assigned_employee_id);
                        return assigned ? (
                          <div className='flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1'>
                            <Avatar
                              name={assigned.name}
                              src={assigned.profile_picture_url || assigned.avatar}
                              size='w-6 h-6'
                            />
                            <span className='text-xs font-medium text-slate-600'>{assigned.name}</span>
                          </div>
                        ) : (
                          <span className='text-xs text-slate-500'>Unassigned</span>
                        );
                      })()
                    )}
                  </div>
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

          <aside className='space-y-6 lg:col-span-1'>
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

            <section className='overflow-hidden rounded-[28px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]'>
              <div className='mb-4 flex items-start justify-between gap-3'>
                <div>
                  <h3 className='text-sm font-semibold uppercase tracking-[0.18em] text-slate-500'>Assignment Activity</h3>
                  <p className='mt-1 text-sm text-slate-600'>Latest delegation and assignment changes for this task.</p>
                </div>
                <div className='rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white'>
                  {assignmentActivity.length}
                </div>
              </div>
              <div className='space-y-3'>
                {assignmentActivity.map((item) => (
                  <AssignmentActivityItem key={item.id} item={item} />
                ))}
                {assignmentActivity.length === 0 && (
                  <div className='rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-center'>
                    <p className='text-sm font-medium text-slate-700'>No assignment activity yet.</p>
                    <p className='mt-1 text-xs text-slate-500'>New task and subtask assignee changes will appear here.</p>
                  </div>
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

                <select
                  value={editForm.label}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, label: event.target.value }))}
                  className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white'
                >
                  <option value=''>Select a label</option>
                  {taskLabels.map((taskLabel) => (
                    <option key={taskLabel} value={taskLabel}>{taskLabel}</option>
                  ))}
                </select>

                <div className='flex gap-2'>
                  <input
                    value={newLabelName}
                    onChange={(event) => setNewLabelName(event.target.value)}
                    className='flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm'
                    placeholder='Create a new label'
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleCreateLabel();
                      }
                    }}
                  />
                  <button
                    type='button'
                    disabled={creatingLabel || !newLabelName.trim()}
                    onClick={handleCreateLabel}
                    className='rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#7F40EE] hover:text-[#7F40EE] disabled:opacity-60'
                  >
                    {creatingLabel ? 'Adding...' : 'Add Label'}
                  </button>
                </div>

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

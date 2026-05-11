'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Star, X } from 'lucide-react';

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

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const buildDueDateIso = (dateValue, timeValue = '') => {
  if (!dateValue) return null;
  const cleanTime = typeof timeValue === 'string' && timeValue.trim() ? timeValue.trim() : '23:59';
  const parsedDate = new Date(`${dateValue}T${cleanTime}`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

const getDisplayName = (person, fallback = 'Unknown user') => {
  if (!person) return fallback;
  return person.name || person.full_name || person.email || fallback;
};

const getPersonKey = (person, fallbackPrefix = 'person') => {
  if (!person) return `${fallbackPrefix}:unknown`;
  const isAdmin = person.role === 'admin';
  const prefix = isAdmin ? 'admin' : 'employee';
  return `${prefix}:${person.id || person.email || person.name || 'unknown'}`;
};

const buildTreeNode = (person, overrides = {}) => ({
  id: overrides.id || getPersonKey(person, overrides.fallbackPrefix),
  name: overrides.name || getDisplayName(person, 'Unknown'),
  email: overrides.email ?? person?.email ?? '',
  avatarUrl: overrides.avatarUrl ?? person?.profile_picture_url ?? person?.avatar ?? null,
  role: overrides.role || person?.role || 'employee',
  meta: overrides.meta || '',
});

const dedupeTreeChildren = (children = []) => {
  const seen = new Set();
  return children.filter((child) => {
    if (!child?.id || seen.has(child.id)) return false;
    seen.add(child.id);
    return true;
  });
};

const TASK_PROGRESS_MARKS = [0, 25, 50, 75, 100];

const getCommentAuthorLabel = (comment, viewer) => {
  if (comment?.author_name && String(comment.author_name).trim() && String(comment.author_name).trim().toLowerCase() !== 'unknown') {
    return String(comment.author_name).trim();
  }

  if (comment?.can_delete) {
    return 'You';
  }

  return 'Team Member';
};

function StarRating({ rating, hoverRating, setHoverRating, onRate, canRate, size = 20 }) {
  return (
    <div className="flex items-center gap-1" title={canRate ? 'Rate employee' : 'Employee rating'}>
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
              size={size}
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

function AssignmentTreeNode({ node }) {
  const children = dedupeTreeChildren(node.children || []);

  return (
    <div className='flex flex-col items-center'>
      <div className='flex min-w-[88px] max-w-[120px] flex-col items-center text-center'>
        <Avatar name={node.name} src={node.avatarUrl} size='h-12 w-12' />
        <p className='mt-2 line-clamp-2 text-xs font-semibold text-slate-800'>{node.name}</p>
      </div>

      {children.length > 0 ? (
        <>
          <div className='h-5 w-px bg-slate-300'></div>
          <div className='flex w-full flex-col items-center'>
            {children.length > 1 ? (
              <div className='hidden h-px w-[calc(100%-1rem)] max-w-[420px] bg-slate-300 sm:block'></div>
            ) : null}
            <div className='mt-0 flex flex-wrap items-start justify-center gap-x-3 gap-y-5 sm:gap-x-5'>
              {children.map((child) => (
                <div key={child.id} className='flex min-w-[96px] flex-col items-center'>
                  <div className='hidden h-4 w-px bg-slate-300 sm:block'></div>
                  <div className='mb-2 text-slate-300'>
                    <span className='text-lg leading-none'>↓</span>
                  </div>
                  <AssignmentTreeNode node={child} />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function EmployeeReviewModal({
  open,
  assignees,
  ratingsByEmployeeId,
  hoverRatings,
  onHoverRatingChange,
  onChangeRating,
  onClose,
  onSave,
  saving,
}) {
  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4'>
      <div className='w-full max-w-3xl rounded-[28px] bg-white shadow-2xl'>
        <div className='flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5'>
          <div>
            <h2 className='text-xl font-semibold text-slate-900'>Review Assignees</h2>
            <p className='mt-1 text-sm text-slate-500'>Rate each assigned employee separately. You can update these ratings later.</p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-800'
            aria-label='Close review modal'
          >
            <X size={18} />
          </button>
        </div>

        <div className='max-h-[60vh] space-y-3 overflow-y-auto px-6 py-5'>
          {assignees.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500'>
              No assigned employees available for review.
            </div>
          ) : (
            assignees.map((employee) => {
              const rating = ratingsByEmployeeId[employee.id] || 0;
              const hoverRating = hoverRatings[employee.id] || 0;

              return (
                <div key={employee.id} className='flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex items-center gap-3'>
                    <Avatar name={employee.name} src={employee.profile_picture_url || employee.avatar} size='h-12 w-12' />
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>{employee.name}</p>
                      <p className='text-xs text-slate-500'>{employee.role || 'Employee'}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'>
                      {rating > 0 ? `${rating}/5` : 'Not Rated'}
                    </span>
                    <StarRating
                      rating={rating}
                      hoverRating={hoverRating}
                      setHoverRating={(value) => onHoverRatingChange(employee.id, value)}
                      onRate={(value) => onChangeRating(employee.id, value)}
                      canRate
                      size={18}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className='flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5'>
          <button
            type='button'
            onClick={onClose}
            className='rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900'
          >
            Cancel
          </button>
          <button
            type='button'
            disabled={saving || assignees.length === 0}
            onClick={onSave}
            className='rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {saving ? 'Saving...' : 'Save Ratings'}
          </button>
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
  const [taskRatings, setTaskRatings] = useState([]);
  const [reviewAssignees, setReviewAssignees] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRatingsDraft, setReviewRatingsDraft] = useState({});
  const [reviewHoverRatings, setReviewHoverRatings] = useState({});

  const [editForm, setEditForm] = useState({
    taskName: '',
    description: '',
    label: '',
    priority: 'medium',
    frequency: '',
    status: 'pending',
    dueDate: '',
    dueTime: '',
  });

  const backHref = mode === 'admin' ? '/Taskmanager/admin/tasks' : '/Taskmanager/dashboard';

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

  const ratedAssigneeCount = useMemo(
    () => Object.values(reviewRatingsDraft).filter((value) => Number(value) > 0).length,
    [reviewRatingsDraft]
  );

  const reviewRatingsByEmployeeId = useMemo(() => {
    const mapped = {};
    for (const item of taskRatings) {
      if (item?.employeeId) {
        mapped[item.employeeId] = Number(item.rating) || 0;
      }
    }
    return mapped;
  }, [taskRatings]);

  const assignmentTree = useMemo(() => {
    const taskAssignments = Array.isArray(task?.task_assignments) ? task.task_assignments : [];
    const subtasks = Array.isArray(task?.task_subtasks) ? task.task_subtasks : [];

    if (taskAssignments.length === 0 && subtasks.length === 0 && assignmentActivity.length === 0) {
      return [];
    }

    const latestAssignmentByEmployeeId = new Map();

    for (const item of assignmentActivity) {
      if (!item?.toEmployee?.id || item.action === 'unassigned') continue;
      if (!latestAssignmentByEmployeeId.has(item.toEmployee.id)) {
        latestAssignmentByEmployeeId.set(item.toEmployee.id, item);
      }
    }

    const nodes = new Map();
    const childIds = new Set();
    const parentByChildId = new Map();

    const getRoleMeta = (person, fallback = '') => {
      if (!person) return fallback;
      if (person.role === 'admin') return 'Admin';
      return 'Employee';
    };

    const getOrCreateNode = (person, overrides = {}) => {
      const nodeId = overrides.id || getPersonKey(person, overrides.fallbackPrefix);
      const existing = nodes.get(nodeId);
      if (existing) {
        if (!existing.avatarUrl && (overrides.avatarUrl || person?.profile_picture_url || person?.avatar)) {
          existing.avatarUrl = overrides.avatarUrl || person?.profile_picture_url || person?.avatar;
        }
        if (!existing.email && (overrides.email || person?.email)) {
          existing.email = overrides.email || person?.email || '';
        }
        if (!existing.meta && overrides.meta) {
          existing.meta = overrides.meta;
        }
        return existing;
      }

      const created = { ...buildTreeNode(person, overrides), children: [] };
      nodes.set(nodeId, created);
      return created;
    };

    const linkNodes = (parentNode, childNode) => {
      if (!parentNode || !childNode || parentNode.id === childNode.id) return;
      const previousParentId = parentByChildId.get(childNode.id);
      if (previousParentId && previousParentId !== parentNode.id) {
        const previousParent = nodes.get(previousParentId);
        if (previousParent) {
          previousParent.children = previousParent.children.filter((item) => item.id !== childNode.id);
        }
      }
      if (!parentNode.children.some((item) => item.id === childNode.id)) {
        parentNode.children = [...parentNode.children, childNode];
      }
      parentByChildId.set(childNode.id, parentNode.id);
      childIds.add(childNode.id);
    };

    const fallbackTaskRoot = getOrCreateNode(null, {
      id: 'system:task-root',
      name: 'Task',
      role: 'system',
      meta: 'Direct Assignment',
      fallbackPrefix: 'system',
    });

    const currentTaskAssigneeIds = new Set();

    for (const assignment of taskAssignments) {
      const employee = assignment?.employee;
      if (!employee?.id) continue;

      currentTaskAssigneeIds.add(employee.id);
      getOrCreateNode(employee, { meta: 'Task Member' });
    }

    for (const subtask of subtasks) {
      if (!subtask?.assigned_employee_id) continue;
      const assignedEmployee = employeeDirectoryById.get(subtask.assigned_employee_id);
      if (!assignedEmployee?.id) continue;
      getOrCreateNode(assignedEmployee, { meta: currentTaskAssigneeIds.has(assignedEmployee.id) ? 'Task Member' : 'Subtask Owner' });
    }

    for (const assignment of taskAssignments) {
      const employee = assignment?.employee;
      if (!employee?.id) continue;

      const childNode = getOrCreateNode(employee, { meta: 'Task Member' });
      const activity = latestAssignmentByEmployeeId.get(employee.id);
      const actorNode = activity?.actor
        ? getOrCreateNode(activity.actor, { meta: getRoleMeta(activity.actor, 'Assigner') })
        : fallbackTaskRoot;

      linkNodes(actorNode, childNode);
    }

    for (const subtask of subtasks) {
      if (!subtask?.assigned_employee_id) continue;

      const assignedEmployee = employeeDirectoryById.get(subtask.assigned_employee_id);
      if (!assignedEmployee) continue;

      const childNode = getOrCreateNode(assignedEmployee, { meta: currentTaskAssigneeIds.has(assignedEmployee.id) ? 'Task Member' : 'Subtask Owner' });
      const activity = latestAssignmentByEmployeeId.get(assignedEmployee.id);

      let parentNode = null;
      if (activity?.actor) {
        parentNode = getOrCreateNode(activity.actor, { meta: getRoleMeta(activity.actor, 'Assigner') });
      } else {
        parentNode = fallbackTaskRoot;
      }

      linkNodes(parentNode, childNode);
    }

    const rootNodes = Array.from(nodes.values()).filter((node) => !childIds.has(node.id));
    return rootNodes.filter((node) => node.id !== 'system:task-root' || node.children.length > 0);
  }, [assignmentActivity, employeeDirectoryById, task]);

  const visibleAssignmentMemberCount = useMemo(() => {
    const seen = new Set();

    const visit = (node) => {
      if (!node || seen.has(node.id) || node.role === 'system') return;
      seen.add(node.id);
      (node.children || []).forEach(visit);
    };

    assignmentTree.forEach(visit);
    return seen.size;
  }, [assignmentTree]);

  const loadTaskData = async () => {
    setLoading(true);
    setError('');

    try {
      const taskRes = await fetch(`/Taskmanager/api/tasks/${taskId}`, { method: 'GET' });
      const taskJson = await taskRes.json();

      if (!taskRes.ok) {
        throw new Error(taskJson.error || 'Failed to load task details');
      }

      const fetchedTask = taskJson.task;
      const fetchedTaskRatings = Array.isArray(taskJson.taskRatings) ? taskJson.taskRatings : [];
      const fetchedReviewAssignees = Array.isArray(taskJson.reviewAssignees) ? taskJson.reviewAssignees : [];
      const nextReviewDraft = {};
      for (const rating of fetchedTaskRatings) {
        if (rating?.employeeId) {
          nextReviewDraft[rating.employeeId] = Number(rating.rating) || 0;
        }
      }

      setTask(fetchedTask);
      setProgressDraft(
        Number.isFinite(Number(fetchedTask?.progress_percentage))
          ? Math.min(100, Math.max(0, Math.round(Number(fetchedTask.progress_percentage))))
          : 0
      );
      setViewer(taskJson.viewer || null);
      setEmployees(taskJson.employees || []);
      setAssignmentActivity(taskJson.assignmentActivity || []);
      setComments(taskJson.comments || []);
      setTaskLabels(Array.isArray(taskJson.taskLabels) ? taskJson.taskLabels : []);
      setTaskRatings(fetchedTaskRatings);
      setReviewAssignees(fetchedReviewAssignees);
      setReviewRatingsDraft(nextReviewDraft);
      setReviewHoverRatings({});
      setEditForm({
        taskName: fetchedTask.task_name || '',
        description: fetchedTask.description || '',
        label: fetchedTask.label || '',
        priority: fetchedTask.priority || 'medium',
        frequency: fetchedTask.frequency || '',
        status: fetchedTask.status || 'pending',
        dueDate: toDateInputValue(fetchedTask.due_date),
        dueTime: toTimeInputValue(fetchedTask.due_date),
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
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          dueDate: buildDueDateIso(editForm.dueDate, editForm.dueTime),
        }),
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
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
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
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
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
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
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
      const response = await fetch('/Taskmanager/api/task-labels', {
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
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
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

  const handleReviewRatingChange = (employeeId, nextRating) => {
    setReviewRatingsDraft((prev) => ({
      ...prev,
      [employeeId]: nextRating,
    }));
  };

  const handleReviewHoverChange = (employeeId, nextRating) => {
    setReviewHoverRatings((prev) => ({
      ...prev,
      [employeeId]: nextRating,
    }));
  };

  const saveEmployeeRatings = async () => {
    if (!viewer?.canReviewAssignees || !task) return;

    const payload = reviewAssignees
      .map((employee) => ({
        employeeId: employee.id,
        rating: Number(reviewRatingsDraft[employee.id] || 0),
      }))
      .filter((item) => item.employeeId && item.rating >= 1 && item.rating <= 5);

    if (payload.length === 0) {
      setError('Add at least one employee rating before saving.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeRatings: payload }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save employee ratings');
      }

      const nextRatings = Array.isArray(result.taskRatings) ? result.taskRatings : [];
      const nextDraft = {};
      for (const rating of nextRatings) {
        if (rating?.employeeId) {
          nextDraft[rating.employeeId] = Number(rating.rating) || 0;
        }
      }

      setTaskRatings(nextRatings);
      setReviewRatingsDraft(nextDraft);
      setReviewModalOpen(false);
      setReviewHoverRatings({});
    } catch (err) {
      setError(err.message || 'Failed to save employee ratings');
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
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
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
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
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
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}/comments`, {
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
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}/comments?commentId=${commentId}`, {
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
      const response = await fetch(`/Taskmanager/api/tasks?id=${taskId}`, {
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
      <div className='mx-auto max-w-[1380px] space-y-6'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-start gap-4'>
            <Link
              href={backHref}
              aria-label='Back to tasks'
              className='mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-x-0.5 hover:border-slate-300 hover:text-slate-900'
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
            <h1 className='text-2xl font-bold text-slate-900'>{task.task_name}</h1>
            <div className='mt-3 flex flex-wrap items-center gap-4'>
              {task.status === 'completed' && reviewAssignees.length > 0 && (
                <div className='flex flex-wrap items-center gap-3'>
                  <span className='rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700'>
                    Rated {ratedAssigneeCount}/{reviewAssignees.length}
                  </span>
                  {viewer?.canReviewAssignees && (
                    <button
                      type='button'
                      onClick={() => {
                        setReviewModalOpen(true);
                        setReviewHoverRatings({});
                      }}
                      className='inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-300 hover:text-slate-900'
                    >
                      {ratedAssigneeCount > 0 ? 'Edit Reviews' : 'Review Assignees'}
                    </button>
                  )}
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

        <div className='grid gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(320px,0.54fr)]'>
          <section className='rounded-xl bg-white p-6 shadow-sm space-y-4'>
            <div className='flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between'>
              <div className='flex flex-wrap gap-2'>
                <span className='rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold uppercase text-purple-700'>
                  {task.status.replace('_', ' ')}
                </span>
                <span className='rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase text-orange-700'>
                  {task.priority} priority
                </span>
                {task.frequency && (
                  <span className='rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-700'>
                    Repeats {task.frequency}
                  </span>
                )}
                {task.label && (
                  <span className='rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700'>
                    {task.label}
                  </span>
                )}
              </div>
              <div className='w-full max-w-[120px] text-right'>
                <span className='font-headline text-[2rem] font-light tracking-[0.02em] text-slate-800'>{completion.done}/{completion.total}</span>
              </div>
            </div>

            {canManageStatus && (
              <div className='space-y-1'>
                <h2 className='text-sm font-semibold text-slate-600'>Update Status</h2>
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
                <div className='mb-1 flex items-center justify-between text-sm text-slate-600'>
                  <span>Task Progress</span>
                  <span className='font-semibold text-slate-800'>{progressDraft}%</span>
                </div>
                <input
                  type='range'
                  min={0}
                  max={100}
                  step={25}
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
                    background: `linear-gradient(to right, #c084fc 0%, #c084fc ${progressDraft}%, #e2e8f0 ${progressDraft}%, #e2e8f0 100%)`,
                  }}
                  className='h-1.5 w-full cursor-pointer appearance-none rounded-full'
                />
                <div className='mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400'>
                  {TASK_PROGRESS_MARKS.map((mark) => (
                    <button
                      key={mark}
                      type='button'
                      disabled={saving}
                      onClick={() => {
                        setProgressDraft(mark);
                        updateTaskProgress(mark);
                      }}
                      className={`rounded-full px-1.5 py-0.5 transition ${
                        progressDraft === mark ? 'bg-slate-100 font-semibold text-slate-700' : 'hover:text-slate-600'
                      }`}
                    >
                      {mark}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className='text-sm font-semibold text-slate-600'>Description</h2>
              <p className='mt-2 whitespace-pre-wrap text-slate-800'>{task.description || 'No description provided.'}</p>
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

          <aside className='space-y-8 lg:col-span-1'>
            <section className='rounded-[24px] bg-slate-100/80 px-5 py-5'>
              <div className='mb-4'>
                <h3 className='text-sm font-semibold uppercase tracking-[0.18em] text-slate-500'>Assigned Members</h3>
              </div>
              <div className='space-y-3'>
                {(task.task_assignments || []).map((assignment) => {
                  const employee = assignment.employee;
                  return (
                    <div key={assignment.employee_id} className='flex items-center gap-3'>
                      <Avatar name={employee?.name} src={employee?.profile_picture_url} size='h-10 w-10' />
                      <div className='text-sm font-semibold text-slate-800'>
                        {employee?.name || 'Unknown'}
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

            <section className='w-full rounded-[24px] bg-slate-100/80 px-5 py-5'>
              <div className='mb-4 flex items-start justify-between gap-3'>
                <div>
                  <h3 className='text-sm font-semibold uppercase tracking-[0.18em] text-slate-500'>Assignment Tree</h3>
                </div>
                <div className='rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white'>
                  {visibleAssignmentMemberCount}
                </div>
              </div>
              <div className='w-full px-1 py-2'>
                {assignmentTree.length === 0 ? (
                  <div className='px-2 py-4 text-center'>
                    <p className='text-sm font-medium text-slate-700'>No assignment map yet.</p>
                  </div>
                ) : (
                  <div className='overflow-x-auto pb-1'>
                    <div className='flex min-w-[240px] flex-wrap items-start justify-center gap-6'>
                      {assignmentTree.map((node) => (
                        <AssignmentTreeNode key={node.id} node={node} />
                      ))}
                    </div>
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

                <div className='grid grid-cols-3 gap-2'>
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
                    value={editForm.frequency}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, frequency: event.target.value }))}
                    className='rounded-lg border border-slate-200 px-3 py-2 text-sm'
                  >
                    <option value=''>Never</option>
                    <option value='weekly'>Weekly</option>
                    <option value='monthly'>Monthly</option>
                    <option value='yearly'>Yearly</option>
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

                <div className='grid grid-cols-2 gap-2'>
                  <input
                    type='date'
                    value={editForm.dueDate}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
                  />
                  <input
                    type='time'
                    value={editForm.dueTime}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, dueTime: event.target.value }))}
                    disabled={!editForm.dueDate}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400'
                  />
                </div>

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

          <div className='space-y-5'>
            {comments.map((comment) => (
              <div key={comment.id} className='relative pl-14'>
                <div className='absolute left-[15px] top-10 bottom-[-18px] w-px bg-slate-200 last:hidden'></div>
                <div className='absolute left-0 top-0'>
                  <Avatar
                    name={getCommentAuthorLabel(comment, viewer)}
                    src={comment.author_avatar_url}
                    size='w-8 h-8'
                  />
                </div>
                <div className='max-w-[820px] rounded-2xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-semibold text-slate-800'>
                        {getCommentAuthorLabel(comment, viewer)}
                        <span className='ml-2 text-xs font-normal text-slate-500'>{formatDate(comment.created_at)}</span>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
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
                  </div>
                  <p className='mt-1.5 text-sm leading-6 text-slate-700'>{comment.comment_text}</p>
                </div>
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

        <EmployeeReviewModal
          open={reviewModalOpen}
          assignees={reviewAssignees}
          ratingsByEmployeeId={reviewRatingsDraft}
          hoverRatings={reviewHoverRatings}
          onHoverRatingChange={handleReviewHoverChange}
          onChangeRating={handleReviewRatingChange}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewHoverRatings({});
            setReviewRatingsDraft(reviewRatingsByEmployeeId);
          }}
          onSave={saveEmployeeRatings}
          saving={saving}
        />
      </div>
    </div>
  );
}

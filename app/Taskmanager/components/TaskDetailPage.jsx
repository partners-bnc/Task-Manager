'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Circle,
  Clock3,
  Download,
  ExternalLink,
  File,
  FileImage,
  FileText,
  Paperclip,
  Pencil,
  Plus,
  Star,
  Upload,
  UserRound,
  X,
} from 'lucide-react';

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

const getAttachmentExtension = (attachment) => {
  const fileName = String(attachment?.file_name || attachment?.file_path || '');
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/i);
  return match?.[1] || '';
};

const getAttachmentPresenter = (attachment) => {
  const extension = getAttachmentExtension(attachment);

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
    return {
      label: extension.toUpperCase(),
      Icon: FileImage,
      iconClassName: 'bg-sky-100 text-sky-700',
    };
  }

  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
    return {
      label: extension ? extension.toUpperCase() : 'DOC',
      Icon: FileText,
      iconClassName: 'bg-violet-100 text-violet-700',
    };
  }

  return {
    label: extension ? extension.toUpperCase() : 'FILE',
    Icon: File,
    iconClassName: 'bg-slate-100 text-slate-700',
  };
};

const getAttachmentUploaderLabel = (attachment) =>
  attachment?.uploaded_by_employee?.name ||
  attachment?.uploaded_by_profile?.full_name ||
  attachment?.uploaded_by_employee?.email ||
  attachment?.uploaded_by_profile?.email ||
  'Unknown';

const getCompletionTiming = (task) => {
  if (!task?.due_date) {
    if (task?.status === 'completed') {
      return {
        label: 'Completed',
        tone: 'neutral',
        note: task?.completed_at ? `Completed ${formatDate(task.completed_at)}` : 'Task completed',
      };
    }
    return null;
  }

  const dueAt = new Date(task.due_date);
  if (Number.isNaN(dueAt.getTime())) return null;

  if (task?.status === 'completed') {
    if (!task?.completed_at) {
      return {
        label: 'Completed',
        tone: 'neutral',
        note: 'Task completed',
      };
    }

    const completedAt = new Date(task.completed_at);
    if (Number.isNaN(completedAt.getTime())) return null;

    const withinTimeline = completedAt.getTime() <= dueAt.getTime();
    return {
      label: withinTimeline ? 'Timely' : 'Late',
      tone: withinTimeline ? 'success' : 'danger',
      note: `Completed ${formatDate(task.completed_at)}`,
    };
  }

  if (Date.now() > dueAt.getTime()) {
    return {
      label: 'Late',
      tone: 'danger',
      note: `Due ${formatDate(task.due_date)}`,
    };
  }

  return null;
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
  personId: overrides.personId || person?.id || null,
  name: overrides.name || getDisplayName(person, 'Unknown'),
  email: overrides.email ?? person?.email ?? '',
  avatarUrl: overrides.avatarUrl ?? person?.profile_picture_url ?? person?.avatar ?? null,
  role: overrides.role || person?.role || 'employee',
  meta: overrides.meta || '',
  relationType: overrides.relationType || 'direct',
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

const getInstructionAuthorLabel = (instruction) =>
  instruction?.created_by_employee?.name ||
  instruction?.created_by_profile?.full_name ||
  instruction?.created_by_employee?.email ||
  instruction?.created_by_profile?.email ||
  'Unknown';

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

function LegacyAssignmentTreeNode({ node }) {
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

void LegacyAssignmentTreeNode;

function AssignmentTreeNode({ node }) {
  const children = dedupeTreeChildren(node.children || []);
  const isReassignedNode = node.relationType === 'reassigned';
  const isReferenceNode = node.relationType === 'reassigned_reference';
  const isCreatorNode = node.meta === 'Task Creator';
  const nodeIcon = isReassignedNode || isReferenceNode ? ArrowRightLeft : isCreatorNode ? Star : UserRound;
  const pillToneClassName = isReassignedNode || isReferenceNode
    ? 'bg-emerald-50 text-emerald-700'
    : isCreatorNode
      ? 'bg-amber-50 text-amber-700'
      : 'bg-slate-100 text-slate-600';
  const NodeIcon = nodeIcon;

  return (
    <div className='flex flex-col items-center'>
      <div className='flex min-w-[118px] max-w-[170px] flex-col items-center text-center'>
        <Avatar
          name={node.name}
          src={node.avatarUrl}
          size={isReferenceNode ? 'h-9 w-9' : 'h-12 w-12'}
        />
        <span className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${pillToneClassName}`}>
          <NodeIcon size={11} />
          <span className='truncate'>{node.name}</span>
        </span>
      </div>

      {children.length > 0 ? (
        <>
          <div className='h-5 w-px bg-slate-300'></div>
          <div className='flex w-full flex-col items-center'>
            {children.length > 1 ? (
              <div className='hidden h-px w-full bg-slate-300 sm:block'></div>
            ) : null}
            <div className='mt-0 flex w-max min-w-full flex-nowrap items-start justify-center gap-x-3 gap-y-5 sm:gap-x-5'>
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

function TaskDetailLoadingSkeleton() {
  return (
    <div className='min-h-screen bg-slate-50 p-8'>
      <div className='mx-auto flex max-w-[1380px] justify-center'>
        <div className='w-full max-w-6xl space-y-6 rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm'>
          <div className='flex items-start justify-between gap-6'>
            <div className='flex items-start gap-4'>
              <div className='h-10 w-10 animate-pulse rounded-2xl bg-slate-200' />
              <div className='space-y-3'>
                <div className='h-5 w-24 animate-pulse rounded-full bg-slate-200' />
                <div className='h-12 w-[320px] animate-pulse rounded-2xl bg-slate-200' />
                <div className='h-4 w-40 animate-pulse rounded-full bg-slate-100' />
              </div>
            </div>
            <div className='h-10 w-28 animate-pulse rounded-2xl bg-slate-200' />
          </div>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(320px,0.54fr)]'>
            <div className='space-y-5 rounded-[28px] border border-slate-200 bg-slate-50/70 p-6'>
              <div className='flex flex-wrap gap-3'>
                <div className='h-8 w-28 animate-pulse rounded-full bg-slate-200' />
                <div className='h-8 w-32 animate-pulse rounded-full bg-slate-200' />
                <div className='h-8 w-24 animate-pulse rounded-full bg-slate-200' />
              </div>
              <div className='space-y-2'>
                <div className='h-4 w-28 animate-pulse rounded-full bg-slate-200' />
                <div className='h-4 w-full animate-pulse rounded-full bg-slate-100' />
                <div className='h-4 w-5/6 animate-pulse rounded-full bg-slate-100' />
              </div>
              <div className='space-y-3'>
                {[1, 2, 3].map((item) => (
                  <div key={item} className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4'>
                    <div className='h-6 w-6 animate-pulse rounded-full bg-slate-200' />
                    <div className='flex-1 space-y-2'>
                      <div className='h-4 w-3/4 animate-pulse rounded-full bg-slate-200' />
                      <div className='h-3 w-1/3 animate-pulse rounded-full bg-slate-100' />
                    </div>
                    <div className='h-8 w-28 animate-pulse rounded-full bg-slate-100' />
                  </div>
                ))}
              </div>
              <div className='space-y-3'>
                {[1, 2].map((item) => (
                  <div key={item} className='rounded-2xl border border-slate-200 bg-white px-4 py-4'>
                    <div className='flex items-center gap-3'>
                      <div className='h-12 w-12 animate-pulse rounded-2xl bg-slate-200' />
                      <div className='flex-1 space-y-2'>
                        <div className='h-4 w-2/3 animate-pulse rounded-full bg-slate-200' />
                        <div className='h-3 w-1/2 animate-pulse rounded-full bg-slate-100' />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className='space-y-5'>
              <div className='rounded-[28px] border border-slate-200 bg-slate-50/70 p-5'>
                <div className='space-y-3'>
                  {[1, 2, 3].map((item) => (
                    <div key={item} className='flex items-center gap-3'>
                      <div className='h-10 w-10 animate-pulse rounded-full bg-slate-200' />
                      <div className='flex-1 space-y-2'>
                        <div className='h-4 w-28 animate-pulse rounded-full bg-slate-200' />
                        <div className='h-3 w-36 animate-pulse rounded-full bg-slate-100' />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className='rounded-[28px] border border-slate-200 bg-slate-50/70 p-5'>
                <div className='flex justify-center gap-5'>
                  {[1, 2].map((item) => (
                    <div key={item} className='space-y-3 text-center'>
                      <div className='mx-auto h-12 w-12 animate-pulse rounded-full bg-slate-200' />
                      <div className='h-3 w-20 animate-pulse rounded-full bg-slate-200' />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  const [taskCreator, setTaskCreator] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [assignmentActivity, setAssignmentActivity] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [subtaskCommentDrafts, setSubtaskCommentDrafts] = useState({});
  const [subtaskInstructionDrafts, setSubtaskInstructionDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingSubtaskIds, setPendingSubtaskIds] = useState([]);
  const [pendingSubtaskTitleIds, setPendingSubtaskTitleIds] = useState([]);
  const [pendingSubtaskAttachmentIds, setPendingSubtaskAttachmentIds] = useState([]);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [openReassignSubtaskId, setOpenReassignSubtaskId] = useState(null);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState(null);
  const [uploadingTaskAttachments, setUploadingTaskAttachments] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState('medium');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskFrequency, setNewSubtaskFrequency] = useState('');
  const [progressDraft, setProgressDraft] = useState(0);
  const [taskLabels, setTaskLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [taskRatings, setTaskRatings] = useState([]);
  const [reviewAssignees, setReviewAssignees] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRatingsDraft, setReviewRatingsDraft] = useState({});
  const [reviewHoverRatings, setReviewHoverRatings] = useState({});
  const [pendingSubtaskCommentIds, setPendingSubtaskCommentIds] = useState([]);
  const [pendingInstructionIds, setPendingInstructionIds] = useState([]);

  const [subtaskMetaDrafts, setSubtaskMetaDrafts] = useState({});

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

  const completionTiming = useMemo(() => getCompletionTiming(task), [task]);

  const taskComments = useMemo(
    () => comments.filter((comment) => !comment?.subtask_id),
    [comments]
  );

  const subtaskCommentsById = useMemo(() => {
    const mapped = new Map();

    for (const comment of comments) {
      if (!comment?.subtask_id) continue;
      if (!mapped.has(comment.subtask_id)) {
        mapped.set(comment.subtask_id, []);
      }
      mapped.get(comment.subtask_id).push(comment);
    }

    return mapped;
  }, [comments]);

  const latestSubtaskReassignmentById = useMemo(() => {
    const mapped = new Map();

    for (const item of assignmentActivity) {
      if (item?.entityType !== 'subtask' || item?.action !== 'reassigned' || !item?.subtaskId) continue;
      if (!mapped.has(item.subtaskId)) {
        mapped.set(item.subtaskId, item);
      }
    }

    return mapped;
  }, [assignmentActivity]);

  const allVisibleAttachments = useMemo(() => {
    const taskAttachments = (task?.task_attachments || []).map((attachment) => ({
      ...attachment,
      scope: 'task',
      scopeLabel: 'Task Attachment',
      sortDate: attachment.uploaded_at || attachment.created_at || null,
    }));

    const subtaskAttachments = (task?.task_subtasks || []).flatMap((subtask, index) =>
      (subtask?.task_subtask_attachments || []).map((attachment) => ({
        ...attachment,
        scope: 'subtask',
        scopeLabel: `Subtask ${index + 1}`,
        subtaskTitle: subtask.title || 'Subtask',
        sortDate: attachment.uploaded_at || attachment.created_at || null,
      }))
    );

    return [...taskAttachments, ...subtaskAttachments].sort(
      (left, right) => new Date(right.sortDate || 0).getTime() - new Date(left.sortDate || 0).getTime()
    );
  }, [task]);

  const assignmentTree = useMemo(() => {
    const taskAssignments = Array.isArray(task?.task_assignments) ? task.task_assignments : [];
    const subtasks = Array.isArray(task?.task_subtasks) ? task.task_subtasks : [];

    if (!taskCreator && taskAssignments.length === 0 && subtasks.length === 0 && assignmentActivity.length === 0) {
      return [];
    }

    const creatorNode = {
      ...buildTreeNode(taskCreator, {
        id: taskCreator?.id ? `creator:${taskCreator.id}` : 'creator:task',
        name: getDisplayName(taskCreator, 'Task Creator'),
        email: taskCreator?.email || '',
        avatarUrl: taskCreator?.profile_picture_url || null,
        role: taskCreator?.role || 'admin',
        meta: 'Task Creator',
      }),
      children: [],
    };

    const directAssigneeById = new Map();

    const ensureDirectAssigneeNode = (person, meta = 'Assigned Member') => {
      if (!person?.id) return null;
      if (directAssigneeById.has(person.id)) return directAssigneeById.get(person.id);

      const node = {
        ...buildTreeNode(person, {
          id: `assignee:${person.id}`,
          personId: person.id,
          meta,
        }),
        children: [],
      };

      directAssigneeById.set(person.id, node);
      creatorNode.children = [...creatorNode.children, node];
      return node;
    };

    for (const assignment of taskAssignments) {
      if (assignment?.employee?.id) {
        ensureDirectAssigneeNode(assignment.employee, 'Assigned Member');
      }
    }

    const activityBySubtaskId = new Map();
    for (const item of assignmentActivity) {
      if (item?.entityType !== 'subtask' || !item?.subtaskId) continue;
      if (!activityBySubtaskId.has(item.subtaskId)) {
        activityBySubtaskId.set(item.subtaskId, []);
      }
      activityBySubtaskId.get(item.subtaskId).push(item);
    }

    for (const subtask of subtasks) {
      const history = (activityBySubtaskId.get(subtask.id) || [])
        .filter((item) => item?.toEmployee?.id && item.action !== 'unassigned')
        .sort((left, right) => new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime());

      const chain = [];
      const seenEmployeeIds = new Set();

      for (const event of history) {
        const employee = event?.toEmployee;
        if (!employee?.id || seenEmployeeIds.has(employee.id)) continue;
        seenEmployeeIds.add(employee.id);
        chain.push(employee);
      }

      if (chain.length === 0 && subtask?.assigned_employee_id) {
        const currentAssignee = employeeDirectoryById.get(subtask.assigned_employee_id);
        if (currentAssignee?.id) {
          chain.push(currentAssignee);
        }
      }

      if (chain.length === 0) continue;

      let currentNode = ensureDirectAssigneeNode(chain[0], 'Assigned Member');
      if (!currentNode) continue;

      for (let index = 1; index < chain.length; index += 1) {
        const employee = chain[index];
        const childNode = {
          ...buildTreeNode(employee, {
            id: `subtask:${subtask.id}:step:${index}:reference:${employee.id}`,
            personId: employee.id,
            meta: 'Reassigned',
            relationType: 'reassigned_reference',
          }),
          children: [],
        };
        currentNode.children = [...currentNode.children, childNode];
        currentNode = childNode;
      }
    }

    return [creatorNode];
  }, [assignmentActivity, employeeDirectoryById, task, taskCreator]);

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
      setTaskCreator(taskJson.taskCreator || null);
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
      setSubtaskCommentDrafts({});
      setSubtaskInstructionDrafts({});
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
    const subtask = (task?.task_subtasks || []).find((item) => item.id === subtaskId);
    if (!canToggleSubtask(subtask)) return;

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
    const previousCompletedAt = task.completed_at || null;
    const nextCompletedAt = nextStatus === 'completed'
      ? previousCompletedAt || new Date().toISOString()
      : null;
    setSaving(true);
    setError('');
    setTask((prev) => (prev ? { ...prev, status: nextStatus, completed_at: nextCompletedAt } : prev));

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
      setTask((prev) => (prev ? { ...prev, status: previousStatus, completed_at: previousCompletedAt } : prev));
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
          subtaskPriority: newSubtaskPriority || 'medium',
          subtaskDueDate: newSubtaskDueDate || null,
          subtaskFrequency: newSubtaskFrequency || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add subtask');
      }

      setNewSubtaskTitle('');
      setNewSubtaskAssigneeId('');
      setNewSubtaskPriority('medium');
      setNewSubtaskDueDate('');
      setNewSubtaskFrequency('');
      await loadTaskData();
    } catch (err) {
      setError(err.message || 'Failed to add subtask');
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

  const saveSubtaskMeta = async (subtask, field, value) => {
    if (!canManageSubtasks || !subtask) return;
    const body = { subtaskId: subtask.id };
    if (field === 'priority') body.subtaskPriority = value;
    if (field === 'dueDate') body.subtaskDueDate = value || null;
    if (field === 'frequency') body.subtaskFrequency = value || null;
    setSubtaskMetaDrafts((prev) => ({ ...prev, [subtask.id]: { ...(prev[subtask.id] || {}), [field]: value } }));
    try {
      await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (_) {}
  };

  const canEditSubtaskTitle = (subtask) => {
    if (!canManageSubtasks || !subtask) return false;
    if (viewer?.type === 'admin') return true;
    if (viewer?.type !== 'employee') return false;
    return !subtask.assigned_employee_id || subtask.assigned_employee_id === viewer?.employeeId;
  };

  const canToggleSubtask = (subtask) => {
    if (!canManageSubtasks || !subtask) return false;
    if (viewer?.type === 'admin') return true;
    if (viewer?.type !== 'employee') return false;
    return !subtask.assigned_employee_id || subtask.assigned_employee_id === viewer.employeeId;
  };

  const canReassignSubtask = (subtask) => {
    if (!canManageSubtasks || !subtask || !viewer) return false;
    if (viewer?.isTaskCreator) return true;
    if (viewer?.type === 'employee') {
      return subtask.assigned_employee_id === viewer.employeeId;
    }
    return false;
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

  const updateSubtaskAssignee = async (subtask, assignedEmployeeId) => {
    if (!canManageSubtasks || !subtask || !canReassignSubtask(subtask)) return;

    const nextAssignee = assignedEmployeeId || null;
    const subtaskId = subtask.id;
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

      setOpenReassignSubtaskId(null);
      await loadTaskData();
    } catch (err) {
      setTask((prev) => (prev ? { ...prev, task_subtasks: previousSubtasks } : prev));
      setError(err.message || 'Failed to assign subtask');
    }
  };

  const uploadAttachmentsToStorage = async (files) => {
    const payload = new FormData();
    files.forEach((file) => payload.append('files', file));

    const response = await fetch('/Taskmanager/api/tasks/files', {
      method: 'POST',
      body: payload,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to upload files');
    }

    return Array.isArray(result.attachments) ? result.attachments : [];
  };

  const handleTaskAttachmentUpload = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;

    setUploadingTaskAttachments(true);
    setError('');

    try {
      const attachments = await uploadAttachmentsToStorage(files);
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTaskAttachments: attachments }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save task attachments');
      }

      await loadTaskData();
    } catch (err) {
      setError(err.message || 'Failed to upload attachments');
    } finally {
      setUploadingTaskAttachments(false);
    }
  };

  const handleSubtaskAttachmentUpload = async (subtask, fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!subtask?.id || files.length === 0) return;

    setPendingSubtaskAttachmentIds((prev) => [...prev, subtask.id]);
    setError('');

    try {
      const attachments = await uploadAttachmentsToStorage(files);
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtaskId: subtask.id,
          newSubtaskAttachments: attachments,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save subtask attachments');
      }

      await loadTaskData();
    } catch (err) {
      setError(err.message || 'Failed to upload subtask attachments');
    } finally {
      setPendingSubtaskAttachmentIds((prev) => prev.filter((id) => id !== subtask.id));
    }
  };

  const handleTaskCommentSubmit = async (event) => {
    event.preventDefault();
    await postComment();
  };

  const postComment = async (subtaskId = null) => {
    const text = subtaskId
      ? String(subtaskCommentDrafts[subtaskId] || '').trim()
      : commentText.trim();
    if (!text || !canComment) return;

    if (subtaskId) {
      setPendingSubtaskCommentIds((prev) => [...prev, subtaskId]);
    } else {
      setSaving(true);
    }
    setError('');

    try {
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentText: text, subtaskId }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to post comment');
      }

      setComments((prev) => [...prev, result.comment]);
      if (subtaskId) {
        setSubtaskCommentDrafts((prev) => ({ ...prev, [subtaskId]: '' }));
      } else {
        setCommentText('');
      }
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      if (subtaskId) {
        setPendingSubtaskCommentIds((prev) => prev.filter((id) => id !== subtaskId));
      } else {
        setSaving(false);
      }
    }
  };

  const removeComment = async (commentId, subtaskId = null) => {
    setSaving(true);
    setError('');

    try {
      const query = subtaskId
        ? `?commentId=${commentId}&subtaskId=${subtaskId}`
        : `?commentId=${commentId}`;
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}/comments${query}`, {
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

  const addSubtaskInstruction = async (subtaskId) => {
    const instructionText = String(subtaskInstructionDrafts[subtaskId] || '').trim();
    if (!instructionText || !subtaskId) return;

    setPendingInstructionIds((prev) => [...prev, subtaskId]);
    setError('');

    try {
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, instructionText }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add instruction');
      }

      setSubtaskInstructionDrafts((prev) => ({ ...prev, [subtaskId]: '' }));
      await loadTaskData();
    } catch (err) {
      setError(err.message || 'Failed to add instruction');
    } finally {
      setPendingInstructionIds((prev) => prev.filter((id) => id !== subtaskId));
    }
  };

  const removeSubtaskInstruction = async (subtaskId, instructionId) => {
    if (!subtaskId || !instructionId) return;

    setPendingInstructionIds((prev) => [...prev, subtaskId]);
    setError('');

    try {
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, removeInstructionId: instructionId }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove instruction');
      }

      await loadTaskData();
    } catch (err) {
      setError(err.message || 'Failed to remove instruction');
    } finally {
      setPendingInstructionIds((prev) => prev.filter((id) => id !== subtaskId));
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
    return <TaskDetailLoadingSkeleton />;
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
                {completionTiming && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    completionTiming.tone === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                    : completionTiming.tone === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                      : completionTiming.tone === 'danger'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-200 text-slate-700'
                  }`}>
                    {completionTiming.label}
                  </span>
                )}
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
            {completionTiming?.note && (
              <p className='text-sm font-medium text-slate-500'>{completionTiming.note}</p>
            )}

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
                <div className='mb-3 space-y-2'>
                  <div className='flex gap-2'>
                    <input
                      value={newSubtaskTitle}
                      onChange={(event) => setNewSubtaskTitle(event.target.value)}
                      placeholder='Add subtask...'
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
                  <div className='flex flex-wrap gap-2'>
                    <AssigneePicker
                      value={newSubtaskAssigneeId}
                      onChange={setNewSubtaskAssigneeId}
                      options={subtaskAssignees}
                    />
                    <select
                      value={newSubtaskPriority}
                      onChange={(e) => setNewSubtaskPriority(e.target.value)}
                      className='rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white'
                    >
                      <option value='low'>Low</option>
                      <option value='medium'>Medium</option>
                      <option value='high'>High</option>
                    </select>
                    <input
                      type='date'
                      value={newSubtaskDueDate}
                      onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                      className='rounded-lg border border-slate-200 px-2 py-1.5 text-xs'
                    />
                    <select
                      value={newSubtaskFrequency}
                      onChange={(e) => setNewSubtaskFrequency(e.target.value)}
                      className='rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white'
                    >
                      <option value=''>No Repeat</option>
                      <option value='weekly'>Weekly</option>
                      <option value='monthly'>Monthly</option>
                      <option value='yearly'>Yearly</option>
                    </select>
                  </div>
                </div>
              )}
              <div className='space-y-2'>
                {(task.task_subtasks || []).map((subtask, subtaskIndex) => {
                  const latestReassignment = latestSubtaskReassignmentById.get(subtask.id);
                  const reassignedBy = latestReassignment?.actor?.name || latestReassignment?.actor?.email || 'Task creator';
                  const fromName = latestReassignment?.fromEmployee?.name || latestReassignment?.fromEmployee?.email || 'Unknown';
                  const toName = latestReassignment?.toEmployee?.name || latestReassignment?.toEmployee?.email || 'Unknown';
                  const assigned = employeeDirectoryById.get(subtask.assigned_employee_id);
                  const isExpanded = expandedSubtaskId === subtask.id;
                  const subtaskComments = subtaskCommentsById.get(subtask.id) || [];
                  const instructionItems = subtask.task_subtask_instructions || [];
                  const isInstructionPending = pendingInstructionIds.includes(subtask.id);
                  const isCommentPending = pendingSubtaskCommentIds.includes(subtask.id);

                  return (
                    <div
                      key={subtask.id}
                      className={`rounded-2xl border px-4 py-3 transition ${
                        subtask.is_completed
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className='flex items-start gap-3'>
                        <button
                          type='button'
                          disabled={
                            !canToggleSubtask(subtask) ||
                            saving ||
                            pendingSubtaskIds.includes(subtask.id) ||
                            pendingSubtaskTitleIds.includes(subtask.id)
                          }
                          onClick={() => toggleSubtask(subtask.id, subtask.is_completed)}
                          aria-label={`Toggle subtask ${subtask.title}`}
                          className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${
                            subtask.is_completed
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 bg-white text-transparent hover:border-[#7F40EE] hover:text-[#7F40EE]'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {subtask.is_completed ? <Check size={14} /> : <Circle size={14} />}
                        </button>

                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4'>
                            <div className='min-w-0'>
                              {editingSubtaskId === subtask.id ? (
                                <div className='flex items-start gap-2'>
                                  <span className='mt-2 text-slate-400'>{subtaskIndex + 1}.</span>
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
                                    className='min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700'
                                    disabled={pendingSubtaskTitleIds.includes(subtask.id)}
                                    aria-label='Edit subtask title'
                                  />
                                </div>
                              ) : (
                                <div className='flex items-start gap-2'>
                                  <p className={`min-w-0 flex-1 text-sm font-medium leading-6 break-words ${subtask.is_completed ? 'text-emerald-800' : 'text-slate-800'}`}>
                                    <span className='mr-2 text-slate-400'>{subtaskIndex + 1}.</span>
                                    {subtask.title}
                                  </p>
                                  {canEditSubtaskTitle(subtask) ? (
                                    <button
                                      type='button'
                                      onClick={() => startSubtaskTitleEdit(subtask)}
                                      disabled={pendingSubtaskTitleIds.includes(subtask.id)}
                                      className='mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-60'
                                      aria-label='Edit subtask title'
                                    >
                                      <Pencil size={13} />
                                    </button>
                                  ) : null}
                                </div>
                              )}
                              {instructionItems.length > 0 ? (
                                <div className='mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500'>
                                  <span className='shrink-0'>📝</span>
                                  <span className='truncate'>
                                    {instructionItems.map((instruction) => instruction.instruction_text).filter(Boolean).join(' • ')}
                                  </span>
                                </div>
                              ) : null}
                              {(subtask.priority && subtask.priority !== 'medium') || subtask.due_date || subtask.frequency ? (
                                <div className='mt-1.5 flex flex-wrap gap-1'>
                                  {subtask.priority && subtask.priority !== 'medium' && (
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ subtask.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600' }`}>{subtask.priority}</span>
                                  )}
                                  {subtask.due_date && (
                                    <span className='inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700'>{new Date(subtask.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  )}
                                  {subtask.frequency && (
                                    <span className='inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700'>Repeats {subtask.frequency}</span>
                                  )}
                                </div>
                              ) : null}
                            </div>
                            <div className='flex flex-nowrap items-start gap-2 sm:justify-self-end'>
                              {assigned ? (
                                <div className='inline-flex max-w-[220px] items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1'>
                                  <Avatar
                                    name={assigned.name}
                                    src={assigned.profile_picture_url || assigned.avatar}
                                    size='w-6 h-6'
                                  />
                                  <span className='text-xs font-medium leading-4 text-slate-600 whitespace-normal break-words'>
                                    {assigned.name}
                                  </span>
                                </div>
                              ) : (
                                <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500'>Unassigned</span>
                              )}
                              <button
                                type='button'
                                onClick={() => setExpandedSubtaskId((prev) => (prev === subtask.id ? null : subtask.id))}
                                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900'
                                aria-label={isExpanded ? 'Hide subtask details' : 'Show subtask details'}
                              >
                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className='mt-4 space-y-4 border-t border-slate-100 pt-4'>
                              <div className='flex flex-wrap items-center justify-between gap-3'>
                                <div className='flex-1' />

                                <div className='flex flex-wrap items-center gap-2'>
                                  {canReassignSubtask(subtask) && (
                                    <button
                                      type='button'
                                      onClick={() => setOpenReassignSubtaskId((prev) => (prev === subtask.id ? null : subtask.id))}
                                      disabled={saving || pendingSubtaskTitleIds.includes(subtask.id)}
                                      className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60'
                                    >
                                      <ArrowRightLeft size={12} />
                                      Reassign
                                    </button>
                                  )}
                                  <label className='inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900'>
                                    <Upload size={12} />
                                    Upload file
                                    <input
                                      type='file'
                                      multiple
                                      className='hidden'
                                      onChange={(event) => {
                                        handleSubtaskAttachmentUpload(subtask, event.target.files);
                                        event.target.value = '';
                                      }}
                                      disabled={pendingSubtaskAttachmentIds.includes(subtask.id)}
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className='flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3'>
                                <div className='flex flex-col gap-1'>
                                  <span className='text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>Priority</span>
                                  <select
                                    value={subtaskMetaDrafts[subtask.id]?.priority ?? subtask.priority ?? 'medium'}
                                    onChange={(e) => saveSubtaskMeta(subtask, 'priority', e.target.value)}
                                    disabled={!canManageSubtasks}
                                    className='rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs'
                                  >
                                    <option value='low'>Low</option>
                                    <option value='medium'>Medium</option>
                                    <option value='high'>High</option>
                                  </select>
                                </div>
                                <div className='flex flex-col gap-1'>
                                  <span className='text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>Due Date</span>
                                  <input
                                    type='date'
                                    value={subtaskMetaDrafts[subtask.id]?.dueDate ?? (subtask.due_date ? subtask.due_date.slice(0,10) : '')}
                                    onChange={(e) => saveSubtaskMeta(subtask, 'dueDate', e.target.value)}
                                    disabled={!canManageSubtasks}
                                    className='rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs'
                                  />
                                </div>
                                <div className='flex flex-col gap-1'>
                                  <span className='text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>Repeat</span>
                                  <select
                                    value={subtaskMetaDrafts[subtask.id]?.frequency ?? subtask.frequency ?? ''}
                                    onChange={(e) => saveSubtaskMeta(subtask, 'frequency', e.target.value)}
                                    disabled={!canManageSubtasks}
                                    className='rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs'
                                  >
                                    <option value=''>No Repeat</option>
                                    <option value='weekly'>Weekly</option>
                                    <option value='monthly'>Monthly</option>
                                    <option value='yearly'>Yearly</option>
                                  </select>
                                </div>
                              </div>

                              {latestReassignment?.fromEmployee?.id && latestReassignment?.toEmployee?.id && (
                                <div className='flex flex-wrap items-center gap-2 text-xs text-slate-500'>
                                  <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1'>
                                    <ArrowRightLeft size={11} />
                                    <span>{fromName}</span>
                                    <span className='text-slate-400'>to</span>
                                    <span>{toName}</span>
                                  </span>
                                  <span className='text-[11px] text-slate-400'>by {reassignedBy}</span>
                                </div>
                              )}

                              {openReassignSubtaskId === subtask.id && canReassignSubtask(subtask) && (
                                <div className='pt-1'>
                                  <AssigneePicker
                                    value={subtask.assigned_employee_id || ''}
                                    onChange={(value) => updateSubtaskAssignee(subtask, value)}
                                    disabled={saving || pendingSubtaskTitleIds.includes(subtask.id)}
                                    options={subtaskAssignees}
                                    placeholder='Select reassignee'
                                  />
                                </div>
                              )}

                              <div className='space-y-3'>
                                <div className='space-y-2'>

                                  <div className='flex flex-wrap gap-2'>
                                    {instructionItems.map((instruction) => (
                                      <div key={instruction.id} className='inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1'>
                                          <span className='shrink-0 text-[11px]'>📝</span>
                                              <p className='truncate max-w-[240px] text-[11px] leading-4 text-slate-600'>{instruction.instruction_text}</p>
                                              <span className='hidden'>
                                              Added by {getInstructionAuthorLabel(instruction)} • {formatDate(instruction.created_at)}
                                              </span>
                                          {canManageSubtasks ? (
                                            <button
                                              type='button'
                                              onClick={() => removeSubtaskInstruction(subtask.id, instruction.id)}
                                              disabled={isInstructionPending}
                                              className='text-[10px] font-semibold text-rose-500 transition hover:text-rose-600 disabled:opacity-60'
                                            >
                                              x
                                            </button>
                                          ) : null}
                                        </div>
                                    ))}
                                    {instructionItems.length === 0 ? (
                                      <div className='rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500'>
                                        No instructions added yet.
                                      </div>
                                    ) : null}
                                  </div>

                                  {canManageSubtasks ? (
                                    <div className='mt-2 flex gap-2'>
                                      <input
                                        value={subtaskInstructionDrafts[subtask.id] || ''}
                                        onChange={(event) =>
                                          setSubtaskInstructionDrafts((prev) => ({ ...prev, [subtask.id]: event.target.value }))
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault();
                                            addSubtaskInstruction(subtask.id);
                                          }
                                        }}
                                        placeholder='Add instruction'
                                        className='flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700'
                                      />
                                      <button
                                        type='button'
                                        onClick={() => addSubtaskInstruction(subtask.id)}
                                        disabled={isInstructionPending || !String(subtaskInstructionDrafts[subtask.id] || '').trim()}
                                        className='inline-flex items-center gap-1 rounded-lg bg-[#7F40EE] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#6A31D1] disabled:opacity-60'
                                      >
                                        <Plus size={12} />
                                        Add
                                      </button>
                                    </div>
                                  ) : null}
                                </div>

                                <div className='rounded-2xl border border-slate-200 bg-slate-50/60 p-3'>

                                  <div className='space-y-2'>
                                    {subtaskComments.length === 0 ? (
                                      <div className='text-xs text-slate-400'>
                                        Write comment / message
                                      </div>
                                    ) : (
                                      subtaskComments.map((comment, index) => (
                                        <div key={comment.id} className='flex items-start gap-2'>
                                          <div>
                                            <Avatar
                                              name={getCommentAuthorLabel(comment, viewer)}
                                              src={comment.author_avatar_url}
                                              size='w-7 h-7'
                                            />
                                          </div>
                                          <div className='min-w-0 flex-1 rounded-2xl bg-white px-3 py-2'>
                                            <div className='flex items-center justify-between gap-2'>
                                              <div className='min-w-0'>
                                                <p className='truncate text-[11px] font-semibold text-slate-700'>{getCommentAuthorLabel(comment, viewer)}</p>
                                              </div>
                                              <p className='text-[10px] text-slate-400'>{formatDate(comment.created_at)}</p>
                                              {comment.can_delete ? (
                                                <button
                                                  type='button'
                                                  onClick={() => removeComment(comment.id, subtask.id)}
                                                  className='text-[10px] font-semibold text-rose-500 transition hover:text-rose-600'
                                                >
                                                  Delete
                                                </button>
                                              ) : null}
                                            </div>
                                            <p className='mt-1 text-xs leading-5 text-slate-600'>{comment.comment_text}</p>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  {canComment ? (
                                    <div className='mt-3 flex gap-2'>
                                      <input
                                        value={subtaskCommentDrafts[subtask.id] || ''}
                                        onChange={(event) =>
                                          setSubtaskCommentDrafts((prev) => ({ ...prev, [subtask.id]: event.target.value }))
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault();
                                            postComment(subtask.id);
                                          }
                                        }}
                                        placeholder='Write comment / message'
                                        className='flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs'
                                      />
                                      <button
                                        type='button'
                                        disabled={isCommentPending || !String(subtaskCommentDrafts[subtask.id] || '').trim()}
                                        onClick={() => postComment(subtask.id)}
                                        className='rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60'
                                      >
                                        Post
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                                  <Paperclip size={12} />
                                  Documents
                                </div>
                                {(subtask.task_subtask_attachments || []).length > 0 ? (
                                  <div className='space-y-2'>
                                    {(subtask.task_subtask_attachments || []).map((attachment) => {
                                      const presenter = getAttachmentPresenter(attachment);
                                      const AttachmentIcon = presenter.Icon;
                                      return (
                                        <div key={attachment.id} className='flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3'>
                                          <div className='flex min-w-0 items-center gap-3'>
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${presenter.iconClassName}`}>
                                              <AttachmentIcon size={16} />
                                            </div>
                                            <div className='min-w-0'>
                                              <p className='truncate text-sm font-medium text-slate-800'>{attachment.file_name}</p>
                                              <p className='text-xs text-slate-500'>
                                                Uploaded by {getAttachmentUploaderLabel(attachment)} • {formatDate(attachment.uploaded_at || attachment.created_at)}
                                              </p>
                                            </div>
                                          </div>
                                          <a
                                            href={attachment.file_url}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900'
                                          >
                                            <ExternalLink size={12} />
                                            View
                                          </a>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className='text-sm text-slate-500'>No subtask documents yet.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!task.task_subtasks || task.task_subtasks.length === 0) && (
                  <p className='text-sm text-slate-500'>No subtasks.</p>
                )}
              </div>
            </div>

            <div>
              <div className='mb-3'>
                <h2 className='text-sm font-semibold text-slate-600'>Attachments</h2>
              </div>
              <label className='mb-4 flex w-full cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-9 text-center transition hover:border-slate-400 hover:bg-slate-100/70'>
                <span className='mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-700'>
                  <Upload size={24} />
                </span>
                <span className='text-lg font-semibold text-slate-800'>
                  {uploadingTaskAttachments ? 'Uploading documents...' : 'Drop documents here or click to browse'}
                </span>
                <span className='mt-2 text-sm text-slate-500'>PDF, DOC, DOCX</span>
                <input
                  type='file'
                  multiple
                  className='hidden'
                  onChange={(event) => {
                    handleTaskAttachmentUpload(event.target.files);
                    event.target.value = '';
                  }}
                  disabled={uploadingTaskAttachments}
                />
              </label>
              <div className='space-y-2'>
                {allVisibleAttachments.map((attachment) => (
                  (() => {
                    const presenter = getAttachmentPresenter(attachment);
                    const uploaderLabel = getAttachmentUploaderLabel(attachment);
                    const AttachmentIcon = presenter.Icon;

                    return (
                      <div
                        key={attachment.id}
                        className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300'
                      >
                        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                          <div className='flex min-w-0 items-start gap-3'>
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${presenter.iconClassName}`}>
                              <AttachmentIcon size={20} />
                            </div>
                            <div className='min-w-0'>
                              <p className='truncate text-sm font-semibold text-slate-800'>
                                {attachment.file_name || 'Attachment'}
                              </p>
                              <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500'>
                                <span className='inline-flex items-center gap-1'>
                                  <UserRound size={12} />
                                  Uploaded by {uploaderLabel}
                                </span>
                                <span className='inline-flex items-center gap-1'>
                                  <Clock3 size={12} />
                                  {formatDate(attachment.uploaded_at || attachment.created_at)}
                                </span>
                                <span className='rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                                  {presenter.label}
                                </span>
                                <span className='rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                                  {attachment.scopeLabel}
                                </span>
                                {attachment.scope === 'subtask' && attachment.subtaskTitle ? (
                                  <span className='text-xs font-medium text-slate-500'>
                                    {attachment.subtaskTitle}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className='flex shrink-0 items-center gap-2'>
                            <a
                              href={attachment.file_url}
                              target='_blank'
                              rel='noreferrer'
                              className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900'
                            >
                              <ExternalLink size={13} />
                              Open
                            </a>
                            <a
                              href={attachment.file_url}
                              download
                              className='inline-flex items-center gap-2 rounded-full bg-[#7F40EE] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#6A31D1]'
                            >
                              <Download size={13} />
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ))}
                {allVisibleAttachments.length === 0 && (
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
              <div className='mb-4'>
                <h3 className='text-sm font-semibold uppercase tracking-[0.18em] text-slate-500'>Assignment Tree</h3>
              </div>
              <div className='w-full px-1 py-2'>
                {assignmentTree.length === 0 ? (
                  <div className='px-2 py-4 text-center'>
                    <p className='text-sm font-medium text-slate-700'>No assignment map yet.</p>
                  </div>
                ) : (
                  <div
                    className='max-h-[640px] overflow-auto pb-2 pr-1 [scrollbar-color:#94a3b8_#e2e8f0] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-slate-200'
                    style={{ scrollbarWidth: 'auto' }}
                  >
                    <div className='flex min-w-max flex-col items-center gap-8'>
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
          <h2 className='mb-4 text-lg font-semibold text-slate-800'>Task Discussion</h2>

          <div className='space-y-5'>
            {taskComments.map((comment) => (
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
            {taskComments.length === 0 && <p className='text-sm text-slate-500'>No task discussion yet.</p>}
          </div>

          {canComment && (
            <form className='mt-4 flex gap-3' onSubmit={handleTaskCommentSubmit}>
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    postComment();
                  }
                }}
                placeholder='Write a comment...'
                rows={2}
                className='flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none'
              />
              <button
                type='submit'
                disabled={saving || !commentText.trim()}
                className='rounded-lg bg-[#7F40EE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6A31D1] disabled:opacity-60'
              >
                Comment
              </button>
            </form>
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

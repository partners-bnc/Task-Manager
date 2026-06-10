'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from './Sidebar';
import { DataProvider, useData } from './DataContext';
import { ModuleAccessGate } from '@/app/components-homepage/ModuleAccessGate';
import { USERS } from './data';
import { WorkspaceShellLoader } from '@/app/components-homepage/ExperienceLoaders';
import Login from './Login';
import CalendarView from './CalendarView';
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
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
  LayoutGrid,
  List,
  Star,
  Users,
  Upload,
  UserRound,
  UserPlus,
  CalendarPlus,
  Flag,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  X,
  Ban,
  User,
  Tag,
  Repeat,
  Settings,
  AlignLeft,
  Activity,
  CheckCircle2,
  Trash2,
  Eye,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Complete' },
];

const STATUS_BUTTON_STYLES = {
  pending: {
    active: 'border-slate-300 bg-slate-100 text-slate-800',
    inactive: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
    dot: 'bg-slate-500',
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

const getTaskStatusBadgeStyle = (status) => {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700 hover:ring-emerald-400/20';
  if (status === 'in_progress') return 'bg-sky-100 text-sky-700 hover:ring-sky-400/20';
  return 'bg-slate-100 text-slate-700 hover:ring-slate-400/20'; // pending/to do
};

    const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
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

const formatShortDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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
const TASK_SECTION_TABS = [
  { id: 'list', label: 'List', icon: List },
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'team', label: 'Team', icon: Users },
];

const SUBTASK_STATUS_ORDER = ['to_do', 'in_progress', 'completed'];

const getSubtaskStatus = (subtask, index = 0) => {
  if (subtask?._statusOverride === 'to_do') return 'to_do';
  if (subtask?._statusOverride === 'in_progress') return 'in_progress';
  if (subtask?.is_completed) return 'completed';
  return 'to_do';
};

const getSubtaskStatusLabel = (status) => {
  if (status === 'to_do') return 'To Do';
  if (status === 'in_progress') return 'In Progress';
  return 'Completed';
};

const getSubtaskStatusTone = (status) => {
  if (status === 'completed') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  }
  if (status === 'in_progress') {
    return 'border-sky-200 bg-sky-100 text-sky-700';
  }
  return 'border-slate-200 bg-slate-100 text-slate-600';
};

const getSubtaskProgress = (status) => {
  if (status === 'completed') return 100;
  if (status === 'in_progress') return 60;
  return 20;
};

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
    <details className='relative min-w-[180px]' data-assignee-picker onClick={(e) => e.stopPropagation()}>
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

function TaskDetailPageInner({ taskId, mode = 'employee' }) {
  const { user, loading: dataLoading } = useData();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleNavigate = (view) => {
    const isModeAdmin = mode === 'admin';
    const baseUrl = isModeAdmin ? '/Taskmanager/admin' : '/Taskmanager/dashboard';

    if (view === 'dashboard') {
      window.location.href = baseUrl;
    } else if (view === 'tasks') {
      window.location.href = isModeAdmin ? '/Taskmanager/admin/tasks' : '/Taskmanager/dashboard/tasks';
    } else {
      window.location.href = `${baseUrl}?view=${view}`;
    }
  };

  const [task, setTask] = useState(null);
  const [taskCreator, setTaskCreator] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [assignmentActivity, setAssignmentActivity] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [subtaskCommentDrafts, setSubtaskCommentDrafts] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [subtaskInstructionDrafts, setSubtaskInstructionDrafts] = useState({});
  const [editingInstructionId, setEditingInstructionId] = useState(null);
  const [editingInstructionText, setEditingInstructionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingSubtaskIds, setPendingSubtaskIds] = useState([]);
  const [pendingSubtaskTitleIds, setPendingSubtaskTitleIds] = useState([]);
  const [pendingSubtaskAttachmentIds, setPendingSubtaskAttachmentIds] = useState([]);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [selectedSubtaskId, setSelectedSubtaskId] = useState(null);
  const [priorityDropdownSubtaskId, setPriorityDropdownSubtaskId] = useState(null);
  const [statusDropdownSubtaskId, setStatusDropdownSubtaskId] = useState(null);
  const [tablePriorityDropdownSubtaskId, setTablePriorityDropdownSubtaskId] = useState(null);
  const [tableStatusDropdownSubtaskId, setTableStatusDropdownSubtaskId] = useState(null);
  const [tableRepeatDropdownSubtaskId, setTableRepeatDropdownSubtaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [isDraggingSubtaskId, setIsDraggingSubtaskId] = useState(null);
  const [openReassignSubtaskId, setOpenReassignSubtaskId] = useState(null);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState(null);
  const [uploadingTaskAttachments, setUploadingTaskAttachments] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [draftSubtasks, setDraftSubtasks] = useState([
    { id: 1, title: '', assigneeId: '', priority: 'medium', dueDate: '', frequency: '' }
  ]);
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
  const [activeTaskSection, setActiveTaskSection] = useState('list');
  const [collapsedSections, setCollapsedSections] = useState({});
  const toggleSectionCollapse = (sectionStatus) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionStatus]: !prev[sectionStatus],
    }));
  };

  const [subtaskMetaDrafts, setSubtaskMetaDrafts] = useState({});

  const listSectionRef = useRef(null);
  const boardSectionRef = useRef(null);
  const calendarSectionRef = useRef(null);
  const teamSectionRef = useRef(null);
  const subtaskDateRefs = useRef({});
  const selectedSubtaskDateRef = useRef(null);
  const newSubtaskDateInputRefs = useRef({});

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

  const canEditTask = useMemo(() => {
    if (!viewer || !task) return false;
    if (viewer.isTaskCreator || viewer.type === 'admin') return true;
    return !!task.task_assignments?.some((a) => String(a.employee_id) === String(viewer.employeeId));
  }, [viewer, task]);
  const showEditSettings = useMemo(() => {
    if (!viewer) return false;
    return !!(viewer.isTaskCreator || viewer.type === 'admin');
  }, [viewer]);
  const canComment = !!viewer?.canComment;
  const canManageSubtasks = useMemo(() => {
    if (!viewer || !task) return false;
    if (viewer.isTaskCreator || viewer.type === 'admin') return true;
    return !!task.task_assignments?.some((a) => String(a.employee_id) === String(viewer.employeeId));
  }, [viewer, task]);
  const canManageStatus = useMemo(() => {
    if (!viewer || !task) return false;
    if (viewer.isTaskCreator || viewer.type === 'admin') return true;
    return !!task.task_assignments?.some(
      (assignment) => String(assignment.employee_id) === String(viewer.employeeId)
    );
  }, [viewer, task]);

  const canEditSubtaskMetadata = (_subtask) => {
    if (!viewer) return false;
    // Any logged-in viewer who has access to this task can edit subtask metadata
    return true;
  };

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

  const selectedSubtask = useMemo(
    () => (task?.task_subtasks || []).find((subtask) => subtask.id === selectedSubtaskId) || null,
    [selectedSubtaskId, task]
  );

  const getSubtaskStatusWithDraft = (subtask, index = 0) => {
    if (!subtask) return 'to_do';
    const draftStatus = subtaskMetaDrafts[subtask.id]?.status;
    if (draftStatus) return draftStatus;
    return getSubtaskStatus(subtask, index);
  };

  const groupedSubtasks = useMemo(() => {
    const subtasks = Array.isArray(task?.task_subtasks) ? task.task_subtasks : [];
    const grouped = {
      in_progress: [],
      to_do: [],
      completed: [],
    };

    subtasks.forEach((subtask, index) => {
      const status = getSubtaskStatusWithDraft(subtask, index);
      grouped[status].push({ subtask, status, index });
    });

    return grouped;
  }, [task, subtaskMetaDrafts]);

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

  const scheduledItems = useMemo(() => {
    const items = [];

    if (task?.due_date) {
      items.push({
        id: `task:${task.id || 'task'}`,
        title: task.task_name || 'Task',
        kind: 'Task',
        dueDate: task.due_date,
        status: task.status || 'pending',
      });
    }

    for (const subtask of Array.isArray(task?.task_subtasks) ? task.task_subtasks : []) {
      if (!subtask?.due_date) continue;
      items.push({
        id: `subtask:${subtask.id}`,
        title: subtask.title || 'Subtask',
        kind: 'Subtask',
        dueDate: subtask.due_date,
        status: getSubtaskStatusWithDraft(subtask),
        assignedEmployeeId: subtask.assigned_employee_id || null,
      });
    }

    return items.sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
  }, [task, subtaskMetaDrafts]);

  const scrollToTaskSection = (sectionId) => {
    setActiveTaskSection(sectionId);
  };

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

  useEffect(() => {
    if (selectedSubtaskId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedSubtaskId]);

  const handleSaveTask = async () => {
    if (!showEditSettings) return;

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

  const deriveTaskStatusFromSubtasks = (currentSubtasks) => {
    if (!currentSubtasks || currentSubtasks.length === 0) return;

    const total = currentSubtasks.length;
    const completedCount = currentSubtasks.filter((s) => s.is_completed).length;
    const inProgressCount = currentSubtasks.filter((s) => !s.is_completed && s._statusOverride === 'in_progress').length;

    const nextProgress = Math.round((completedCount / total) * 100);
    let nextStatus;
    if (completedCount === total) {
      nextStatus = 'completed';
    } else if (inProgressCount > 0 || completedCount > 0) {
      nextStatus = 'in_progress';
    } else {
      // All subtasks still to_do — keep task as pending
      nextStatus = 'pending';
    }

    setProgressDraft(nextProgress);
    setTask((prev) => {
      if (!prev) return prev;
      if (prev.status === nextStatus && prev.progress_percentage === nextProgress) return prev;
      return { ...prev, status: nextStatus, progress_percentage: nextProgress };
    });

    fetch(`/Taskmanager/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, progressPercentage: nextProgress }),
    }).catch(() => {});
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

      // Derive task status from updated subtasks
      setTask((prev) => {
        if (prev) deriveTaskStatusFromSubtasks(prev.task_subtasks || []);
        return prev;
      });
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

  const updateDraftSubtask = (draftId, fields) => {
    setDraftSubtasks((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, ...fields } : d))
    );
  };

  const removeDraftSubtask = (draftId) => {
    setDraftSubtasks((prev) => {
      if (prev.length === 1) {
        return [{ id: Date.now(), title: '', assigneeId: '', priority: 'medium', dueDate: '', frequency: '' }];
      }
      return prev.filter((d) => d.id !== draftId);
    });
  };

  const addChecklistItem = async (draftId) => {
    const draft = draftSubtasks.find((d) => d.id === draftId);
    if (!draft) return;

    const title = draft.title.trim() || 'New Subtask';
    if (!viewer) return;

    const existingSubtaskIds = new Set((task?.task_subtasks || []).map((s) => s.id));

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtaskTitle: title,
          assignedEmployeeId: draft.assigneeId || null,
          subtaskPriority: draft.priority,
          subtaskDueDate: draft.dueDate || null,
          subtaskFrequency: draft.frequency || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add subtask');
      }

      setDraftSubtasks((prev) => {
        const remaining = prev.filter((d) => d.id !== draftId);
        return remaining.length > 0 ? remaining : [{ id: Date.now(), title: '', assigneeId: '', priority: 'medium', dueDate: '', frequency: '' }];
      });

      await loadTaskData();

      setTask((prev) => {
        if (!prev) return prev;
        const newSubtask = (prev.task_subtasks || []).find((s) => !existingSubtaskIds.has(s.id));
        if (newSubtask) setSelectedSubtaskId(newSubtask.id);
        return prev;
      });
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
    if (!subtask) return;
    if (field === 'status') {
      if (!canToggleSubtask(subtask)) return;
    } else {
      if (!canEditSubtaskMetadata(subtask)) return;
    }
    const body = { subtaskId: subtask.id };
    if (field === 'priority') body.subtaskPriority = value;
    if (field === 'dueDate') body.subtaskDueDate = value || null;
    if (field === 'frequency') body.subtaskFrequency = value || null;
    if (field === 'status') body.subtaskStatus = value;
    setSubtaskMetaDrafts((prev) => ({ ...prev, [subtask.id]: { ...(prev[subtask.id] || {}), [field]: value } }));
    if (field === 'status') {
      const nextCompleted = value === 'completed' || value === 'done';
      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          task_subtasks: (prev.task_subtasks || []).map((s) =>
            s.id === subtask.id ? { ...s, is_completed: nextCompleted, _statusOverride: value } : s
          ),
        };
      });
    }
    if (field === 'dueDate') {
      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          task_subtasks: (prev.task_subtasks || []).map((s) =>
            s.id === subtask.id ? { ...s, due_date: value || null } : s
          ),
        };
      });
    }
    if (field === 'frequency') {
      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          task_subtasks: (prev.task_subtasks || []).map((s) =>
            s.id === subtask.id ? { ...s, frequency: value || null } : s
          ),
        };
      });
    }
    if (field === 'status') {
      setTask((prev) => {
        if (prev) setTimeout(() => deriveTaskStatusFromSubtasks(prev.task_subtasks || []), 0);
        return prev;
      });
    }
    try {
      const res = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const result = await res.json();
        setError(result.error || 'Failed to update subtask');
      }
    } catch (_) { }
  };

  const handleSubtaskDragStart = (event, subtaskId) => {
    setIsDraggingSubtaskId(subtaskId);
    event.dataTransfer.setData('text/plain', subtaskId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSubtaskDragEnd = () => {
    setIsDraggingSubtaskId(null);
  };

  const handleSubtaskDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleSubtaskDrop = async (event, targetStatus) => {
    event.preventDefault();
    setIsDraggingSubtaskId(null);
    const subtaskId = event.dataTransfer.getData('text/plain') || isDraggingSubtaskId;
    if (!subtaskId) return;

    const subtask = task.task_subtasks?.find((s) => s.id === subtaskId);
    if (!subtask) return;

    const currentStatus = getSubtaskStatusWithDraft(subtask);
    if (currentStatus === targetStatus) return;

    if (!canToggleSubtask(subtask)) return;

    const targetCompleted = targetStatus === 'completed';

    // Optimistically update local task state and subtaskMetaDrafts
    setSubtaskMetaDrafts((prev) => ({
      ...prev,
      [subtaskId]: {
        ...(prev[subtaskId] || {}),
        status: targetStatus,
      },
    }));

    setTask((prev) => {
      if (!prev) return prev;
      const updatedSubtasks = (prev.task_subtasks || []).map((s) =>
        s.id === subtaskId
          ? { ...s, is_completed: targetCompleted, _statusOverride: targetStatus }
          : s
      );
      setTimeout(() => deriveTaskStatusFromSubtasks(updatedSubtasks), 0);
      return {
        ...prev,
        task_subtasks: updatedSubtasks,
      };
    });

    try {
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtaskId,
          isCompleted: targetCompleted,
          subtaskStatus: targetStatus,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update subtask status');
      }
    } catch (err) {
      setError(err.message || 'Failed to update subtask status');
      // Revert on error
      await loadTaskData();
    }
  };

  const deleteSubtask = async (subtaskId) => {
    if (!subtaskId || !canManageSubtasks) return;
    if (!window.confirm('Delete this subtask? This cannot be undone.')) return;
    try {
      const res = await fetch(`/Taskmanager/api/tasks?subtaskId=${subtaskId}`, { method: 'DELETE' });
      if (res.ok) { setSelectedSubtaskId(null); await loadTaskData(); }
      else { const r = await res.json(); setError(r.error || 'Failed to delete subtask'); }
    } catch { setError('Failed to delete subtask'); }
  };

  const canEditSubtaskTitle = (subtask) => {
    if (!subtask || !viewer) return false;
    return !!(viewer.isTaskCreator || viewer.type === 'admin');
  };

  const canToggleSubtask = (subtask) => {
    if (!subtask || !viewer) return false;
    if (viewer.isTaskCreator || viewer.type === 'admin') return true;
    if (subtask.assigned_employee_id && viewer.employeeId && String(subtask.assigned_employee_id) === String(viewer.employeeId)) return true;
    return !!task?.task_assignments?.some((a) => String(a.employee_id) === String(viewer.employeeId));
  };

  const canReassignSubtask = (subtask) => {
    if (!subtask || !viewer) return false;
    if (viewer.isTaskCreator || viewer.type === 'admin') return true;
    if (subtask.assigned_employee_id && viewer.employeeId && String(subtask.assigned_employee_id) === String(viewer.employeeId)) {
      return true;
    }
    const isMainTaskAssignee = task?.task_assignments?.some(
      (assignment) => String(assignment.employee_id) === String(viewer.employeeId)
    );
    if (isMainTaskAssignee) return true;
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
    if (!subtask || !canReassignSubtask(subtask)) return;

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

  const updateComment = async (commentId, subtaskId = null) => {
    const text = editingCommentText.trim();
    if (!text) return;
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, commentText: text, subtaskId }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update comment');
      }

      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, comment_text: result.comment.comment_text } : c))
      );
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      setError(err.message || 'Failed to update comment');
    } finally {
      setSaving(false);
    }
  };

  const addSubtaskInstruction = async (subtaskId) => {
    const instructionText = String(subtaskInstructionDrafts[subtaskId] || '').trim();
    if (!instructionText || !subtaskId) return;
    if (!viewer) return;

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

  const updateSubtaskInstruction = async (subtaskId, instructionId) => {
    const text = editingInstructionText.trim();
    if (!text || !subtaskId || !instructionId) return;

    setPendingInstructionIds((prev) => [...prev, subtaskId]);
    setError('');

    try {
      const response = await fetch(`/Taskmanager/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, editInstructionId: instructionId, editInstructionText: text }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update instruction');
      }

      setEditingInstructionId(null);
      setEditingInstructionText('');
      await loadTaskData();
    } catch (err) {
      setError(err.message || 'Failed to update instruction');
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

  if (dataLoading) {
    return (
      <WorkspaceShellLoader
        title="Loading Task Details"
        message="Fetching the task dashboard, assignments, comments, and project settings."
      />
    );
  }

  if (!user) {
    return <Login onSuccess={() => window.location.reload()} />;
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <Sidebar
        currentView='tasks'
        onNavigate={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Mobile Top Header */}
      <div className='sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden'>
        <button
          type='button'
          onClick={() => setIsMobileSidebarOpen(true)}
          className='inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm'
          aria-label='Open Task Manager navigation'
        >
          <span className='material-symbols-outlined text-[20px]'>menu</span>
        </button>
        <div className='min-w-0 text-center'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500'>Task Manager</p>
          <p className='truncate text-sm font-bold text-slate-900'>Task Details</p>
        </div>
        <div className='w-11' />
      </div>

      <main className={`ml-0 min-h-screen ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-56'} transition-all duration-200`}>
        {loading ? (
          <div className='pt-4 pl-4 pr-6 pb-6 md:pl-5 md:pr-8'>
            <TaskDetailLoadingSkeleton />
          </div>
        ) : !task ? (
          <div className='pt-4 pl-4 pr-6 pb-6 md:pl-5 md:pr-8'>
            <div className='mx-auto max-w-5xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700'>
              {error || 'Task not found.'}
            </div>
          </div>
        ) : (
          <div className='pt-4 pl-4 pr-6 pb-6 md:pl-5 md:pr-8'>
            <div className='mx-auto max-w-[1380px] space-y-4'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-center gap-4'>
                  <Link
                    href={backHref}
                    className='h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-2xl transition duration-200 shadow-sm shrink-0'
                    title="Back"
                    aria-label='Back to tasks'
                  >
                    <ArrowLeft size={18} />
                  </Link>
                  <h1 className='text-2xl font-semibold tracking-tight text-slate-800'>{task.task_name}</h1>
                </div>
                <div className='ml-auto flex shrink-0 items-center gap-3'>
                  <p className='text-sm text-slate-500 whitespace-nowrap'>Created {formatDate(task.created_at)}</p>
                  {task.status === 'completed' && reviewAssignees.length > 0 && (
                    <button
                      type='button'
                      onClick={() => {
                        setReviewModalOpen(true);
                        setReviewHoverRatings({});
                      }}
                      className='inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-2 shadow-[0_10px_20px_rgba(251,191,36,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(251,191,36,0.18)]'
                      aria-label={viewer?.canReviewAssignees ? 'Review assignees' : 'Assignee review summary'}
                    >
                      {Array.from({ length: 5 }).map((_, index) => {
                        const filled = index < Math.max(ratedAssigneeCount, 1);
                        return (
                          <Star
                            key={index}
                            size={14}
                            className={filled ? 'fill-amber-400 text-amber-500 drop-shadow-[0_1px_1px_rgba(180,120,0,0.35)]' : 'text-slate-300'}
                          />
                        );
                      })}
                      <span className='ml-1 text-xs font-semibold text-amber-700'>
                        {ratedAssigneeCount}/{reviewAssignees.length}
                      </span>
                    </button>
                  )}
                  {showEditSettings && (
                    <button
                      type='button'
                      disabled={saving}
                      onClick={deleteTaskFromDetail}
                      className='flex h-9 items-center justify-center rounded-lg border border-slate-200 border-b-2 border-b-slate-350/90 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-350 hover:border-b-slate-400 hover:bg-slate-50 hover:text-slate-900 active:translate-y-[1px] active:border-b active:border-b-slate-250/70 disabled:opacity-60'
                    >
                      Delete Task
                    </button>
                  )}
                </div>
              </div>

              <div className='lg:pl-12 space-y-4'>
                <div className='flex items-center gap-1 border-b border-slate-200 -mx-0'>
                  {TASK_SECTION_TABS.map((tab) => {
                    const isActive = activeTaskSection === tab.id;
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type='button'
                        onClick={() => setActiveTaskSection(tab.id)}
                        className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${isActive
                          ? 'border-[#7F40EE] text-[#7F40EE]'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                          }`}
                        aria-pressed={isActive}
                      >
                        <TabIcon size={15} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                    {error}
                  </div>
                )}

                <section ref={listSectionRef} id='task-list' className={activeTaskSection !== 'list' ? 'hidden' : ''}>
                  <div className='space-y-6'>
                    <div className={showEditSettings ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch' : 'space-y-6'}>
                      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6'>
                        <div className='flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between'>
                          <div className='flex flex-wrap items-center gap-2'>
                            {canManageStatus ? (
                              <details className='relative group' data-task-status-dropdown onClick={(e) => e.stopPropagation()}>
                                <summary className={`list-none cursor-pointer flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase transition-all select-none hover:ring-2 [&::-webkit-details-marker]:hidden ${getTaskStatusBadgeStyle(task.status)}`}>
                                  <span>{STATUS_OPTIONS.find(o => o.value === task.status)?.label || task.status.replace('_', ' ')}</span>
                                  <ChevronDown size={12} className='opacity-70' />
                                </summary>
                                <div className='absolute left-0 z-40 mt-1.5 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg text-left'>
                                  {STATUS_OPTIONS.map((option) => (
                                    <button
                                      key={option.value}
                                      type='button'
                                      onClick={(e) => {
                                        updateTaskStatus(option.value);
                                        e.currentTarget.closest('details')?.removeAttribute('open');
                                      }}
                                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase transition hover:bg-slate-50 ${task.status === option.value ? 'text-[#7F40EE] bg-purple-50/50' : 'text-slate-600'
                                        }`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${option.value === 'completed' ? 'bg-emerald-500' : option.value === 'in_progress' ? 'bg-sky-500' : 'bg-slate-400'
                                        }`} />
                                      <span>{option.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </details>
                            ) : (
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase select-none ${getTaskStatusBadgeStyle(task.status)}`}>
                                {STATUS_OPTIONS.find(o => o.value === task.status)?.label || task.status.replace('_', ' ')}
                              </span>
                            )}
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                              task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {task.priority} priority
                            </span>
                            {/* Task Progress Bar Badge removed */}
                            {completionTiming && (
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${completionTiming.tone === 'success'
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
                          <div className='grid gap-6 lg:grid-cols-2 max-w-2xl'>
                            {/* Update Status — 3-segment slide switch */}
                            <div>
                              <h2 className='mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500'>
                                <Activity size={13} className='text-slate-400' />
                                Update Status
                              </h2>
                              <div className='relative flex w-full rounded-xl p-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.10)] bg-slate-100 border border-slate-200'>
                                {/* sliding pill */}
                                <div
                                  className='absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-in-out shadow-[0_2px_8px_rgba(0,0,0,0.18)] pointer-events-none'
                                  style={{
                                    width: `calc(${100 / STATUS_OPTIONS.length}% - 4px)`,
                                    left: `calc(${STATUS_OPTIONS.findIndex(o => o.value === task.status) * (100 / STATUS_OPTIONS.length)}% + 2px)`,
                                    background: task.status === 'completed' ? 'linear-gradient(135deg,#059669,#047857)' : task.status === 'in_progress' ? 'linear-gradient(135deg,#0284c7,#0369a1)' : 'linear-gradient(135deg,#64748b,#475569)',
                                  }}
                                />
                                {STATUS_OPTIONS.map((option) => {
                                  const isActive = task.status === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      type='button'
                                      disabled={saving}
                                      onClick={() => updateTaskStatus(option.value)}
                                      className={`relative z-10 flex-1 rounded-lg py-2 text-xs font-bold tracking-wide transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Task Progress — 3D styled */}
                            <div>
                              <div className='mb-3 flex items-center justify-between'>
                                <h2 className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500'>
                                  <CheckCircle2 size={13} className='text-slate-400' />
                                  Task Progress
                                </h2>
                                <span className='text-sm font-bold text-[#7F40EE]'>{progressDraft}%</span>
                              </div>
                              <div className='relative h-4 w-full rounded-full bg-slate-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]'>
                                <div
                                  className='absolute inset-y-0 left-0 rounded-full transition-all duration-300'
                                  style={{
                                    width: `${progressDraft}%`,
                                    background: 'linear-gradient(90deg,#7F40EE,#a855f7)',
                                    boxShadow: '0 2px 8px rgba(127,64,238,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                                  }}
                                />
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
                                    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) updateTaskProgress(progressDraft);
                                  }}
                                  aria-label='Task progress percentage'
                                  className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                                />
                              </div>
                              <div className='mt-2 flex items-center justify-between text-[11px] text-slate-400'>
                                {TASK_PROGRESS_MARKS.map((mark) => (
                                  <button
                                    key={mark}
                                    type='button'
                                    disabled={saving}
                                    onClick={() => { setProgressDraft(mark); updateTaskProgress(mark); }}
                                    className={`rounded-full px-1.5 py-0.5 transition ${progressDraft === mark ? 'font-bold text-[#7F40EE]' : 'hover:text-slate-600'
                                      }`}
                                  >
                                    {mark}%
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className='space-y-2'>
                          <h2 className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500'>
                            <AlignLeft size={13} className='text-slate-400' />
                            Description
                          </h2>
                          <p className='whitespace-pre-wrap text-slate-800 text-sm leading-relaxed'>{task.description || 'No description provided.'}</p>
                        </div>
                      </section>

                      {showEditSettings && (
                        <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between'>
                          <h3 className='flex items-center gap-1.5 text-sm font-semibold text-[#7F40EE] uppercase tracking-wider'>
                            <Settings size={15} />
                            Edit Task Settings
                          </h3>

                          <div className='space-y-4 flex-1 flex flex-col justify-between'>
                            <div className='space-y-4'>
                              {/* Task Name */}
                              <div className='space-y-1.5'>
                                <label className='flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                                  <FileText size={13} className='text-slate-400' />
                                  Task Name
                                </label>
                                <input
                                  value={editForm.taskName}
                                  onChange={(event) => setEditForm((prev) => ({ ...prev, taskName: event.target.value }))}
                                  className='w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none bg-slate-50 hover:bg-slate-100/50 transition'
                                  placeholder='Task name'
                                />
                              </div>

                              {/* Label */}
                              <div className='space-y-1.5'>
                                <label className='flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                                  <Tag size={13} className='text-slate-400' />
                                  Label
                                </label>
                                <div className='flex flex-col sm:flex-row gap-2'>
                                  <select
                                    value={editForm.label}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, label: event.target.value }))}
                                    className='flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none min-w-0'
                                  >
                                    <option value=''>Select a label</option>
                                    {taskLabels.map((taskLabel) => (
                                      <option key={taskLabel} value={taskLabel}>{taskLabel}</option>
                                    ))}
                                  </select>
                                  <div className='flex gap-1.5 flex-1 min-w-0'>
                                    <input
                                      value={newLabelName}
                                      onChange={(event) => setNewLabelName(event.target.value)}
                                      className='flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none'
                                      placeholder='New label'
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
                                      className='rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-[#7F40EE] hover:text-[#7F40EE] transition disabled:opacity-60 shrink-0'
                                    >
                                      {creatingLabel ? '...' : 'Add'}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <div className='space-y-1.5'>
                                <label className='flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                                  <AlignLeft size={13} className='text-slate-400' />
                                  Description
                                </label>
                                <textarea
                                  value={editForm.description}
                                  onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                                  className='w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none bg-slate-50 hover:bg-slate-100/50 transition'
                                  rows={3}
                                  placeholder='Description'
                                />
                              </div>

                              {/* Priority, Repeat, Status */}
                              <div className='grid gap-4 sm:grid-cols-3'>
                                <div className='space-y-1.5'>
                                  <label className='flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                                    <Flag size={13} className='text-slate-400' />
                                    Priority
                                  </label>
                                  <select
                                    value={editForm.priority}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, priority: event.target.value }))}
                                    className='w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none'
                                  >
                                    {PRIORITY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className='space-y-1.5'>
                                  <label className='flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                                    <Repeat size={13} className='text-slate-400' />
                                    Repeat Frequency
                                  </label>
                                  <select
                                    value={editForm.frequency}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, frequency: event.target.value }))}
                                    className='w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none'
                                  >
                                    <option value=''>Never</option>
                                    <option value='weekly'>Weekly</option>
                                    <option value='monthly'>Monthly</option>
                                    <option value='yearly'>Yearly</option>
                                  </select>
                                </div>

                                <div className='space-y-1.5'>
                                  <label className='flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                                    <Activity size={13} className='text-slate-400' />
                                    Status
                                  </label>
                                  <select
                                    value={editForm.status}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                                    className='w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none'
                                  >
                                    {STATUS_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Due Date & Time */}
                              <div className='grid gap-4 sm:grid-cols-2'>
                                <div className='space-y-1.5'>
                                  <label className='flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                                    <CalendarDays size={13} className='text-slate-400' />
                                    Due Date
                                  </label>
                                  <input
                                    type='date'
                                    value={editForm.dueDate}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                                    className='w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none'
                                  />
                                </div>
                                <div className='space-y-1.5'>
                                  <label className='flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                                    <Clock3 size={13} className='text-slate-400' />
                                    Due Time
                                  </label>
                                  <input
                                    type='time'
                                    value={editForm.dueTime}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, dueTime: event.target.value }))}
                                    disabled={!editForm.dueDate}
                                    className='w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none disabled:bg-slate-50 disabled:text-slate-400'
                                  />
                                </div>
                              </div>
                            </div>

                            <div className='pt-4'>
                              <button
                                type='button'
                                disabled={saving}
                                onClick={handleSaveTask}
                                className='w-full rounded-xl bg-[#7F40EE] py-3 text-sm font-semibold text-white hover:bg-[#6A31D1] shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-60'
                              >
                                {saving ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                  <div className='mt-8 space-y-8'>
                    <div>
                      {canManageSubtasks && (
                        <div className="mb-4">
                          <div className="border border-slate-200 rounded-xl shadow-sm relative bg-white">
                            {/* Header row — adjusted to 140px action column, no Comments */}
                            <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_100px_90px_110px_140px] items-center gap-2 py-2.5 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 border-b border-slate-200 rounded-t-xl">
                              <span>Name</span>
                              <span className="text-center">Assignee</span>
                              <span className="text-center">Repeat</span>
                              <span className="text-center">Due Date</span>
                              <span className="text-center">Priority</span>
                              <span className="text-center">Status</span>
                              <span className="text-center">Action</span>
                            </div>
                            {/* Input rows — aligns with header columns */}
                            {draftSubtasks.map((draft, index) => {
                              const isLast = index === draftSubtasks.length - 1;
                              return (
                                <div
                                  key={draft.id}
                                  className={`grid grid-cols-[minmax(0,1fr)_80px_80px_100px_90px_110px_140px] items-center gap-2 py-2.5 px-3 bg-white ${
                                    isLast ? 'rounded-b-xl' : 'border-b border-slate-100'
                                  }`}
                                >
                                  {/* Name */}
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-4 w-4 shrink-0 rounded-full border-2 border-dashed border-slate-300" />
                                    <input
                                      value={draft.title}
                                      onChange={(event) => updateDraftSubtask(draft.id, { title: event.target.value })}
                                      placeholder="Type subtask name and press Enter..."
                                      className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          addChecklistItem(draft.id);
                                        }
                                      }}
                                      autoFocus={false}
                                    />
                                  </div>
                                  {/* Assignee */}
                                  <div className="flex items-center justify-center">
                                    <details className="relative" data-assignee-picker onClick={(e) => e.stopPropagation()}>
                                      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                                        {draft.assigneeId && subtaskAssignees.find((a) => String(a.id) === String(draft.assigneeId)) ? (
                                          <Avatar
                                            name={subtaskAssignees.find((a) => String(a.id) === String(draft.assigneeId))?.name}
                                            src={subtaskAssignees.find((a) => String(a.id) === String(draft.assigneeId))?.profile_picture_url}
                                            size="w-9 h-9"
                                          />
                                        ) : (
                                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400" title="Unassigned">
                                            <User size={15} />
                                          </div>
                                        )}
                                      </summary>
                                      <div className="absolute left-0 z-20 mt-2 w-56 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            updateDraftSubtask(draft.id, { assigneeId: "" });
                                            e.currentTarget.closest("details")?.removeAttribute("open");
                                          }}
                                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                                        >
                                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-500">-</div>
                                          <span>Unassigned</span>
                                        </button>
                                        {subtaskAssignees.map((opt) => (
                                          <button
                                            key={opt.id}
                                            type="button"
                                            onClick={(e) => {
                                              updateDraftSubtask(draft.id, { assigneeId: opt.id });
                                              e.currentTarget.closest("details")?.removeAttribute("open");
                                            }}
                                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                          >
                                            <Avatar name={opt.name} src={opt.profile_picture_url || opt.avatar} size="w-7 h-7" />
                                            <span className="truncate text-xs font-medium">{opt.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </details>
                                  </div>
                                  {/* Repeat */}
                                  <div className="flex items-center justify-center w-full">
                                    <select
                                      value={draft.frequency}
                                      onChange={(e) => updateDraftSubtask(draft.id, { frequency: e.target.value })}
                                      className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded px-1.5 py-1 w-full text-center"
                                    >
                                      <option value="">Never</option>
                                      <option value="weekly">Weekly</option>
                                      <option value="monthly">Monthly</option>
                                      <option value="yearly">Yearly</option>
                                    </select>
                                  </div>
                                  {/* Due Date */}
                                  <div className="flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const el = newSubtaskDateInputRefs.current[draft.id];
                                        el?.showPicker?.();
                                        el?.click?.();
                                      }}
                                      className="flex items-center gap-1.5 text-xs font-semibold hover:bg-slate-50 px-2 py-1.5 rounded border border-transparent hover:border-slate-200 cursor-pointer transition justify-center"
                                    >
                                      <CalendarDays size={14} className="text-slate-400" />
                                      <span className={draft.dueDate ? "text-slate-700" : "text-slate-400"}>
                                        {draft.dueDate ? new Date(draft.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Set Date"}
                                      </span>
                                    </button>
                                    <input
                                      ref={(el) => { newSubtaskDateInputRefs.current[draft.id] = el; }}
                                      type="date"
                                      value={draft.dueDate}
                                      onChange={(e) => updateDraftSubtask(draft.id, { dueDate: e.target.value })}
                                      className="sr-only"
                                    />
                                  </div>
                                  {/* Priority */}
                                  <div className="flex items-center justify-center">
                                    <details className="relative">
                                      <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-xs font-semibold px-2 py-1.5 rounded border border-transparent hover:border-slate-200 hover:bg-slate-50 transition select-none">
                                        {draft.priority === 'high' ? (
                                          <><Flag size={14} className='fill-red-500 text-red-500' /><span className='text-red-600 font-bold text-[11px]'>Urgent</span></>
                                        ) : draft.priority === 'medium' ? (
                                          <><Flag size={14} className='fill-amber-500 text-amber-500' /><span className='text-amber-600 font-bold text-[11px]'>High</span></>
                                        ) : draft.priority === 'low' ? (
                                          <><Flag size={14} className='fill-blue-500 text-blue-500' /><span className='text-blue-600 font-bold text-[11px]'>Normal</span></>
                                        ) : (
                                          <><Flag size={14} className='text-slate-400 fill-slate-400' /><span className='text-slate-500 text-[11px]'>Low</span></>
                                        )}
                                        <ChevronDown size={10} className='text-slate-400 ml-0.5' />
                                      </summary>
                                      <div className="absolute left-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl text-sm text-slate-700">
                                        <div className='px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Priority</div>
                                        <button
                                          type='button'
                                          onClick={(e) => {
                                            updateDraftSubtask(draft.id, { priority: 'high' });
                                            e.currentTarget.closest("details")?.removeAttribute("open");
                                          }}
                                          className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-red-600 text-xs'
                                        >
                                          <Flag size={14} className='fill-red-500 text-red-500' /><span>Urgent</span>
                                        </button>
                                        <button
                                          type='button'
                                          onClick={(e) => {
                                            updateDraftSubtask(draft.id, { priority: 'medium' });
                                            e.currentTarget.closest("details")?.removeAttribute("open");
                                          }}
                                          className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-amber-600 text-xs'
                                        >
                                          <Flag size={14} className='fill-amber-500 text-amber-500' /><span>High</span>
                                        </button>
                                        <button
                                          type='button'
                                          onClick={(e) => {
                                            updateDraftSubtask(draft.id, { priority: 'low' });
                                            e.currentTarget.closest("details")?.removeAttribute("open");
                                          }}
                                          className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-blue-600 text-xs'
                                        >
                                          <Flag size={14} className='fill-blue-500 text-blue-500' /><span>Normal</span>
                                        </button>
                                        <button
                                          type='button'
                                          onClick={(e) => {
                                            updateDraftSubtask(draft.id, { priority: null });
                                            e.currentTarget.closest("details")?.removeAttribute("open");
                                          }}
                                          className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-500 text-xs'
                                        >
                                          <Flag size={14} className='text-slate-400 fill-slate-400' /><span>Low</span>
                                        </button>
                                        <div className='border-t border-slate-100 my-1' />
                                        <button
                                          type='button'
                                          onClick={(e) => {
                                            updateDraftSubtask(draft.id, { priority: null });
                                            e.currentTarget.closest("details")?.removeAttribute("open");
                                          }}
                                          className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-500 text-xs'
                                        >
                                          <Ban size={14} className='text-slate-400' /><span>Clear</span>
                                        </button>
                                      </div>
                                    </details>
                                  </div>
                                  {/* Status — always TO DO for new subtasks */}
                                  <div className="flex items-center justify-center">
                                    <span className="text-white bg-slate-500 rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase">TO DO</span>
                                  </div>
                                  {/* Action — green tick (add) + red cross (remove) */}
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() => addChecklistItem(draft.id)}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 transition cursor-pointer"
                                      title="Add subtask"
                                      aria-label="Add subtask"
                                    >
                                      <Check size={14} strokeWidth={3} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeDraftSubtask(draft.id)}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 hover:bg-red-500 text-red-400 hover:text-white cursor-pointer transition"
                                      title="Remove subtask row"
                                      aria-label="Remove subtask row"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {/* + Add Subtask button below the card */}
                          <div className="py-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setDraftSubtasks((prev) => [
                                  ...prev,
                                  { id: Date.now(), title: '', assigneeId: '', priority: 'medium', dueDate: '', frequency: '' }
                                ]);
                              }}
                              className="inline-flex items-center gap-1.5 text-[#7F40EE] hover:text-[#6A31D1] font-bold text-xs transition pl-6 cursor-pointer"
                            >
                              <Plus size={14} />
                              <span>Add Subtask</span>
                            </button>
                          </div>
                        </div>
                      )}


                      <div className='space-y-6'>
                        {SUBTASK_STATUS_ORDER.map((sectionStatus) => {
                          const items = groupedSubtasks[sectionStatus] || [];

                          const isCollapsed = !!collapsedSections[sectionStatus];
                          const statusConfig = {
                            in_progress: {
                              label: 'IN PROGRESS',
                              bg: 'bg-sky-600',
                              textColor: 'text-white',
                              icon: <RefreshCw size={11} className='text-white' />
                            },
                            to_do: {
                              label: 'TO DO',
                              bg: 'bg-slate-500',
                              textColor: 'text-white',
                              icon: <List size={11} className='text-white' />
                            },
                            completed: {
                              label: 'COMPLETE',
                              bg: 'bg-emerald-600',
                              textColor: 'text-white',
                              icon: <Check size={11} className='text-white' strokeWidth={3} />
                            }
                          }[sectionStatus] || {
                            label: sectionStatus.toUpperCase(),
                            bg: 'bg-slate-500',
                            textColor: 'text-white',
                            dotColor: 'bg-white',
                            icon: null
                          };

                          return (
                            <div key={sectionStatus} className='space-y-2'>
                              {/* Section Header Row */}
                              <div
                                className='relative flex items-center py-2 cursor-pointer select-none group border-b border-slate-100 transition-colors pl-0'
                                onClick={() => toggleSectionCollapse(sectionStatus)}
                              >
                                <div className='flex items-center gap-2'>
                                  <button
                                    type='button'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSectionCollapse(sectionStatus);
                                    }}
                                    className='absolute -left-6 text-slate-400 hover:text-slate-600 transition-colors p-1 flex items-center justify-center'
                                  >
                                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                  <div className={`flex items-center gap-1.5 rounded px-4 py-2 text-[11px] font-extrabold tracking-wider ${statusConfig.bg} ${statusConfig.textColor} shadow-sm`}>
                                    {statusConfig.icon}
                                    <span>{statusConfig.label}</span>
                                  </div>
                                  <span className='text-sm font-bold text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded-full'>{items.length}</span>
                                </div>
                              </div>

                              {/* Table layout */}
                              {!isCollapsed && (
                                <div className='w-full border-t border-slate-100'>
                                  <div className='w-full'>
                                    {/* Header Row */}
                                    <div className='grid grid-cols-[minmax(0,1fr)_80px_80px_100px_90px_110px_70px_70px] items-center gap-2 py-2.5 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 bg-slate-100 rounded-t-lg'>
                                      <span>Name</span>
                                      <span className='text-center'>Assignee</span>
                                      <span className='text-center'>Repeat</span>
                                      <span className='text-center'>Due Date</span>
                                      <span className='text-center'>Priority</span>
                                      <span className='text-center'>Status</span>
                                      <span className='text-center'>Comments</span>
                                      <span className='text-center'>Action</span>
                                    </div>

                                    {/* Row Items */}
                                    <div className='divide-y divide-slate-100 border-b border-slate-100 bg-white'>
                                      {items.map(({ subtask, index }) => {
                                        const assigned = employeeDirectoryById.get(subtask.assigned_employee_id);
                                        const subtaskComments = subtaskCommentsById.get(subtask.id) || [];
                                        const commentCount = subtaskComments.length;
                                        const status = getSubtaskStatus(subtask, index);
                                        const isSelected = selectedSubtaskId === subtask.id;

                                        const formattedDueDate = subtask.due_date ? (() => {
                                          const date = new Date(subtask.due_date);
                                          const today = new Date();
                                          const tomorrow = new Date();
                                          tomorrow.setDate(today.getDate() + 1);
                                          if (date.toDateString() === today.toDateString()) return 'Today';
                                          if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
                                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        })() : null;

                                        const frequencyLabel = subtask.frequency ? subtask.frequency.charAt(0).toUpperCase() + subtask.frequency.slice(1) : '';

                                        return (
                                          <div
                                            key={subtask.id}
                                            role='button'
                                            tabIndex={0}
                                            onClick={() => setSelectedSubtaskId(subtask.id)}
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                setSelectedSubtaskId(subtask.id);
                                              }
                                            }}
                                            className={`grid grid-cols-[minmax(0,1fr)_80px_80px_100px_90px_110px_70px_70px] items-center gap-2 py-2.5 px-3 transition-colors ${isSelected ? 'bg-slate-50/80' : 'bg-white hover:bg-slate-50/40'
                                              }`}
                                          >
                                            {/* Name Column */}
                                            <div className='flex items-center gap-2.5 min-w-0'>
                                              <button
                                                type='button'
                                                disabled={
                                                  !canToggleSubtask(subtask) ||
                                                  saving ||
                                                  pendingSubtaskIds.includes(subtask.id) ||
                                                  pendingSubtaskTitleIds.includes(subtask.id)
                                                }
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  toggleSubtask(subtask.id, subtask.is_completed);
                                                }}
                                                className='focus:outline-none transition-transform active:scale-95 shrink-0'
                                                aria-label={`Toggle subtask ${subtask.title}`}
                                              >
                                                {subtask.is_completed ? (
                                                  <div className='h-4 w-4 shrink-0 rounded-full bg-emerald-500 shadow-sm' />
                                                ) : status === 'in_progress' ? (
                                                  <div className='flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-white hover:bg-blue-50 transition-colors shadow-sm'>
                                                    <div className='h-1.5 w-1.5 rounded-full bg-blue-500' />
                                                  </div>
                                                ) : (
                                                  <div className='h-4 w-4 shrink-0 rounded-full border-2 border-dashed border-slate-400 bg-white hover:border-blue-500 hover:border-solid transition shadow-sm' />
                                                )}
                                              </button>

                                              <p className='truncate text-sm lg:text-[15px] font-semibold text-slate-800'>
                                                {subtask.title}
                                              </p>
                                            </div>

                                            {/* Assignee Column */}
                                            <div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
                                              {assigned ? (
                                                <Avatar
                                                  name={assigned.name}
                                                  src={assigned.profile_picture_url || assigned.avatar}
                                                  size='w-10 h-10'
                                                  title={assigned.name}
                                                />
                                              ) : (
                                                <div className='flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400' title='Unassigned'>
                                                  <User size={16} />
                                                </div>
                                              )}
                                            </div>

                                            {/* Repeat Column */}
                                            <div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
                                              <div className='relative'>
                                                {canEditSubtaskMetadata(subtask) ? (
                                                  <button
                                                    type='button'
                                                    onClick={() => setTableRepeatDropdownSubtaskId(tableRepeatDropdownSubtaskId === subtask.id ? null : subtask.id)}
                                                    className='inline-flex items-center justify-center gap-1 text-xs font-semibold border border-transparent hover:border-slate-200 hover:bg-slate-50 px-1.5 py-1 rounded transition-all cursor-pointer'
                                                  >
                                                    <span className='text-slate-700'>{frequencyLabel || 'Never'}</span>
                                                    <ChevronDown size={10} className='text-slate-400' />
                                                  </button>
                                                ) : (
                                                  <div className='inline-flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-slate-700 select-none'>
                                                    {frequencyLabel ? (
                                                      <>
                                                        <RefreshCw size={14} className='text-slate-550' />
                                                        <span>{frequencyLabel}</span>
                                                      </>
                                                    ) : (
                                                      <span className='text-slate-400'>Never</span>
                                                    )}
                                                  </div>
                                                )}

                                                {canEditSubtaskMetadata(subtask) && tableRepeatDropdownSubtaskId === subtask.id && (
                                                  <div className='absolute left-1/2 -translate-x-1/2 mt-1.5 z-30 w-32 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-sm text-slate-700'>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        saveSubtaskMeta(subtask, 'frequency', '');
                                                        setTableRepeatDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-655'
                                                    >
                                                      <span>Never</span>
                                                    </button>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        saveSubtaskMeta(subtask, 'frequency', 'weekly');
                                                        setTableRepeatDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-700'
                                                    >
                                                      <span>Weekly</span>
                                                    </button>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        saveSubtaskMeta(subtask, 'frequency', 'monthly');
                                                        setTableRepeatDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-700'
                                                    >
                                                      <span>Monthly</span>
                                                    </button>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        saveSubtaskMeta(subtask, 'frequency', 'yearly');
                                                        setTableRepeatDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-700'
                                                    >
                                                      <span>Yearly</span>
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Due Date Column */}
                                            <div className='text-xs text-slate-705 font-semibold flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
                                              {canEditSubtaskMetadata(subtask) ? (
                                                <div className='flex items-center justify-center'>
                                                  <button
                                                    type='button'
                                                    onClick={(e) => { e.stopPropagation(); subtaskDateRefs.current[subtask.id]?.showPicker?.(); subtaskDateRefs.current[subtask.id]?.click?.(); }}
                                                    className='flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 px-2 py-1.5 rounded border border-transparent hover:border-slate-200 cursor-pointer transition justify-center'
                                                  >
                                                    <CalendarDays size={14} className='text-slate-550' />
                                                    <span>{formattedDueDate ? formattedDueDate : 'Set Date'}</span>
                                                  </button>
                                                  <input
                                                    ref={(el) => { subtaskDateRefs.current[subtask.id] = el; }}
                                                    type='date'
                                                    value={subtask.due_date ? subtask.due_date.slice(0, 10) : ''}
                                                    onChange={(e) => { e.stopPropagation(); saveSubtaskMeta(subtask, 'dueDate', e.target.value); }}
                                                    className='sr-only'
                                                  />
                                                </div>
                                              ) : (
                                                formattedDueDate ? (
                                                  <span className={formattedDueDate === 'Today' ? 'text-amber-600 font-bold text-center' : 'text-center'}>
                                                    {formattedDueDate}
                                                  </span>
                                                ) : (
                                                  <span className='text-slate-400 text-center'>No Date</span>
                                                )
                                              )}
                                            </div>

                                            {/* Priority Column */}
                                            <div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
                                              <div className='relative'>
                                                {canEditSubtaskMetadata(subtask) ? (
                                                  <button
                                                    type='button'
                                                    onClick={() => setTablePriorityDropdownSubtaskId(tablePriorityDropdownSubtaskId === subtask.id ? null : subtask.id)}
                                                    className='inline-flex items-center justify-center gap-1 text-xs font-semibold border border-transparent hover:border-slate-200 hover:bg-slate-50 px-1.5 py-1 rounded transition-all cursor-pointer'
                                                  >
                                                    {subtask.priority === 'high' || subtask.priority === 'urgent' ? (
                                                      <>
                                                        <Flag size={16} className='fill-red-500 text-red-500' />
                                                        <span className='text-red-650 font-bold'>Urgent</span>
                                                      </>
                                                    ) : subtask.priority === 'medium' ? (
                                                      <>
                                                        <Flag size={16} className='fill-amber-500 text-amber-500' />
                                                        <span className='text-amber-600 font-bold'>High</span>
                                                      </>
                                                    ) : subtask.priority === 'low' ? (
                                                      <>
                                                        <Flag size={16} className='fill-blue-500 text-blue-500' />
                                                        <span className='text-blue-600 font-bold'>Normal</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Flag size={16} className='text-slate-400 fill-slate-400' />
                                                        <span className='text-slate-500'>Low</span>
                                                      </>
                                                    )}
                                                    <ChevronDown size={10} className='text-slate-400' />
                                                  </button>
                                                ) : (
                                                  <div className='inline-flex items-center justify-center gap-1 text-xs font-semibold px-1.5 py-1 select-none'>
                                                    {subtask.priority === 'high' || subtask.priority === 'urgent' ? (
                                                      <>
                                                        <Flag size={16} className='fill-red-500 text-red-500' />
                                                        <span className='text-red-650 font-bold'>Urgent</span>
                                                      </>
                                                    ) : subtask.priority === 'medium' ? (
                                                      <>
                                                        <Flag size={16} className='fill-amber-500 text-amber-500' />
                                                        <span className='text-amber-600 font-bold'>High</span>
                                                      </>
                                                    ) : subtask.priority === 'low' ? (
                                                      <>
                                                        <Flag size={16} className='fill-blue-500 text-blue-500' />
                                                        <span className='text-blue-600 font-bold'>Normal</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Flag size={16} className='text-slate-400 fill-slate-400' />
                                                        <span className='text-slate-500'>Low</span>
                                                      </>
                                                    )}
                                                  </div>
                                                )}

                                                {canEditSubtaskMetadata(subtask) && tablePriorityDropdownSubtaskId === subtask.id && (
                                                  <div className='absolute left-0 mt-1.5 z-30 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-sm text-slate-700'>
                                                    <div className='px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Priority</div>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        saveSubtaskMeta(subtask, 'priority', 'high');
                                                        setTablePriorityDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-red-650'
                                                    >
                                                      <Flag size={14} className='fill-red-500 text-red-500' />
                                                      <span>Urgent</span>
                                                    </button>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        saveSubtaskMeta(subtask, 'priority', 'medium');
                                                        setTablePriorityDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-amber-600'
                                                    >
                                                      <Flag size={14} className='fill-amber-500 text-amber-500' />
                                                      <span>High</span>
                                                    </button>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        saveSubtaskMeta(subtask, 'priority', 'low');
                                                        setTablePriorityDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-blue-600'
                                                    >
                                                      <Flag size={14} className='fill-blue-500 text-blue-500' />
                                                      <span>Normal</span>
                                                    </button>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        saveSubtaskMeta(subtask, 'priority', null);
                                                        setTablePriorityDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-550'
                                                    >
                                                      <Flag size={14} className='text-slate-400 fill-slate-400' />
                                                      <span>Low</span>
                                                    </button>
                                                    <div className='border-t border-slate-100 my-1' />
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        saveSubtaskMeta(subtask, 'priority', null);
                                                        setTablePriorityDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-500'
                                                    >
                                                      <Ban size={14} className='text-slate-400' />
                                                      <span>Clear</span>
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Status Column */}
                                            <div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
                                              <div className='relative'>
                                                {canToggleSubtask(subtask) ? (
                                                  <button
                                                    type='button'
                                                    onClick={() => setTableStatusDropdownSubtaskId(tableStatusDropdownSubtaskId === subtask.id ? null : subtask.id)}
                                                    className='inline-flex items-center justify-center gap-1 rounded border border-transparent hover:border-slate-200 hover:bg-slate-50 px-2 py-0.5 text-[9px] font-extrabold tracking-wider transition-all uppercase'
                                                  >
                                                    {status === 'completed' ? (
                                                      <span className='text-white bg-emerald-600 border border-transparent rounded px-1.5 py-0.5 flex items-center gap-1 font-bold'>
                                                        <Check size={8} strokeWidth={4} /> COMPLETE
                                                      </span>
                                                    ) : status === 'in_progress' ? (
                                                      <span className='text-white bg-sky-600 border border-transparent rounded px-1.5 py-0.5 font-bold'>
                                                        IN PROGRESS
                                                      </span>
                                                    ) : (
                                                      <span className='text-white bg-slate-500 border border-transparent rounded px-1.5 py-0.5 font-bold'>
                                                        TO DO
                                                      </span>
                                                    )}
                                                    <ChevronDown size={10} className='text-slate-400' />
                                                  </button>
                                                ) : (
                                                  <div className='inline-flex items-center justify-center gap-1 px-2 py-0.5 text-[9px] font-extrabold tracking-wider uppercase select-none'>
                                                    {status === 'completed' ? (
                                                      <span className='text-white bg-emerald-600 border border-transparent rounded px-1.5 py-0.5 flex items-center gap-1 font-bold'>
                                                        <Check size={8} strokeWidth={4} /> COMPLETE
                                                      </span>
                                                    ) : status === 'in_progress' ? (
                                                      <span className='text-white bg-sky-600 border border-transparent rounded px-1.5 py-0.5 font-bold'>
                                                        IN PROGRESS
                                                      </span>
                                                    ) : (
                                                      <span className='text-white bg-slate-500 border border-transparent rounded px-1.5 py-0.5 font-bold'>
                                                        TO DO
                                                      </span>
                                                    )}
                                                  </div>
                                                )}

                                                {canToggleSubtask(subtask) && tableStatusDropdownSubtaskId === subtask.id && (
                                                  <div className='absolute left-0 mt-1 z-35 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-sm text-slate-700'>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        if (subtask.is_completed) {
                                                          toggleSubtask(subtask.id, true);
                                                        }
                                                        saveSubtaskMeta(subtask, 'status', 'to_do');
                                                        setTableStatusDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-655'
                                                    >
                                                      <span className='w-2 h-2 rounded-full bg-slate-400' />
                                                      <span>TO DO</span>
                                                    </button>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        if (subtask.is_completed) {
                                                          toggleSubtask(subtask.id, true);
                                                        }
                                                        saveSubtaskMeta(subtask, 'status', 'in_progress');
                                                        setTableStatusDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-sky-650'
                                                    >
                                                      <span className='w-2 h-2 rounded-full bg-sky-500' />
                                                      <span>IN PROGRESS</span>
                                                    </button>
                                                    <button
                                                      type='button'
                                                      onClick={() => {
                                                        if (!subtask.is_completed) {
                                                          toggleSubtask(subtask.id, false);
                                                        }
                                                        setTableStatusDropdownSubtaskId(null);
                                                      }}
                                                      className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-emerald-650'
                                                    >
                                                      <span className='w-2 h-2 rounded-full bg-emerald-500' />
                                                      <span>DONE</span>
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Comments Column */}
                                            <div className='flex items-center justify-center gap-1 text-xs text-slate-700 w-full' onClick={(e) => e.stopPropagation()}>
                                              <MessageSquare size={18} className={commentCount > 0 ? 'text-slate-600' : 'text-slate-500 hover:text-[#7F40EE] transition-colors cursor-pointer'} />
                                              {commentCount > 0 && <span className='font-bold text-[11px]'>{commentCount}</span>}
                                            </div>

                                            {/* Action Column: single Eye button to open detail popup */}
                                            <div className='flex justify-center' onClick={(event) => event.stopPropagation()}>
                                              <button
                                                type='button'
                                                onClick={() => setSelectedSubtaskId(subtask.id)}
                                                className='text-slate-400 hover:text-[#7F40EE] transition-colors p-1.5 rounded-lg hover:bg-slate-100'
                                                title='View Details'
                                                aria-label='Open subtask details'
                                              >
                                                <Eye size={16} />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}


                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {selectedSubtask ? (() => {
                        const selectedStatus = getSubtaskStatus(selectedSubtask, 0);
                        const selectedComments = subtaskCommentsById.get(selectedSubtask.id) || [];
                        const selectedInstructions = selectedSubtask.task_subtask_instructions || [];
                        const selectedAssigned = employeeDirectoryById.get(selectedSubtask.assigned_employee_id);
                        const latestReassignment = latestSubtaskReassignmentById.get(selectedSubtask.id);
                        const reassignedBy = latestReassignment?.actor?.name || latestReassignment?.actor?.email || 'Task creator';
                        const fromName = latestReassignment?.fromEmployee?.name || latestReassignment?.fromEmployee?.email || 'Unknown';
                        const toName = latestReassignment?.toEmployee?.name || latestReassignment?.toEmployee?.email || 'Unknown';
                        const commentDraft = subtaskCommentDrafts[selectedSubtask.id] || '';
                        const instructionDraft = subtaskInstructionDrafts[selectedSubtask.id] || '';
                        const isInstructionPending = pendingInstructionIds.includes(selectedSubtask.id);
                        const isCommentPending = pendingSubtaskCommentIds.includes(selectedSubtask.id);

                        return (
                          <div className='fixed inset-0 z-50 flex items-center justify-center'>
                            <button
                              type='button'
                              className='absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]'
                              onClick={() => setSelectedSubtaskId(null)}
                              aria-label='Close subtask details'
                            />
                            <aside className='relative z-10 flex h-[min(94vh,780px)] w-[min(98vw,1280px)] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white text-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.18)]'>
                              {/* Header Top Bar */}
                              <div className='flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white'>
                                <div className='flex items-center gap-3'>
                                  {/* Task dropdown pill */}
                                  <div className='flex items-center gap-1.5 rounded bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition cursor-pointer'>
                                    <span className='w-1.5 h-1.5 rounded-full bg-slate-400' />
                                    <span>Task</span>
                                    <ChevronDown size={12} className='text-slate-500' />
                                  </div>
                                  {/* Subtask ID code */}
                                  <span className='rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-mono border border-slate-200'>
                                    #{selectedSubtask.id.slice(0, 8)}
                                  </span>
                                </div>

                                <div className='flex items-center gap-2'>
                                  {canManageSubtasks && (
                                    <button
                                      type='button'
                                      onClick={() => deleteSubtask(selectedSubtask.id)}
                                      className='inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 border-b-2 border-b-slate-350 bg-white px-4 text-xs font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-350 hover:border-b-slate-400 hover:bg-slate-50 hover:text-slate-950 active:translate-y-[1px] active:border-b active:border-b-slate-250 disabled:opacity-60'
                                    >
                                      Delete
                                    </button>
                                  )}
                                  <button
                                    type='button'
                                    onClick={() => setSelectedSubtaskId(null)}
                                    className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800'
                                    aria-label='Close subtask details'
                                  >
                                    <X size={15} />
                                  </button>
                                </div>
                              </div>

                              {/* Main Scrollable Content */}
                              <div className='grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[60%_40%]'>
                                <div className='min-h-0 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-white hover:[&::-webkit-scrollbar-thumb]:bg-slate-400'>
                                  {/* Title block */}
                                  <div className='space-y-3'>
                                    {editingSubtaskId === selectedSubtask.id ? (
                                      <input
                                        value={editingSubtaskTitle}
                                        onChange={(event) => setEditingSubtaskTitle(event.target.value)}
                                        onBlur={() => saveSubtaskTitle(selectedSubtask)}
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault();
                                            saveSubtaskTitle(selectedSubtask);
                                          }
                                          if (event.key === 'Escape') {
                                            event.preventDefault();
                                            cancelSubtaskTitleEdit();
                                          }
                                        }}
                                        autoFocus
                                        className='min-w-0 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-500'
                                        disabled={pendingSubtaskTitleIds.includes(selectedSubtask.id)}
                                      />
                                    ) : (
                                      <div className='flex items-start justify-between gap-3 group'>
                                        <h3
                                          onClick={() => {
                                            if (canEditSubtaskTitle(selectedSubtask)) {
                                              startSubtaskTitleEdit(selectedSubtask);
                                            }
                                          }}
                                          className={`min-w-0 flex-1 text-2xl font-bold text-slate-900 transition-colors ${canEditSubtaskTitle(selectedSubtask) ? 'cursor-pointer hover:text-blue-600' : 'select-none'
                                            }`}
                                        >
                                          {selectedSubtask.title}
                                        </h3>
                                        {canEditSubtaskTitle(selectedSubtask) && (
                                          <button
                                            type='button'
                                            onClick={() => startSubtaskTitleEdit(selectedSubtask)}
                                            className='opacity-0 group-hover:opacity-100 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 transition'
                                          >
                                            <Pencil size={13} />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* 2-column Metadata field list (ClickUp style) */}
                                  <div className='grid grid-cols-2 gap-x-8 gap-y-4 text-sm border-b border-slate-100 pb-6'>
                                    {/* Row 1: Status & Assignees */}
                                    <div className='flex items-center gap-3'>
                                      <span className='flex items-center gap-1.5 w-24 text-xs font-bold text-black uppercase tracking-wider shrink-0'>
                                        <List size={14} className='text-black' />
                                        <span>Status</span>
                                      </span>
                                      <div className='relative'>
                                        {canToggleSubtask(selectedSubtask) ? (
                                          <button
                                            type='button'
                                            onClick={() => setStatusDropdownSubtaskId(statusDropdownSubtaskId === selectedSubtask.id ? null : selectedSubtask.id)}
                                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all cursor-pointer ${selectedStatus === 'completed'
                                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                              : selectedStatus === 'in_progress'
                                                ? 'bg-sky-600 text-white hover:bg-sky-700'
                                                : 'bg-slate-500 text-white hover:bg-slate-600'
                                              }`}
                                          >
                                            <span className='w-2 h-2 rounded-full bg-white shrink-0' />
                                            <span>{selectedStatus === 'completed' ? 'COMPLETE' : selectedStatus === 'in_progress' ? 'IN PROGRESS' : 'TO DO'}</span>
                                            <ChevronDown size={12} className='text-white' />
                                          </button>
                                        ) : (
                                          <div
                                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase select-none ${selectedStatus === 'completed'
                                              ? 'bg-emerald-600 text-white'
                                              : selectedStatus === 'in_progress'
                                                ? 'bg-sky-600 text-white'
                                                : 'bg-slate-500 text-white'
                                              }`}
                                          >
                                            <span className='w-2 h-2 rounded-full bg-white shrink-0' />
                                            <span>{selectedStatus === 'completed' ? 'COMPLETE' : selectedStatus === 'in_progress' ? 'IN PROGRESS' : 'TO DO'}</span>
                                          </div>
                                        )}

                                        {canToggleSubtask(selectedSubtask) && statusDropdownSubtaskId === selectedSubtask.id && (
                                          <div className='absolute left-0 mt-1.5 z-30 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-sm text-slate-750'>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                if (selectedSubtask.is_completed) {
                                                  toggleSubtask(selectedSubtask.id, true);
                                                }
                                                saveSubtaskMeta(selectedSubtask, 'status', 'to_do');
                                                setStatusDropdownSubtaskId(null);
                                              }}
                                              className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-medium'
                                            >
                                              <span className='w-2 h-2 rounded-full bg-slate-400' />
                                              <span>TO DO</span>
                                            </button>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                if (selectedSubtask.is_completed) {
                                                  toggleSubtask(selectedSubtask.id, true);
                                                }
                                                saveSubtaskMeta(selectedSubtask, 'status', 'in_progress');
                                                setStatusDropdownSubtaskId(null);
                                              }}
                                              className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-medium text-sky-650'
                                            >
                                              <span className='w-2 h-2 rounded-full bg-sky-500' />
                                              <span>IN PROGRESS</span>
                                            </button>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                if (!selectedSubtask.is_completed) {
                                                  toggleSubtask(selectedSubtask.id, false);
                                                }
                                                setStatusDropdownSubtaskId(null);
                                              }}
                                              className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-medium text-emerald-650'
                                            >
                                              <span className='w-2 h-2 rounded-full bg-emerald-500' />
                                              <span>DONE</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className='flex items-center gap-3'>
                                      <span className='flex items-center gap-1.5 w-24 text-xs font-bold text-black uppercase tracking-wider shrink-0'>
                                        <UserPlus size={14} className='text-black' />
                                        <span>Assignee</span>
                                      </span>
                                      {selectedAssigned ? (
                                        <div className='flex items-center gap-2'>
                                          <Avatar name={selectedAssigned.name} src={selectedAssigned.profile_picture_url || selectedAssigned.avatar} size='w-6 h-6' />
                                          <span className='text-xs font-medium text-slate-700'>{selectedAssigned.name}</span>
                                        </div>
                                      ) : (
                                        <span className='text-xs text-slate-400'>Unassigned</span>
                                      )}
                                    </div>

                                    {/* Row 2: Dates & Priority */}
                                    <div className='flex items-center gap-3'>
                                      <span className='flex items-center gap-1.5 w-24 text-xs font-bold text-black uppercase tracking-wider shrink-0'>
                                        <CalendarDays size={14} className='text-black' />
                                        <span>Due Date</span>
                                      </span>
                                      <div className='relative flex items-center'>
                                        {canEditSubtaskMetadata(selectedSubtask) ? (
                                          <>
                                            <button
                                              type='button'
                                              onClick={() => { selectedSubtaskDateRef.current?.showPicker?.(); selectedSubtaskDateRef.current?.click?.(); }}
                                              className='flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition'
                                            >
                                              <CalendarDays size={13} className='text-slate-550' />
                                              <span>{selectedSubtask.due_date ? formatShortDate(selectedSubtask.due_date) : 'Set Date'}</span>
                                            </button>
                                            <input
                                              ref={selectedSubtaskDateRef}
                                              type='date'
                                              value={selectedSubtask.due_date ? selectedSubtask.due_date.slice(0, 10) : ''}
                                              onChange={(e) => saveSubtaskMeta(selectedSubtask, 'dueDate', e.target.value)}
                                              className='sr-only'
                                            />
                                          </>
                                        ) : (
                                          <div className='flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 select-none'>
                                            <CalendarDays size={13} className='text-slate-550' />
                                            <span>{selectedSubtask.due_date ? formatShortDate(selectedSubtask.due_date) : 'No Date'}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Row: Reassign Dropdown - Below Date, Above Priority */}
                                    <div className='flex items-center gap-3'>
                                      <span className='flex items-center gap-1.5 w-24 text-xs font-bold text-black uppercase tracking-wider shrink-0'>
                                        <ArrowRightLeft size={14} className='text-black' />
                                        <span>Reassign</span>
                                      </span>
                                      {canReassignSubtask(selectedSubtask) ? (
                                        <AssigneePicker
                                          value={selectedSubtask.assigned_employee_id || ''}
                                          onChange={(value) => updateSubtaskAssignee(selectedSubtask, value)}
                                          disabled={saving || pendingSubtaskTitleIds.includes(selectedSubtask.id)}
                                          options={subtaskAssignees}
                                          placeholder='Reassign To'
                                        />
                                      ) : (
                                        <span className='text-xs text-slate-400 italic select-none'>Not authorized to reassign</span>
                                      )}
                                    </div>

                                    <div className='flex items-center gap-3'>
                                      <span className='flex items-center gap-1.5 w-24 text-xs font-bold text-black uppercase tracking-wider shrink-0'>
                                        <Flag size={14} className='text-black' />
                                        <span>Priority</span>
                                      </span>
                                      <div className='relative'>
                                        {canEditSubtaskMetadata(selectedSubtask) ? (
                                          <button
                                            type='button'
                                            onClick={() => setPriorityDropdownSubtaskId(priorityDropdownSubtaskId === selectedSubtask.id ? null : selectedSubtask.id)}
                                            className='inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer'
                                          >
                                            {selectedSubtask.priority === 'high' || selectedSubtask.priority === 'urgent' ? (
                                              <>
                                                <Flag size={14} className='fill-red-500 text-red-500' />
                                                <span className='text-red-655 font-bold'>Urgent</span>
                                              </>
                                            ) : selectedSubtask.priority === 'medium' ? (
                                              <>
                                                <Flag size={14} className='fill-amber-500 text-amber-500' />
                                                <span className='text-amber-655 font-bold'>High</span>
                                              </>
                                            ) : selectedSubtask.priority === 'low' ? (
                                              <>
                                                <Flag size={14} className='fill-blue-500 text-blue-500' />
                                                <span className='text-blue-655 font-bold'>Normal</span>
                                              </>
                                            ) : (
                                              <>
                                                <Flag size={14} className='text-slate-400 fill-slate-400' />
                                                <span className='text-slate-500'>Low</span>
                                              </>
                                            )}
                                            <ChevronDown size={12} className='text-slate-500' />
                                          </button>
                                        ) : (
                                          <div className='inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border border-slate-200 bg-slate-50 select-none'>
                                            {selectedSubtask.priority === 'high' || selectedSubtask.priority === 'urgent' ? (
                                              <>
                                                <Flag size={14} className='fill-red-500 text-red-500' />
                                                <span className='text-red-655 font-bold'>Urgent</span>
                                              </>
                                            ) : selectedSubtask.priority === 'medium' ? (
                                              <>
                                                <Flag size={14} className='fill-amber-500 text-amber-500' />
                                                <span className='text-amber-655 font-bold'>High</span>
                                              </>
                                            ) : selectedSubtask.priority === 'low' ? (
                                              <>
                                                <Flag size={14} className='fill-blue-500 text-blue-500' />
                                                <span className='text-blue-655 font-bold'>Normal</span>
                                              </>
                                            ) : (
                                              <>
                                                <Flag size={14} className='text-slate-400 fill-slate-400' />
                                                <span className='text-slate-500'>Low</span>
                                              </>
                                            )}
                                          </div>
                                        )}

                                        {canEditSubtaskMetadata(selectedSubtask) && priorityDropdownSubtaskId === selectedSubtask.id && (
                                          <div className='absolute left-0 mt-1.5 z-30 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-sm text-slate-700'>
                                            <div className='px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Priority</div>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                saveSubtaskMeta(selectedSubtask, 'priority', 'high');
                                                setPriorityDropdownSubtaskId(null);
                                              }}
                                              className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-red-650'
                                            >
                                              <Flag size={14} className='fill-red-500 text-red-500' />
                                              <span>Urgent</span>
                                            </button>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                saveSubtaskMeta(selectedSubtask, 'priority', 'medium');
                                                setPriorityDropdownSubtaskId(null);
                                              }}
                                              className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-amber-600'
                                            >
                                              <Flag size={14} className='fill-amber-500 text-amber-500' />
                                              <span>High</span>
                                            </button>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                saveSubtaskMeta(selectedSubtask, 'priority', 'low');
                                                setPriorityDropdownSubtaskId(null);
                                              }}
                                              className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-blue-600'
                                            >
                                              <Flag size={14} className='fill-blue-500 text-blue-500' />
                                              <span>Normal</span>
                                            </button>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                saveSubtaskMeta(selectedSubtask, 'priority', null);
                                                setPriorityDropdownSubtaskId(null);
                                              }}
                                              className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-550'
                                            >
                                              <Flag size={14} className='text-slate-400 fill-slate-400' />
                                              <span>Low</span>
                                            </button>
                                            <div className='border-t border-slate-100 my-1' />
                                            <button
                                              type='button'
                                              onClick={() => {
                                                saveSubtaskMeta(selectedSubtask, 'priority', null);
                                                setPriorityDropdownSubtaskId(null);
                                              }}
                                              className='w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-500'
                                            >
                                              <Ban size={14} className='text-slate-400' />
                                              <span>Clear</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Row 3: Repeat */}
                                    <div className='flex items-center gap-3'>
                                      <span className='flex items-center gap-1.5 w-24 text-xs font-bold text-black uppercase tracking-wider shrink-0'>
                                        <RefreshCw size={14} className='text-black' />
                                        <span>Repeat</span>
                                      </span>
                                      <div className='flex items-center' onClick={(e) => e.stopPropagation()}>
                                        {canEditSubtaskMetadata(selectedSubtask) ? (
                                          <select
                                            value={selectedSubtask.frequency || ''}
                                            onChange={(e) => saveSubtaskMeta(selectedSubtask, 'frequency', e.target.value)}
                                            className='bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer border border-slate-200 hover:bg-slate-100/50 rounded-lg px-3 py-1.5 transition-all'
                                          >
                                            <option value=''>Never</option>
                                            <option value='weekly'>Weekly</option>
                                            <option value='monthly'>Monthly</option>
                                            <option value='yearly'>Yearly</option>
                                          </select>
                                        ) : (
                                          <span className='text-xs text-slate-750 font-semibold'>
                                            {selectedSubtask.frequency ? selectedSubtask.frequency.charAt(0).toUpperCase() + selectedSubtask.frequency.slice(1) : 'Never'}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Row: Reassignment History Logs */}
                                    {latestReassignment && (
                                      <div className='flex items-center gap-3'>
                                        <span className='flex items-center gap-1.5 w-24 text-xs font-bold text-black uppercase tracking-wider shrink-0'>
                                          <Clock3 size={14} className='text-black' />
                                          <span>History</span>
                                        </span>
                                        <div className='flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200'>
                                          <span>{fromName} ➔ {toName}</span>
                                          <span className='text-[10px] text-slate-400 font-normal'>by {reassignedBy}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Description Box Check */}
                                  {selectedSubtask.description ? (
                                    <div className='space-y-2 border-b border-slate-100 pb-6'>
                                      <label className='block text-xs font-bold text-black uppercase tracking-wider'>Description</label>
                                      <textarea
                                        value={selectedSubtask.description}
                                        readOnly
                                        className='w-full h-24 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none'
                                      />
                                    </div>
                                  ) : null}

                                  {/* Instructions & Documents Section side-by-side */}
                                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2'>
                                    {/* Instructions Section */}
                                    <div className='flex flex-col gap-3'>
                                      <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black'>
                                        <AlignLeft size={14} className='text-slate-600' />
                                        <span>Instructions</span>
                                      </div>
                                      <div className='flex-1 min-h-[140px] flex flex-col justify-start rounded-xl border border-slate-200 border-b-2 border-b-slate-300 bg-white p-4 overflow-y-auto space-y-3.5 shadow-sm'>
                                        {selectedInstructions.length === 0 ? (
                                          <div className='flex-1 flex flex-col items-center justify-center text-center py-4'>
                                            <AlignLeft size={24} className='text-slate-350 mb-2' />
                                            <p className="text-xs font-semibold text-slate-500">No instructions available</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Instructions added for this subtask will appear here.</p>
                                          </div>
                                        ) : (
                                          selectedInstructions.map((instruction, index) => (
                                            <div key={instruction.id} className='flex items-start gap-3 py-2.5 px-2 group relative transition-colors rounded-lg hover:bg-slate-50/50'>
                                              <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200'>
                                                {index + 1}
                                              </div>
                                              <div className='min-w-0 flex-1 space-y-1'>
                                                {editingInstructionId === instruction.id ? (
                                                  <div className='flex flex-col gap-2 mt-0.5'>
                                                    <textarea
                                                      value={editingInstructionText}
                                                      onChange={(e) => setEditingInstructionText(e.target.value)}
                                                      className='w-full text-xs text-slate-700 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-white'
                                                      rows={2}
                                                    />
                                                    <div className='flex items-center gap-2 justify-end'>
                                                      <button
                                                        type='button'
                                                        onClick={() => {
                                                          setEditingInstructionId(null);
                                                          setEditingInstructionText('');
                                                        }}
                                                        className='px-2.5 py-1 text-[11px] font-semibold text-slate-650 hover:text-slate-800 transition'
                                                      >
                                                        Cancel
                                                      </button>
                                                      <button
                                                        type='button'
                                                        onClick={() => updateSubtaskInstruction(selectedSubtask.id, instruction.id)}
                                                        className='px-3 py-1 text-[11px] font-semibold text-white bg-[#7F40EE] rounded-lg hover:bg-[#6f32dd] transition'
                                                      >
                                                        Save
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <p className='text-sm text-slate-700 break-words leading-relaxed'>{instruction.instruction_text}</p>
                                                    <p className='text-[10px] text-slate-400'>
                                                      {getInstructionAuthorLabel(instruction)} · {formatDate(instruction.created_at)}
                                                    </p>
                                                  </>
                                                )}
                                              </div>
                                              {/* Hover Actions (Edit / Delete) */}
                                              {canManageSubtasks && editingInstructionId !== instruction.id && (
                                                <div className='opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm z-10'>
                                                  <button
                                                    type='button'
                                                    onClick={() => {
                                                      setEditingInstructionId(instruction.id);
                                                      setEditingInstructionText(instruction.instruction_text);
                                                    }}
                                                    className='p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition'
                                                    title='Edit Instruction'
                                                    disabled={isInstructionPending}
                                                  >
                                                    <Pencil size={12} />
                                                  </button>
                                                  <button
                                                    type='button'
                                                    onClick={() => removeSubtaskInstruction(selectedSubtask.id, instruction.id)}
                                                    className='p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition'
                                                    title='Delete Instruction'
                                                    disabled={isInstructionPending}
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          ))
                                        )}
                                      </div>

                                      {canComment && (
                                        <div className='flex gap-2 h-10'>
                                          <input
                                            value={instructionDraft}
                                            onChange={(event) =>
                                              setSubtaskInstructionDrafts((prev) => ({ ...prev, [selectedSubtask.id]: event.target.value }))
                                            }
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter') {
                                                event.preventDefault();
                                                addSubtaskInstruction(selectedSubtask.id);
                                              }
                                            }}
                                            placeholder='Add instruction...'
                                            className='flex-1 h-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500/50'
                                          />
                                          <button
                                            type='button'
                                            onClick={() => addSubtaskInstruction(selectedSubtask.id)}
                                            disabled={isInstructionPending || !String(instructionDraft || '').trim()}
                                            className='inline-flex h-full items-center justify-center gap-1.5 rounded-xl border border-purple-650 border-b-2 border-b-purple-800 bg-[#7F40EE] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:border-purple-700 hover:border-b-purple-900 hover:bg-[#6f32dd] active:translate-y-[1px] active:border-b active:border-b-purple-800 disabled:opacity-60 shrink-0'
                                          >
                                            <Plus size={14} />
                                            <span>Add</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Documents Section */}
                                    <div className='flex flex-col gap-3'>
                                      <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black'>
                                        <Paperclip size={14} className='text-slate-600' />
                                        <span>Documents</span>
                                      </div>
                                      <div className='flex-1 min-h-[140px] flex flex-col justify-start rounded-xl border border-slate-200 border-b-2 border-b-slate-300 bg-white p-4 overflow-y-auto space-y-3.5 shadow-sm'>
                                        {(selectedSubtask.task_subtask_attachments || []).length === 0 ? (
                                          <div className='flex-1 flex flex-col items-center justify-center text-center py-4'>
                                            <Paperclip size={24} className='text-slate-350 mb-2' />
                                            <p className='text-xs font-semibold text-slate-500'>No documents uploaded yet.</p>
                                            <p className='text-[11px] text-slate-400 mt-0.5'>Uploaded documents will appear here.</p>
                                          </div>
                                        ) : (
                                          (selectedSubtask.task_subtask_attachments || []).map((attachment, index) => {
                                            const presenter = getAttachmentPresenter(attachment);
                                            return (
                                              <div key={attachment.id} className='flex items-center gap-3 rounded-lg border border-slate-150 bg-slate-50/50 p-3 shadow-sm'>
                                                <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200'>
                                                  {index + 1}
                                                </div>
                                                <div className='min-w-0 flex-1'>
                                                  <p className='truncate text-xs font-semibold text-slate-800' title={attachment.file_name}>
                                                    {attachment.file_name}
                                                  </p>
                                                  <p className='text-[10px] text-slate-400'>
                                                    {formatDate(attachment.uploaded_at || attachment.created_at)}
                                                  </p>
                                                </div>
                                                <a
                                                  href={attachment.file_url}
                                                  target='_blank'
                                                  rel='noreferrer'
                                                  className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 transition hover:bg-slate-50 shadow-sm shrink-0'
                                                >
                                                  <ExternalLink size={12} />
                                                  <span>View</span>
                                                </a>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>

                                      {/* Upload Area trigger - h-10 to match height of add instruction input */}
                                      <label className='flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 border-b-2 border-b-slate-350 bg-white px-4 hover:bg-slate-50 hover:border-slate-350 hover:border-b-slate-400 transition-all shadow-sm active:translate-y-[1px] active:border-b active:border-b-slate-250 shrink-0 text-xs font-bold uppercase tracking-wider text-slate-800 justify-center'>
                                        <Upload size={14} className='text-slate-600' />
                                        <span>
                                          {pendingSubtaskAttachmentIds.includes(selectedSubtask.id) ? 'Uploading...' : 'Upload Document'}
                                        </span>
                                        <input
                                          type='file'
                                          multiple
                                          className='hidden'
                                          onChange={(event) => {
                                            handleSubtaskAttachmentUpload(selectedSubtask, event.target.files);
                                            event.target.value = '';
                                          }}
                                          disabled={pendingSubtaskAttachmentIds.includes(selectedSubtask.id)}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>

                                {/* Comments / Discussion Side (styled light mode) */}
                                <div className='flex min-h-0 flex-col border-t border-slate-200 bg-white lg:border-l lg:border-t-0'>
                                  <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-white'>
                                    <div>
                                      <h4 className='text-sm font-bold text-black'>Comments</h4>
                                      <p className='text-xs text-slate-500'>Chat with the team right here.</p>
                                    </div>
                                    <span className='rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600'>{selectedComments.length}</span>
                                  </div>

                                  <div className='min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-white hover:[&::-webkit-scrollbar-thumb]:bg-slate-400'>
                                    {selectedComments.length === 0 ? (
                                      <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center my-auto'>
                                        <svg className="w-8 h-8 text-slate-350 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                        </svg>
                                        <p className="text-xs font-semibold text-slate-650">No comments yet</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Start the conversation with your team.</p>
                                      </div>
                                    ) : (
                                      selectedComments.map((comment) => (
                                        <div key={comment.id} className='flex items-start gap-3 py-2 px-1 group relative transition-colors rounded-lg hover:bg-slate-50/50'>
                                          <Avatar name={getCommentAuthorLabel(comment, viewer)} src={comment.author_avatar_url} size='w-8 h-8' />
                                          <div className='min-w-0 flex-1 space-y-1'>
                                            {editingCommentId === comment.id ? (
                                              <div className='flex flex-col gap-2 mt-0.5'>
                                                <textarea
                                                  value={editingCommentText}
                                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                                  className='w-full text-xs text-slate-700 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-white'
                                                  rows={2}
                                                />
                                                <div className='flex items-center gap-2 justify-end'>
                                                  <button
                                                    type='button'
                                                    onClick={() => {
                                                      setEditingCommentId(null);
                                                      setEditingCommentText('');
                                                    }}
                                                    className='px-2.5 py-1 text-[11px] font-semibold text-slate-650 hover:text-slate-800 transition'
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    type='button'
                                                    onClick={() => updateComment(comment.id, selectedSubtask.id)}
                                                    className='px-3 py-1 text-[11px] font-semibold text-white bg-[#7F40EE] rounded-lg hover:bg-[#6f32dd] transition'
                                                  >
                                                    Save
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                <p className='text-xs text-slate-650 whitespace-pre-wrap break-words leading-relaxed'>
                                                  {comment.comment_text}
                                                </p>
                                                <p className='text-[10px] text-slate-400'>
                                                  {formatDate(comment.created_at)}
                                                </p>
                                              </>
                                            )}
                                          </div>
                                          {/* Hover Actions (Edit / Delete) */}
                                          {comment.can_delete && editingCommentId !== comment.id && (
                                            <div className='opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm z-10'>
                                              <button
                                                type='button'
                                                onClick={() => {
                                                  setEditingCommentId(comment.id);
                                                  setEditingCommentText(comment.comment_text);
                                                }}
                                                className='p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition'
                                                title='Edit Comment'
                                              >
                                                <Pencil size={12} />
                                              </button>
                                              <button
                                                type='button'
                                                onClick={() => removeComment(comment.id, selectedSubtask.id)}
                                                className='p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition'
                                                title='Delete Comment'
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  {/* Add Comment Input bar */}
                                  {canComment && (
                                    <div className='border-t border-slate-200 p-4 bg-white'>
                                      <div className='flex gap-2'>
                                        <input
                                          value={commentDraft}
                                          onChange={(event) =>
                                            setSubtaskCommentDrafts((prev) => ({ ...prev, [selectedSubtask.id]: event.target.value }))
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                              event.preventDefault();
                                              postComment(selectedSubtask.id);
                                            }
                                          }}
                                          placeholder='Type comment...'
                                          className='flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500/50'
                                        />
                                        <button
                                          type='button'
                                          onClick={() => postComment(selectedSubtask.id)}
                                          disabled={isCommentPending || !String(commentDraft || '').trim()}
                                          className='rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60'
                                        >
                                          Send
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </aside>
                          </div>
                        );
                      })() : null}

                      <div className='mt-14 pt-8 border-t border-slate-100'>
                        <div className='mb-3 flex items-center gap-2'>
                          <Paperclip size={15} className='text-slate-500' />
                          <h2 className='text-sm font-semibold text-slate-600'>Attachments</h2>
                        </div>
                        <div className='flex gap-4 items-start'>
                          {/* Upload zone — left half */}
                          <label className='flex w-1/2 shrink-0 cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-9 text-center transition hover:border-slate-400 hover:bg-slate-100/70'>
                            <span className='mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-700'>
                              <Upload size={24} />
                            </span>
                            <span className='text-base font-semibold text-slate-800'>
                              {uploadingTaskAttachments ? 'Uploading...' : 'Drop documents here or click to browse'}
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
                          {/* Document list — right side */}
                          <div className='flex-1 space-y-2'>
                            {allVisibleAttachments.length === 0 ? (
                              <p className='text-sm text-slate-400 pt-4'>No attachments yet.</p>
                            ) : (
                              allVisibleAttachments.map((attachment) => {
                                const presenter = getAttachmentPresenter(attachment);
                                const uploaderLabel = getAttachmentUploaderLabel(attachment);
                                const AttachmentIcon = presenter.Icon;
                                return (
                                  <div
                                    key={attachment.id}
                                    className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300'
                                  >
                                    <div className='flex items-center gap-3'>
                                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${presenter.iconClassName}`}>
                                        <AttachmentIcon size={18} />
                                      </div>
                                      <div className='min-w-0 flex-1'>
                                        <p className='truncate text-sm font-semibold text-slate-800'>{attachment.file_name || 'Attachment'}</p>
                                        <div className='mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500'>
                                          <span className='inline-flex items-center gap-1'><UserRound size={11} />{uploaderLabel}</span>
                                          <span className='inline-flex items-center gap-1'><Clock3 size={11} />{formatDate(attachment.uploaded_at || attachment.created_at)}</span>
                                          <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500'>{presenter.label}</span>
                                        </div>
                                      </div>
                                      <div className='flex shrink-0 items-center gap-1.5'>
                                        <a href={attachment.file_url} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300'>
                                          <ExternalLink size={12} />Open
                                        </a>
                                        <a href={attachment.file_url} download className='inline-flex items-center gap-1.5 rounded-full bg-[#7F40EE] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#6A31D1]'>
                                          <Download size={12} />Download
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <section id='task-team-tab' className={`grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6${activeTaskSection !== 'team' ? ' hidden' : ''}`}>
                  <section className='rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm h-fit'>
                    <div className='mb-4 flex items-center justify-between gap-3'>
                      <div>
                        <h3 className='text-sm font-semibold uppercase tracking-[0.18em] text-slate-500'>Team</h3>
                        <p className='mt-1 text-sm text-slate-500'>Assigned members for this task.</p>
                      </div>
                      <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                        {(task.task_assignments || []).length} members
                      </span>
                    </div>
                    <div className='space-y-3'>
                      {(task.task_assignments || []).map((assignment) => {
                        const employee = assignment.employee;
                        return (
                          <div key={assignment.employee_id} className='flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5'>
                            <Avatar name={employee?.name} src={employee?.profile_picture_url} size='h-10 w-10' />
                            <div className='min-w-0'>
                              <div className='truncate text-sm font-semibold text-slate-800'>{employee?.name || 'Unknown'}</div>
                              <div className='truncate text-xs text-slate-500'>{employee?.email || '-'}</div>
                            </div>
                          </div>
                        );
                      })}
                      {(!task.task_assignments || task.task_assignments.length === 0) && (
                        <p className='text-sm text-slate-500'>No assignees.</p>
                      )}
                    </div>
                  </section>

                  <section className='w-full rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm'>
                    <div className='mb-4 flex items-center justify-between gap-3'>
                      <div>
                        <h3 className='text-sm font-semibold uppercase tracking-[0.18em] text-slate-500'>Assignment Tree</h3>
                        <p className='mt-1 text-sm text-slate-500'>Task creator, assignees, and subtask chain.</p>
                      </div>
                      <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                        {assignmentTree.length} roots
                      </span>
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
                </section>

                <section ref={boardSectionRef} id='task-board' className={`${activeTaskSection !== 'board' ? ' hidden' : ''} space-y-6`}>
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between px-1'>
                    <div>
                      <h2 className='text-lg font-semibold text-slate-900'>Board</h2>
                      <p className='mt-1 text-sm text-slate-500'>Subtasks grouped by status in a premium board view.</p>
                    </div>
                    <span className='rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                      {task.task_subtasks?.length || 0} subtasks
                    </span>
                  </div>

                  <div className='grid gap-6 xl:grid-cols-3 items-start'>
                    {SUBTASK_STATUS_ORDER.map((sectionStatus) => {
                      const items = groupedSubtasks[sectionStatus] || [];

                      return (
                        <div
                          key={sectionStatus}
                          onDragOver={(e) => {
                            handleSubtaskDragOver(e);
                            if (dragOverColumn !== sectionStatus) setDragOverColumn(sectionStatus);
                          }}
                          onDragLeave={() => {
                            if (dragOverColumn === sectionStatus) setDragOverColumn(null);
                          }}
                          onDrop={(e) => {
                            handleSubtaskDrop(e, sectionStatus);
                            setDragOverColumn(null);
                          }}
                          className={`rounded-[24px] border p-4 transition-all duration-200 ${dragOverColumn === sectionStatus
                              ? 'border-[#7F40EE] bg-purple-50/20 shadow-md ring-2 ring-[#7F40EE]/10'
                              : 'border-slate-200 bg-slate-50/70'
                            }`}
                        >
                          <div className='flex items-center justify-between gap-3 mb-4'>
                            <span className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm ${sectionStatus === 'completed'
                                ? 'bg-emerald-600'
                                : sectionStatus === 'in_progress'
                                  ? 'bg-sky-600'
                                  : 'bg-slate-600'
                              }`}>
                              {getSubtaskStatusLabel(sectionStatus)}
                            </span>
                            <span className='text-sm font-semibold text-slate-500 bg-white border border-slate-200 w-6 h-6 flex items-center justify-center rounded-full shadow-sm'>{items.length}</span>
                          </div>

                          <div className='space-y-3 min-h-[150px]'>
                            {items.length === 0 ? (
                              <div className='rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-slate-400'>
                                No subtasks here.
                              </div>
                            ) : (
                              items.map(({ subtask, index }) => {
                                const assigned = employeeDirectoryById.get(subtask.assigned_employee_id);
                                const status = getSubtaskStatusWithDraft(subtask, index);
                                const commentCount = (subtaskCommentsById.get(subtask.id) || []).length;
                                const isSelected = selectedSubtaskId === subtask.id;

                                return (
                                  <div
                                    key={subtask.id}
                                    draggable
                                    onDragStart={(e) => handleSubtaskDragStart(e, subtask.id)}
                                    onDragEnd={handleSubtaskDragEnd}
                                    onClick={() => setSelectedSubtaskId(subtask.id)}
                                    className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 cursor-grab active:cursor-grabbing bg-white hover:border-slate-350 hover:shadow-md ${isSelected
                                        ? 'border-[#7F40EE] shadow-sm ring-1 ring-[#7F40EE]/20'
                                        : 'border-slate-200 shadow-sm'
                                      } ${isDraggingSubtaskId === subtask.id ? 'opacity-40 border-dashed border-[#7F40EE]' : ''}`}
                                  >
                                    <div className='flex items-start justify-between gap-3'>
                                      <div className='min-w-0 flex-1'>
                                        <p className='text-sm font-semibold text-slate-800 leading-snug break-words'>
                                          {subtask.title}
                                        </p>
                                      </div>
                                      <ArrowRight size={14} className='mt-0.5 shrink-0 text-slate-400' />
                                    </div>

                                    <div className='mt-3.5 flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500'>
                                      {/* Assignee Avatar */}
                                      <div className='flex items-center gap-1.5' title={assigned ? `Assigned to ${assigned.name}` : 'Unassigned'}>
                                        {assigned ? (
                                          <Avatar name={assigned.name} src={assigned.profile_picture_url || assigned.avatar} size='w-6 h-6' />
                                        ) : (
                                          <div className='flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-450'>
                                            <User size={12} />
                                          </div>
                                        )}
                                      </div>

                                      {/* Due Date Indicator */}
                                      <div
                                        className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 border ${subtask.due_date
                                            ? new Date(subtask.due_date).getTime() < Date.now() && !subtask.is_completed
                                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                                              : 'bg-slate-50 text-slate-600 border-slate-100'
                                            : 'bg-slate-50/50 text-slate-400 border-dashed border-slate-200'
                                          }`}
                                      >
                                        <CalendarDays size={12} className='text-slate-400' />
                                        <span>{subtask.due_date ? formatShortDate(subtask.due_date) : 'No date'}</span>
                                      </div>

                                      {/* Priority Flag */}
                                      {(() => {
                                        const priority = subtask.priority || 'medium';
                                        if (priority === 'high' || priority === 'urgent') {
                                          return (
                                            <div className='flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 font-medium' title='Urgent priority'>
                                              <Flag size={12} className='fill-rose-500 text-rose-500' />
                                              <span>Urgent</span>
                                            </div>
                                          );
                                        }
                                        if (priority === 'medium') {
                                          return (
                                            <div className='flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 font-medium' title='High priority'>
                                              <Flag size={12} className='fill-amber-500 text-amber-500' />
                                              <span>High</span>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div className='flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-100' title='Normal priority'>
                                            <Flag size={12} className='text-slate-400' />
                                            <span>Normal</span>
                                          </div>
                                        );
                                      })()}

                                      {/* Comments Count */}
                                      {commentCount > 0 && (
                                        <div className='flex items-center gap-1 text-slate-550 ml-auto' title={`${commentCount} comments`}>
                                          <MessageSquare size={12} className='text-slate-400' />
                                          <span className='font-bold'>{commentCount}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section ref={calendarSectionRef} id='task-calendar' className={`rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm${activeTaskSection !== 'calendar' ? ' hidden' : ''}`}>
                  <CalendarView taskId={task.id} isMini={true} />
                </section>



              </div>

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
        )}
      </main>
    </div>
  );
}

export default function TaskDetailPage({ taskId, mode = 'employee' }) {
  const initialUser = mode === 'admin'
    ? {
      id: 'admin-local',
      name: 'Admin User',
      email: 'admin@taskflow.io',
      role: 'Admin',
      avatar: USERS[0]?.avatar || '',
    }
    : null;

  return (
    <ModuleAccessGate moduleKey="taskManager" moduleLabel="Task Manager">
      <DataProvider initialUser={initialUser} mode={mode}>
        <TaskDetailPageInner taskId={taskId} mode={mode} />
      </DataProvider>
    </ModuleAccessGate>
  );
}


'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EmployeePageHeader from '../ui/EmployeePageHeader';
import { useHrmFeedback } from '../ui/HrmFeedback';
import HrmEmptyState from '../ui/HrmEmptyState';
import { LoadingPanel } from '../ui/Skeleton';
import type {
  TicketAttachment,
  TicketDetail,
  TicketFlowNode,
  TicketListResponse,
  TicketPerson,
  TicketSection,
  TicketSummary,
} from './ticketShared';
import {
  filterTicketCollection,
  formatFileSize,
  formatRelativeTicketTime,
  formatTicketDateTime,
  formatTicketPipelineLabel,
  getTicketInitials,
  getTicketPipelineActiveIndex,
  TICKET_PIPELINE_STEPS,
} from './ticketShared';

const INITIAL_VISIBLE_COUNT = 8;
const FLOW_ACTION_STEPS = ['open', 'in_progress', 'waiting_on_requester', 'resolved', 'closed'] as const;

const CATEGORY_OPTIONS = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'leave', label: 'Leave' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'documents', label: 'Documents' },
  { value: 'profile_update', label: 'Profile Update' },
  { value: 'system_access', label: 'System Access' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const SECTION_CONFIG: Array<{ key: TicketSection; label: string; icon: string }> = [
  { key: 'raise', label: 'Raise Ticket', icon: 'add_circle' },
  { key: 'my', label: 'My Tickets', icon: 'inbox' },
  { key: 'assigned', label: 'Assigned To Me', icon: 'assignment_ind' },
  { key: 'all', label: 'All Tickets', icon: 'dataset' },
  { key: 'closed', label: 'Resolved / Closed', icon: 'inventory_2' },
];

function SlaBadge({ ticket }: { ticket: Pick<TicketSummary, 'isLate' | 'isSlaBreached'> }) {
  if (ticket.isSlaBreached) {
    return <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700">SLA Breached</span>;
  }
  if (ticket.isLate) {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">Late</span>;
  }
  return null;
}

function personLabel(person?: TicketPerson | null) {
  if (!person) return '-';
  return [person.name, person.employeeCode ? `(${person.employeeCode})` : ''].filter(Boolean).join(' ');
}

function AvatarNode({ person, size = 'md' }: { person?: TicketPerson | null; size?: 'sm' | 'md' }) {
  const dimensionClass = size === 'sm' ? 'h-10 w-10 text-[10px]' : 'h-12 w-12 text-xs';

  if (person?.avatarUrl) {
    return (
      <Image
        src={person.avatarUrl}
        alt={person.name || 'User'}
        className={`${dimensionClass} rounded-full border border-white/80 object-cover shadow-sm`}
        width={size === 'sm' ? 40 : 48}
        height={size === 'sm' ? 40 : 48}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`flex ${dimensionClass} items-center justify-center rounded-full border border-white/80 bg-violet-100 font-bold tracking-[0.12em] text-violet-700 shadow-sm`}
    >
      {getTicketInitials(person)}
    </div>
  );
}

function FlowNode({ node }: { node: TicketFlowNode }) {
  return (
    <div className="flex min-w-[108px] flex-col items-center text-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
          node.completed
            ? node.key === 'reopened'
              ? 'border-violet-500 bg-violet-500 text-white shadow-[0_10px_20px_rgba(139,92,246,0.25)]'
              : 'border-violet-300 bg-violet-200 text-violet-900'
            : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant'
        }`}
      >
        {node.completed ? node.stepNo : <span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>}
      </div>
      <p className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${node.completed ? 'text-slate-900' : 'text-on-surface-variant'}`}>
        {node.label}
      </p>
      <p className="mt-1 text-[10px] text-on-surface-variant">{node.createdAt ? formatTicketDateTime(node.createdAt) : '—'}</p>
    </div>
  );
}

function StatusPipeline({ detail }: { detail: TicketDetail }) {
  return (
    <div className="space-y-4">
      {detail.flowCycles.map((cycle) => (
        <div key={cycle.cycleNo} className="overflow-x-auto no-scrollbar">
          <div className="flex min-w-[720px] items-start gap-0 px-1 py-1">
            {cycle.nodes.map((node, index) => (
              <React.Fragment key={`${cycle.cycleNo}-${node.key}-${node.stepNo || index}`}>
                <FlowNode node={node} />
                {index < cycle.nodes.length - 1 ? (
                  <div className="mt-5 h-[2px] min-w-[24px] flex-1 rounded-full bg-surface-container">
                    <div className={`h-full rounded-full transition-all ${node.completed ? 'w-full bg-violet-400' : 'w-0 bg-transparent'}`} />
                  </div>
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactStatusPipeline({ status }: { status?: string | null }) {
  const activeIndex = getTicketPipelineActiveIndex(status);
  const compactSteps = TICKET_PIPELINE_STEPS.filter((step) => step !== 'reopened');

  return (
    <div className="flex items-center gap-1.5">
      {compactSteps.map((step, index) => {
        const isCompleted = index <= activeIndex;
        const connectorActive = index < activeIndex;

        return (
          <React.Fragment key={step}>
            <span className={`h-2.5 w-2.5 rounded-full transition-colors ${isCompleted ? 'bg-violet-400' : 'bg-slate-200'}`} />
            {index < compactSteps.length - 1 ? (
              <span className={`h-[2px] w-4 rounded-full ${connectorActive ? 'bg-violet-300' : 'bg-slate-200'}`} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StatusActionRow({
  detail,
  isSaving,
  onAdvance,
  onReopen,
}: {
  detail: TicketDetail;
  isSaving: boolean;
  onAdvance: (status: string) => void;
  onReopen: () => void;
}) {
  const activeCycle = detail.flowCycles[detail.flowCycles.length - 1];
  const completedKeys = new Set(
    (activeCycle?.nodes || []).filter((node) => node.completed).map((node) => node.key)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5">
        {FLOW_ACTION_STEPS.map((step) => {
          const completed = completedKeys.has(step);
          const isNext = detail.nextAllowedStep === step;
          const disabled = !completed && !isNext;

          return (
            <button
              key={step}
              type="button"
              disabled={disabled || isSaving}
              onClick={() => onAdvance(step)}
              className={`inline-flex items-center gap-2 rounded-2xl border font-semibold transition ${
                completed
                  ? 'border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[13px] text-emerald-700'
                  : isNext
                    ? 'scale-[1.06] border-violet-300 bg-[linear-gradient(180deg,#faf5ff_0%,#efe7ff_100%)] px-4 py-2.5 text-[14px] text-violet-900 shadow-[0_14px_24px_rgba(139,92,246,0.16),0_4px_0_rgba(196,181,253,0.9)] ring-1 ring-white/80 hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-[0_18px_28px_rgba(139,92,246,0.2),0_5px_0_rgba(196,181,253,0.95)]'
                    : 'border-outline-variant/20 bg-surface-container-low px-3.5 py-2 text-[13px] text-on-surface-variant opacity-70'
              } disabled:cursor-not-allowed`}
            >
              <span className={`material-symbols-outlined ${isNext ? 'text-[18px]' : 'text-[16px]'}`}>
                {completed ? 'check_circle' : isNext ? 'circle' : 'radio_button_unchecked'}
              </span>
              {formatTicketPipelineLabel(step)}
            </button>
          );
        })}
      </div>

      {detail.permissions.canReopen ? (
        <button
          type="button"
          disabled={isSaving}
          onClick={onReopen}
          className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          Reopen Ticket
        </button>
      ) : null}
    </div>
  );
}

function TicketCard({
  ticket,
  onSelect,
  showCompactFlow = true,
  appearance = 'default',
}: {
  ticket: TicketSummary;
  onSelect: () => void;
  showCompactFlow?: boolean;
  appearance?: 'default' | 'task_manager';
}) {
  const isTaskManagerAppearance = appearance === 'task_manager';
  const cardMetaBadgeClass = isTaskManagerAppearance
    ? 'rounded-2xl bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700'
    : 'rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-semibold text-on-surface-variant';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full max-w-[1080px] overflow-hidden rounded-3xl px-5 py-4 text-left transition-all ${
        isTaskManagerAppearance
          ? 'bg-white shadow-sm hover:bg-white hover:shadow-md'
          : 'border border-outline-variant/10 bg-surface-container-lowest hover:border-violet-100 hover:bg-surface-container-lowest'
      }`}
    >
      <div className="-mb-5 flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-700 shadow-sm">{ticket.statusLabel}</span>
          <SlaBadge ticket={ticket} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={cardMetaBadgeClass}>
            {ticket.priorityLabel}
          </span>
          <span className={cardMetaBadgeClass}>
            {ticket.categoryLabel || ticket.category.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">{ticket.ticketNo}</p>
        <h3 className="mt-1 line-clamp-2 text-base font-headline font-bold text-on-surface">{ticket.subject}</h3>
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">{ticket.description}</p>

      <div className="mt-3 flex items-center justify-end gap-4">
        {showCompactFlow ? <CompactStatusPipeline status={ticket.status} /> : null}
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs text-on-surface-variant">
        <div className="grid grid-cols-3 gap-3">
          <p>
            <span className="font-semibold text-on-surface">Requester:</span> {personLabel(ticket.requester)}
          </p>
          <p>
            <span className="font-semibold text-on-surface">Raised To:</span> {personLabel(ticket.owner)}
          </p>
          <p>
            <span className="font-semibold text-on-surface">Updated:</span> {formatRelativeTicketTime(ticket.lastActivityAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-15 -mt-3 self-center text-left">
          {ticket.escalatedTo ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">
              Escalated To: {ticket.escalatedTo.name}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700 text-left">
            View Details
            <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
          </span>
        </div>
      </div>
    </button>
  );
}

function AttachmentList({ attachments }: { attachments: TicketAttachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm transition-colors hover:border-violet-100 hover:bg-violet-50"
        >
          <span className="min-w-0 pr-4">
            <span className="block truncate font-semibold text-on-surface">{attachment.fileName}</span>
            <span className="block text-xs text-on-surface-variant">
              {[formatFileSize(attachment.fileSize), formatTicketDateTime(attachment.createdAt)].filter(Boolean).join(' • ')}
            </span>
          </span>
          <span className="material-symbols-outlined text-violet-700">open_in_new</span>
        </a>
      ))}
    </div>
  );
}

function FileDropzone({
  files,
  onFilesChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const inputId = 'ticket-files-input';
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="flex h-full min-h-[300px] flex-col justify-between space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const droppedFiles = Array.from(event.dataTransfer.files || []).filter((file) => file.size > 0);
          if (droppedFiles.length) {
            onFilesChange(droppedFiles);
          }
        }}
        className={`flex min-h-[220px] flex-1 cursor-pointer flex-col items-center justify-center rounded-[1.8rem] border-2 border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? 'border-violet-300 bg-violet-50'
            : 'border-outline-variant/20 bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,1)_100%)] hover:border-violet-200 hover:bg-violet-50/50'
        }`}
      >
        <span className="material-symbols-outlined text-[34px] text-violet-600">upload</span>
        <p className="mt-4 text-xl font-bold text-slate-900">Drag & drop your files here</p>
        <p className="mt-1 text-sm text-slate-500">or click to browse</p>
        <span className="mt-4 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold tracking-[0.08em] text-slate-500">
          PDF • TXT • DOC • DOCX • PNG • JPG
        </span>
      </label>

      <input
        id={inputId}
        type="file"
        multiple
        onChange={(event) => onFilesChange(Array.from(event.target.files || []))}
        className="hidden"
      />

      {files.length ? (
        <div className="space-y-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Selected Files</p>
          <div className="space-y-2">
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-medium text-on-surface">{file.name}</span>
                <span className="shrink-0 text-xs text-on-surface-variant">{formatFileSize(file.size)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InlineFilePicker({
  files,
  onFilesChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const inputId = 'ticket-inline-files-input';

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 px-4 py-3 transition hover:border-violet-300 hover:bg-violet-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Attach files</p>
            <p className="text-xs text-slate-500">Click to choose files for this reply</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-violet-700 shadow-sm">
          Choose Files
        </span>
      </label>

      <input
        id={inputId}
        type="file"
        multiple
        onChange={(event) => onFilesChange(Array.from(event.target.files || []))}
        className="hidden"
      />

      {files.length ? (
        <div className="space-y-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Selected Files</p>
          <div className="space-y-2">
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-medium text-on-surface">{file.name}</span>
                <span className="shrink-0 text-xs text-on-surface-variant">{formatFileSize(file.size)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface TicketsProps {
  variant?: 'employee' | 'admin';
  apiBasePath?: string;
  moduleTitle?: string;
  moduleDescription?: string;
  createLabel?: string;
  appearance?: 'default' | 'task_manager';
}

export default function Tickets({
  variant = 'employee',
  apiBasePath = '/HRM/api/tickets',
  moduleTitle = 'Ticketing',
  moduleDescription = 'Raise issues, follow their progress, and keep replies, attachments, and closure updates in one place.',
  createLabel = 'Create Ticket',
  appearance = 'default',
}: TicketsProps) {
  const { showFeedback } = useHrmFeedback();
  const [activeSection, setActiveSection] = useState<TicketSection>('raise');
  const [data, setData] = useState<TicketListResponse | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    my: INITIAL_VISIBLE_COUNT,
    assigned: INITIAL_VISIBLE_COUNT,
    all: INITIAL_VISIBLE_COUNT,
    closed: INITIAL_VISIBLE_COUNT,
  });
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('attendance');
  const [priority, setPriority] = useState('medium');
  const [raisedForAuthUserId, setRaisedForAuthUserId] = useState('');
  const [selectedCc, setSelectedCc] = useState<string[]>([]);
  const [ccSearch, setCcSearch] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [escalationTargetAuthUserId, setEscalationTargetAuthUserId] = useState('');
  const [escalationNote, setEscalationNote] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const loadTickets = useCallback(async (keepCurrentSelection = true) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(apiBasePath, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load tickets.');

      setData(result);
      setRaisedForAuthUserId((current) => current || result.actor?.authUserId || '');

      if (!keepCurrentSelection) {
        setSelectedTicketId('');
        setDetail(null);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load tickets.');
    } finally {
      setIsLoading(false);
    }
  }, [apiBasePath]);

  const loadTicketDetail = useCallback(async (ticketId: string, allowRetry = true) => {
    if (!ticketId) {
      setDetail(null);
      return;
    }

    try {
      const response = await fetch(`${apiBasePath}/${ticketId}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      const result = await response.json();
      if (response.status === 401 && allowRetry) {
        await loadTicketDetail(ticketId, false);
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Failed to load ticket detail.');
      setDetail(result.ticket || null);
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Ticket Detail Not Loaded', message: requestError instanceof Error ? requestError.message : 'Failed to load ticket detail.' });
    }
  }, [apiBasePath, showFeedback]);

  useEffect(() => {
    loadTickets(false);
  }, [loadTickets]);

  const myTickets = useMemo(
    () => filterTicketCollection(data?.myTickets || [], search, statusFilter, categoryFilter),
    [categoryFilter, data?.myTickets, search, statusFilter]
  );
  const assignedTickets = useMemo(() => {
    return filterTicketCollection(data?.assignedTickets || [], search, statusFilter, categoryFilter);
  }, [categoryFilter, data?.assignedTickets, search, statusFilter]);
  const allTickets = useMemo(
    () => filterTicketCollection(data?.allTickets || [], search, statusFilter, categoryFilter),
    [categoryFilter, data?.allTickets, search, statusFilter]
  );
  const closedTickets = useMemo(
    () => filterTicketCollection(data?.closedTickets || [], search, statusFilter, categoryFilter),
    [categoryFilter, data?.closedTickets, search, statusFilter]
  );

  const activeCollection = useMemo(() => {
    switch (activeSection) {
      case 'my':
        return myTickets;
      case 'assigned':
        return assignedTickets;
      case 'all':
        return allTickets;
      case 'closed':
        return closedTickets;
      default:
        return [];
    }
  }, [activeSection, allTickets, assignedTickets, closedTickets, myTickets]);

  useEffect(() => {
    if (activeSection === 'raise' || activeCollection.length === 0) {
      setSelectedTicketId('');
      setDetail(null);
      return;
    }

    if (selectedTicketId && !activeCollection.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId('');
      setDetail(null);
    }
  }, [activeCollection, activeSection, selectedTicketId]);

  const visiblePeople = data?.people || [];
  const categoryOptions = useMemo(() => {
    const categories = data?.filters?.categories?.length ? data.filters.categories : CATEGORY_OPTIONS.map((option) => option.value);
    return categories.map((value) => ({
      value,
      label: value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
    }));
  }, [data?.filters?.categories]);
  const supportPerson = visiblePeople.find((person) => person.role === 'support') || null;
  const ccOptions = visiblePeople
    .filter((person) => person.authUserId !== supportPerson?.authUserId)
    .filter((person) => {
      const searchValue = ccSearch.trim().toLowerCase();
      if (!searchValue) return true;
      const haystack = [person.name, person.email, person.employeeCode, person.role].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchValue);
    });
  const currentVisibleCount = visibleCounts[activeSection] || INITIAL_VISIBLE_COUNT;
  const visibleTickets = activeCollection.slice(0, currentVisibleCount);
  const isDetailViewOpen = activeSection !== 'raise' && Boolean(selectedTicketId && detail);

  const closeDetailView = () => {
    setSelectedTicketId('');
    setDetail(null);
    setShowCloseConfirm(false);
  };

  const resetCreateForm = () => {
    setSubject('');
    setDescription('');
    setCategory(categoryOptions[0]?.value || 'other');
    setPriority('medium');
    setRaisedForAuthUserId(data?.actor?.authUserId || '');
    setSelectedCc([]);
    setCcSearch('');
    setNewFiles([]);
  };

  useEffect(() => {
    if (!categoryOptions.length) return;
    if (!categoryOptions.some((option) => option.value === category)) {
      setCategory(categoryOptions[0].value);
    }
  }, [category, categoryOptions]);

  const handleCreateTicket = async () => {
    if (!subject.trim()) {
      showFeedback({ type: 'warning', title: 'Subject Required', message: 'Subject is required.' });
      return;
    }
    if (!description.trim()) {
      showFeedback({ type: 'warning', title: 'Description Required', message: 'Description is required.' });
      return;
    }
    if (!supportPerson) {
      showFeedback({ type: 'warning', title: 'Support Missing', message: 'No active support account is available yet.' });
      return;
    }

    try {
      setIsSaving(true);
      const payload = new FormData();
      payload.append(
        'payload',
        JSON.stringify({
          subject,
          description,
          category,
          priority,
          raisedForAuthUserId: raisedForAuthUserId || data?.actor?.authUserId || '',
          ccAuthUserIds: selectedCc,
        })
      );
      newFiles.forEach((file) => payload.append('files', file));

      const response = await fetch(apiBasePath, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create ticket.');

      resetCreateForm();
      await loadTickets(false);
      setActiveSection('my');
      showFeedback({ type: 'success', title: 'Ticket Created', message: 'Ticket created successfully.' });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Ticket Not Created', message: requestError instanceof Error ? requestError.message : 'Failed to create ticket.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!detail?.id) return;
    if (status === 'closed') {
      setShowCloseConfirm(true);
      return;
    }
    try {
      setIsSaving(true);
      const response = await fetch(`${apiBasePath}/${detail.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update ticket.');
      await loadTickets(true);
      await loadTicketDetail(detail.id);
      showFeedback({ type: 'success', title: 'Ticket Updated', message: 'Ticket status updated successfully.' });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Ticket Not Updated', message: requestError instanceof Error ? requestError.message : 'Failed to update ticket.' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmPermanentClose = async () => {
    if (!detail?.id) return;
    try {
      setIsSaving(true);
      const response = await fetch(`${apiBasePath}/${detail.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update ticket.');
      setShowCloseConfirm(false);
      await loadTickets(true);
      await loadTicketDetail(detail.id);
      showFeedback({ type: 'success', title: 'Ticket Closed', message: 'Ticket closed successfully.' });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Ticket Not Updated', message: requestError instanceof Error ? requestError.message : 'Failed to update ticket.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminMetaUpdate = async (field: 'priority' | 'category' | 'ownerAuthUserId', value: string) => {
    if (!detail?.id) return;
    try {
      setIsSaving(true);
      const response = await fetch(`${apiBasePath}/${detail.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update ticket.');
      await loadTickets(true);
      await loadTicketDetail(detail.id);
      showFeedback({ type: 'success', title: 'Ticket Updated', message: 'Ticket details updated successfully.' });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Ticket Not Updated', message: requestError instanceof Error ? requestError.message : 'Failed to update ticket.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!detail?.id) return;
    if (!commentBody.trim() && commentFiles.length === 0) {
      showFeedback({ type: 'warning', title: 'Comment Required', message: 'Add a message or attach at least one file.' });
      return;
    }

    try {
      setIsSaving(true);
      const payload = new FormData();
      payload.append('payload', JSON.stringify({ commentBody }));
      commentFiles.forEach((file) => payload.append('files', file));

      const response = await fetch(`${apiBasePath}/${detail.id}/comments`, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add comment.');

      setCommentBody('');
      setCommentFiles([]);
      await loadTickets(true);
      await loadTicketDetail(detail.id);
      showFeedback({ type: 'success', title: 'Comment Added', message: 'Your ticket comment was added successfully.' });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Comment Not Added', message: requestError instanceof Error ? requestError.message : 'Failed to add comment.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!detail?.id) return;
    try {
      setIsSaving(true);
      const response = await fetch(`${apiBasePath}/${detail.id}/reopen`, { method: 'POST', credentials: 'include' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to reopen ticket.');
      await loadTickets(true);
      await loadTicketDetail(detail.id);
      setActiveSection('assigned');
      showFeedback({ type: 'success', title: 'Ticket Reopened', message: 'Ticket reopened successfully.' });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Ticket Not Reopened', message: requestError instanceof Error ? requestError.message : 'Failed to reopen ticket.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEscalate = async () => {
    if (!detail?.id || !escalationTargetAuthUserId) return;
    try {
      setIsSaving(true);
      const response = await fetch(`${apiBasePath}/${detail.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalateToAuthUserId: escalationTargetAuthUserId,
          escalationNote,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to escalate ticket.');
      setEscalationTargetAuthUserId('');
      setEscalationNote('');
      await loadTickets(true);
      await loadTicketDetail(detail.id);
      showFeedback({ type: 'success', title: 'Ticket Escalated', message: 'Ticket escalation saved successfully.' });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Escalation Failed', message: requestError instanceof Error ? requestError.message : 'Failed to escalate ticket.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportTickets = async () => {
    try {
      setIsExporting(true);
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter) query.set('status', statusFilter);
      if (categoryFilter) query.set('category', categoryFilter);

      const response = await fetch(`${apiBasePath}/export?${query.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to export tickets.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
      const fileName = fileNameMatch?.[1] || `${moduleTitle.toLowerCase().replace(/\s+/g, '-')}-export.csv`;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showFeedback({ type: 'success', title: 'Export Ready', message: 'Ticket export downloaded successfully.' });
    } catch (exportError) {
      showFeedback({
        type: 'error',
        title: 'Export Failed',
        message: exportError instanceof Error ? exportError.message : 'Failed to export tickets.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const pageTitle = variant === 'admin' ? `${moduleTitle} Inbox` : moduleTitle;
  const pageDescription =
    variant === 'admin'
      ? `Review ${moduleTitle.toLowerCase()}, assign responsibility, and keep replies and attachments together in one shared workspace.`
      : moduleDescription;
  const isAdminView = variant === 'admin';
  const sections = isAdminView ? SECTION_CONFIG : SECTION_CONFIG.filter((section) => section.key !== 'all');

  const getTicketCount = (section: TicketSection) => {
    switch (section) {
      case 'my':
        return myTickets.length;
      case 'assigned':
        return assignedTickets.length;
      case 'all':
        return allTickets.length;
      case 'closed':
        return closedTickets.length;
      default:
        return 0;
    }
  };
  const isTaskManagerAppearance = appearance === 'task_manager';
  const filterControlClass = isTaskManagerAppearance
    ? 'border border-slate-200 bg-white text-slate-700 focus:border-slate-300 focus:ring-2 focus:ring-slate-100'
    : 'border border-outline-variant/20 bg-transparent focus:border-violet-200 focus:ring-2 focus:ring-violet-100';
  const detailMetaBadgeClass = isTaskManagerAppearance
    ? 'rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700'
    : 'rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant';
  const raisePanelClass = isTaskManagerAppearance
    ? 'rounded-3xl bg-white p-6 shadow-sm'
    : 'rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 editorial-shadow';
  const raiseSummaryClass = isTaskManagerAppearance
    ? 'h-fit space-y-6 self-start rounded-3xl bg-white p-6 shadow-sm'
    : 'h-fit space-y-6 self-start rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 editorial-shadow';
  const formControlClass = isTaskManagerAppearance
    ? 'w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-slate-200'
    : 'w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200';
  const textAreaControlClass = isTaskManagerAppearance
    ? 'w-full resize-none rounded-2xl bg-slate-50 px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-slate-200'
    : 'w-full resize-none rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200';
  const emptyStateWrapperClass = isTaskManagerAppearance
    ? 'p-0'
    : 'rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 editorial-shadow';
  const loadMoreClass = isTaskManagerAppearance
    ? 'w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50'
    : 'w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container';

  return (
    <div className={`mx-auto ${isAdminView ? 'max-w-7xl space-y-5 px-4 pt-4 pb-6 lg:px-5 lg:pt-5' : 'max-w-7xl space-y-6 pb-8'}`}>
      <EmployeePageHeader icon="support_agent" title={pageTitle} description={pageDescription} compact={isAdminView} />

      <section className="overflow-x-auto">
        <div
          ref={sectionRef}
          className={`relative inline-grid min-w-[560px] items-center overflow-hidden border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(246,244,255,0.96)_100%)] shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur ${isAdminView ? 'rounded-[1rem] p-1' : 'rounded-[1.2rem] p-1.5'}`}
          style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
        >
          <div
            className={`absolute bg-[linear-gradient(135deg,rgba(245,238,255,1)_0%,rgba(224,210,255,1)_55%,rgba(208,186,255,1)_100%)] shadow-[0_10px_22px_rgba(167,139,250,0.24)] ring-1 ring-white/70 transition-transform duration-300 ease-out ${isAdminView ? 'inset-y-1 left-1 rounded-[0.8rem]' : 'inset-y-1.5 left-1.5 rounded-[0.95rem]'}`}
            style={{
              width: isAdminView ? `calc((100% - 0.5rem) / ${sections.length})` : `calc((100% - 0.75rem) / ${sections.length})`,
              transform: `translateX(calc(${sections.findIndex((section) => section.key === activeSection)} * 100%))`,
            }}
          />
          {sections.map((section) => {
            const isActive = activeSection === section.key;
            const count = section.key !== 'raise' ? getTicketCount(section.key) : null;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`relative z-10 inline-flex items-center justify-center gap-2 ${isAdminView ? 'rounded-[0.8rem] px-3 py-2 text-[11px]' : 'rounded-[0.9rem] px-3.5 py-2.5 text-xs'} font-semibold transition-colors ${
                  isActive ? 'text-violet-950' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className={`material-symbols-outlined ${isAdminView ? 'text-[15px]' : 'text-[16px]'}`}>{section.icon}</span>
                <span className="whitespace-nowrap">
                  {section.label}
                  {count !== null && count > 0 && (
                    <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                      {count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <LoadingPanel
          title="Loading tickets"
          message="We are preparing the latest ticket queues, filters, and conversation history."
        />
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">{error}</div>
      ) : data?.setupPending ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          Ticket database setup is pending. Apply the latest ticket migration first.
        </div>
      ) : activeSection === 'raise' ? (
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={raisePanelClass}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Subject</label>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className={formControlClass}
                  placeholder="Short issue title"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Category</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={formControlClass}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Priority</label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className={formControlClass}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Raise For</label>
                <select
                  value={raisedForAuthUserId}
                  onChange={(event) => setRaisedForAuthUserId(event.target.value)}
                  className={formControlClass}
                >
                  {visiblePeople.map((person) => (
                    <option key={person.authUserId} value={person.authUserId}>
                      {person.name} {person.employeeCode ? `(${person.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`${isTaskManagerAppearance ? 'rounded-2xl bg-slate-50' : 'rounded-2xl border border-outline-variant/10 bg-surface-container-low'} px-4 py-4`}>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Initial Handler</label>
                <p className="text-sm font-semibold text-on-surface">{personLabel(supportPerson)}</p>
                <p className="mt-1 text-xs text-on-surface-variant">Every new ticket first goes to Support, then Support can assign it to the final owner.</p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={6}
                  className={textAreaControlClass}
                  placeholder="Explain the issue clearly so the main handler can act quickly."
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">CC</label>
                <div className="space-y-3 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-3">
                  <div>
                    <input
                      value={ccSearch}
                      onChange={(event) => setCcSearch(event.target.value)}
                      className={isTaskManagerAppearance ? 'w-full rounded-2xl bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-slate-200' : 'w-full rounded-2xl border border-outline-variant/20 bg-white/70 px-4 py-2.5 text-sm outline-none transition focus:border-violet-200 focus:ring-2 focus:ring-violet-100'}
                      placeholder="Search CC people"
                    />
                  </div>
                  <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                    {ccOptions.map((person) => {
                      const checked = selectedCc.includes(person.authUserId);
                      return (
                        <label
                          key={person.authUserId}
                          className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition-colors ${
                            checked
                              ? 'border-violet-200 bg-violet-100 text-violet-900'
                              : 'border-transparent bg-white/70 text-on-surface hover:border-violet-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedCc((current) =>
                                checked ? current.filter((value) => value !== person.authUserId) : [...current, person.authUserId]
                              )
                            }
                          />
                          <AvatarNode person={person} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{person.name}</span>
                            <span className="block truncate text-xs text-on-surface-variant">
                              {person.employeeCode || person.role.replace('_', ' ')}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {ccOptions.length === 0 ? (
                    <div className="rounded-2xl bg-white/70 p-3">
                      <HrmEmptyState
                        compact
                        icon="person_search"
                        title="No matching people"
                        message="No people matched your CC search."
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Files</label>
                <FileDropzone files={newFiles} onFilesChange={setNewFiles} />
              </div>
            </div>
          </div>

          <div className={raiseSummaryClass}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">Ticket Summary</p>
              <div className="mt-4 grid gap-3 text-sm text-on-surface">
                <p><span className="font-semibold">Raised by:</span> {personLabel(data?.actor)}</p>
                <p><span className="font-semibold">Raised To:</span> {personLabel(supportPerson)}</p>
                <p><span className="font-semibold">Raise For:</span> {personLabel(visiblePeople.find((person) => person.authUserId === raisedForAuthUserId))}</p>
                <p><span className="font-semibold">CC count:</span> {selectedCc.length}</p>
                <p><span className="font-semibold">Files:</span> {newFiles.length}</p>
              </div>
            </div>

            {selectedCc.length ? (
              <div className="rounded-2xl bg-violet-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">CC Preview</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCc.map((authUserId) => {
                    const person = visiblePeople.find((item) => item.authUserId === authUserId);
                    return (
                      <span key={authUserId} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-900">
                        {person?.name || authUserId}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleCreateTicket}
              disabled={isSaving}
              className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:shadow-md hover:shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Creating Ticket...' : createLabel}
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          {isDetailViewOpen ? (
            <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 editorial-shadow">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeDetailView}
                  className="inline-flex items-center gap-2 rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back to Tickets
                </button>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Detail View</span>
              </div>

              {detail ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">{detail.ticketNo}</p>
                      <h2 className="mt-2 text-2xl font-headline font-bold text-on-surface">{detail.subject}</h2>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{detail.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{detail.statusLabel}</span>
                      <span className={detailMetaBadgeClass}>
                        {detail.priorityLabel}
                      </span>
                      <span className={detailMetaBadgeClass}>
                        {detail.categoryLabel || detail.category.replace(/_/g, ' ')}
                      </span>
                      <SlaBadge ticket={detail} />
                    </div>
                  </div>

                  {(detail.isLate || detail.isSlaBreached) ? (
                    <div className="grid gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Turnaround Status</p>
                        <p className="mt-2 text-sm font-semibold text-amber-900">
                          {detail.isSlaBreached ? 'This ticket has crossed the 72 hour deadline.' : 'This ticket is late and has crossed the 24 hour mark.'}
                        </p>
                      </div>
                      <div className="text-sm text-amber-900">
                        <p><span className="font-semibold">Late At:</span> {detail.lateAt ? formatTicketDateTime(detail.lateAt) : '-'}</p>
                        <p className="mt-2"><span className="font-semibold">Due At:</span> {detail.dueAt ? formatTicketDateTime(detail.dueAt) : '-'}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Ticket Flow</p>
                    <StatusPipeline detail={detail} />
                  </div>

                  {(detail.nextAllowedStep || detail.permissions.canReopen) ? (
                    <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Status Actions</p>
                      <StatusActionRow detail={detail} isSaving={isSaving} onAdvance={handleStatusUpdate} onReopen={handleReopen} />
                    </div>
                  ) : detail.status === 'closed' ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">Final Closure</p>
                      <p className="mt-2 text-sm font-semibold text-rose-800">Ticket has been permanently closed.</p>
                      <p className="mt-1 text-sm text-rose-700">No further reopen action is allowed for this ticket.</p>
                    </div>
                  ) : null}

                  {showCloseConfirm ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/28 px-4 backdrop-blur-[2px]">
                      <div className="w-full max-w-md rounded-[2rem] border border-rose-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                            <span className="material-symbols-outlined text-[24px]">warning</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">Permanent Close</p>
                            <h3 className="mt-2 text-lg font-bold text-slate-950">Close this ticket permanently?</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              This ticket will be permanently closed. After closing, it cannot be reopened again.
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setShowCloseConfirm(false)}
                            className="rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={confirmPermanentClose}
                            disabled={isSaving}
                            className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? 'Closing...' : 'Yes, Close Permanently'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 rounded-3xl bg-surface-container-low p-5 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Requester</p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">{personLabel(detail.requester)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Raised To</p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">{personLabel(detail.owner)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Escalated To</p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">{personLabel(detail.escalatedTo)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Raised For</p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">{personLabel(detail.raisedFor)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Last Activity</p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">{formatTicketDateTime(detail.lastActivityAt)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Due At</p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">{detail.dueAt ? formatTicketDateTime(detail.dueAt) : '-'}</p>
                    </div>
                  </div>

                  {detail.ccPeople.length ? (
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">CC People</p>
                      <div className="flex flex-wrap gap-2">
                        {detail.ccPeople.map((person) => (
                          <span key={person.authUserId} className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface">
                            {person.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(detail.permissions.canEditMeta || detail.permissions.canReassign) ? (
                    <div className="grid gap-4 rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Priority</label>
                        <select
                          value={detail.priority}
                          onChange={(event) => handleAdminMetaUpdate('priority', event.target.value)}
                          className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm"
                        >
                          {PRIORITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Category</label>
                        <select
                          value={detail.category}
                          onChange={(event) => handleAdminMetaUpdate('category', event.target.value)}
                          className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm"
                        >
                          {categoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Raised To</label>
                        <select
                          value={detail.owner?.authUserId || ''}
                          onChange={(event) => handleAdminMetaUpdate('ownerAuthUserId', event.target.value)}
                          className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm"
                        >
                          {visiblePeople.map((person) => (
                            <option key={person.authUserId} value={person.authUserId}>
                              {person.name} {person.employeeCode ? `(${person.employeeCode})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}

                  {detail.permissions.canEscalate ? (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Escalate Ticket</p>
                      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                        <select
                          value={escalationTargetAuthUserId}
                          onChange={(event) => setEscalationTargetAuthUserId(event.target.value)}
                          className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm"
                        >
                          <option value="">Select escalation target</option>
                          {visiblePeople
                            .filter((person) => person.authUserId !== detail.owner?.authUserId)
                            .map((person) => (
                              <option key={person.authUserId} value={person.authUserId}>
                                {person.name} {person.employeeCode ? `(${person.employeeCode})` : ''}
                              </option>
                            ))}
                        </select>
                        <input
                          value={escalationNote}
                          onChange={(event) => setEscalationNote(event.target.value)}
                          className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm"
                          placeholder="Optional escalation note"
                        />
                        <button
                          type="button"
                          onClick={handleEscalate}
                          disabled={!escalationTargetAuthUserId || isSaving}
                          className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Escalate
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {detail.escalations.length ? (
                    <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Escalation History</p>
                      <div className="space-y-3">
                        {detail.escalations.map((entry) => (
                          <div key={entry.id} className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                            <p className="font-semibold">
                              {personLabel(entry.from)} to {personLabel(entry.to)}
                            </p>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              Escalated by {personLabel(entry.escalatedBy)} on {formatTicketDateTime(entry.createdAt)}
                            </p>
                            {entry.note ? <p className="mt-2 text-sm text-on-surface-variant">{entry.note}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Ticket Files</p>
                    {detail.attachments.length ? (
                      <AttachmentList attachments={detail.attachments} />
                    ) : (
                      <div className="rounded-2xl bg-surface-container-low p-3">
                        <HrmEmptyState
                          compact
                          icon="attach_file"
                          title="No ticket files attached"
                          message="No files were attached to the ticket header."
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Conversation</p>
                      <span className="rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-semibold text-on-surface-variant">
                        {detail.comments.length} message(s)
                      </span>
                    </div>

                    {detail.comments.length ? (
                      <div className="space-y-5">
                        {detail.comments.map((comment, index) => (
                          <div key={comment.id} className="grid grid-cols-[56px_minmax(0,1fr)] gap-4">
                            <div className="relative flex flex-col items-center">
                              <AvatarNode person={comment.author} />
                              {index < detail.comments.length - 1 ? <div className="mt-3 h-full min-h-[56px] w-[2px] rounded-full bg-violet-200" /> : null}
                            </div>

                            <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm font-semibold text-on-surface">{personLabel(comment.author)}</p>
                                  <p className="text-xs text-on-surface-variant">{formatTicketDateTime(comment.createdAt)}</p>
                                </div>
                              </div>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface">{comment.body}</p>
                              {comment.attachments.length ? (
                                <div className="mt-4">
                                  <AttachmentList attachments={comment.attachments} />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-surface-container-low p-3">
                        <HrmEmptyState
                          compact
                          icon="forum"
                          title="No comments yet"
                          message="The conversation thread will appear here once someone replies to this ticket."
                        />
                      </div>
                    )}
                  </div>

                    {detail.permissions.canComment ? (
                    <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-4">
                      <div className="flex items-start justify-center pt-1">
                        <AvatarNode person={data?.actor || null} />
                      </div>

                      <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Reply</p>
                        <textarea
                          value={commentBody}
                          onChange={(event) => setCommentBody(event.target.value)}
                          rows={4}
                          className="w-full resize-none rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                          placeholder="Reply to this ticket..."
                        />
                        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="w-full md:max-w-md">
                            <InlineFilePicker files={commentFiles} onFilesChange={setCommentFiles} />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddComment}
                            disabled={isSaving}
                            className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:shadow-md hover:shadow-violet-200 disabled:opacity-60"
                          >
                            {isSaving ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.6fr)_220px_220px_auto] lg:items-center lg:justify-start">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`w-full max-w-[360px] rounded-2xl px-4 py-3 text-sm outline-none transition ${filterControlClass}`}
                  placeholder="Search by ticket number or subject"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={`w-full max-w-[220px] rounded-2xl px-4 py-3 text-sm outline-none transition ${filterControlClass}`}
                >
                  <option value="">All Statuses</option>
                  <option value="unresolved">Unresolved</option>
                  {(data?.filters.statuses || []).map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className={`w-full max-w-[220px] rounded-2xl px-4 py-3 text-sm outline-none transition ${filterControlClass}`}
                >
                  <option value="">All Categories</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {isAdminView && activeSection === 'all' ? (
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStatusFilter(statusFilter === 'unresolved' ? '' : 'unresolved')}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        statusFilter === 'unresolved'
                          ? 'ring-1 ring-violet-500/30 bg-violet-600 text-white shadow-sm hover:bg-violet-700'
                          : isTaskManagerAppearance
                            ? 'bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {statusFilter === 'unresolved' ? 'Showing Unresolved' : 'Unresolved'}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportTickets}
                      disabled={isExporting}
                      className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isTaskManagerAppearance
                          ? 'bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                          : 'bg-violet-600 text-white hover:shadow-md hover:shadow-violet-200'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {isExporting ? 'Exporting...' : 'Export Excel'}
                    </button>
                  </div>
                ) : null}
              </div>

              {visibleTickets.length === 0 ? (
                <div className={emptyStateWrapperClass}>
                  <HrmEmptyState
                    icon={
                      activeSection === 'my'
                        ? 'confirmation_number'
                        : activeSection === 'assigned'
                          ? 'assignment_ind'
                          : activeSection === 'all'
                            ? 'dataset'
                          : 'inventory_2'
                    }
                    title={
                      activeSection === 'my'
                        ? 'No tickets in your queue'
                        : activeSection === 'assigned'
                          ? 'No assigned tickets right now'
                          : activeSection === 'all'
                            ? 'No tickets found in all tickets'
                          : 'No resolved tickets yet'
                    }
                    message="No tickets found in this section."
                  />
                </div>
              ) : (
                visibleTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    showCompactFlow={activeSection === 'closed'}
                    appearance={appearance}
                    onSelect={() => {
                      setSelectedTicketId(ticket.id);
                      loadTicketDetail(ticket.id);
                    }}
                  />
                ))
              )}

              {activeCollection.length > currentVisibleCount ? (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCounts((current) => ({
                      ...current,
                      [activeSection]: (current[activeSection] || INITIAL_VISIBLE_COUNT) + INITIAL_VISIBLE_COUNT,
                    }))
                  }
                  className={loadMoreClass}
                >
                  Load More
                </button>
              ) : null}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

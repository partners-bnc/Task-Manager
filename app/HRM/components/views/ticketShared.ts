export type TicketStatus =
  | 'ticket_raised'
  | 'open'
  | 'in_progress'
  | 'waiting_on_requester'
  | 'resolved'
  | 'closed';

export type TicketSection = 'raise' | 'my' | 'assigned' | 'all' | 'closed';

export type TicketPipelineStep =
  | 'ticket_raised'
  | 'open'
  | 'in_progress'
  | 'waiting_on_requester'
  | 'resolved'
  | 'closed'
  | 'reopened';

export interface TicketPerson {
  authUserId: string;
  employeeId?: string | null;
  role: 'employee' | 'hr_admin' | 'super_admin' | 'support';
  name: string;
  email: string;
  employeeCode?: string;
  avatarUrl?: string;
  label?: string;
}

export interface TicketPermissions {
  canView: boolean;
  canComment: boolean;
  canReopen: boolean;
  canEditMeta: boolean;
  canReassign: boolean;
  canEscalate: boolean;
  canClose: boolean;
  canAdvanceFlow: boolean;
}

export interface TicketSummary {
  id: string;
  ticketNo: string;
  moduleKey: string;
  moduleLabel: string;
  subject: string;
  description: string;
  category: string;
  categoryLabel?: string;
  priority: string;
  priorityLabel: string;
  status: TicketStatus;
  statusLabel: string;
  requester: TicketPerson | null;
  owner: TicketPerson | null;
  escalatedTo?: TicketPerson | null;
  raisedFor: TicketPerson | null;
  ccPeople: TicketPerson[];
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  dueAt?: string | null;
  lateAt?: string | null;
  isLate?: boolean;
  isSlaBreached?: boolean;
  escalatedAt?: string | null;
  permissions: TicketPermissions;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  commentId?: string | null;
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  fileSize?: number | null;
  createdAt: string;
  url: string;
}

export interface TicketComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: TicketPerson | null;
  attachments: TicketAttachment[];
}

export interface TicketHistoryEntry {
  id: string;
  cycleNo: number;
  stepNo: number;
  stepKey: TicketPipelineStep;
  createdAt: string;
  actor: TicketPerson | null;
}

export interface TicketEscalationEntry {
  id: string;
  createdAt: string;
  note: string;
  from: TicketPerson | null;
  to: TicketPerson | null;
  escalatedBy: TicketPerson | null;
}

export interface TicketFlowNode {
  key: TicketPipelineStep;
  label: string;
  stepNo: number | null;
  createdAt: string | null;
  completed: boolean;
}

export interface TicketFlowCycle {
  cycleNo: number;
  nodes: TicketFlowNode[];
}

export interface TicketDetail extends TicketSummary {
  attachments: TicketAttachment[];
  comments: TicketComment[];
  statusHistory: TicketHistoryEntry[];
  escalations: TicketEscalationEntry[];
  flowCycles: TicketFlowCycle[];
  nextAllowedStep: TicketPipelineStep | null;
  currentStepNumber: number;
}

export interface TicketListResponse {
  setupPending?: boolean;
  actor: TicketPerson & { isAdmin: boolean };
  filters: {
    statuses: string[];
    priorities: string[];
    categories: string[];
  };
  people: TicketPerson[];
  myTickets: TicketSummary[];
  assignedTickets: TicketSummary[];
  closedTickets: TicketSummary[];
  adminOpenTickets: TicketSummary[];
  allTickets: TicketSummary[];
}

export const TICKET_PIPELINE_STEPS: TicketPipelineStep[] = [
  'ticket_raised',
  'open',
  'in_progress',
  'waiting_on_requester',
  'resolved',
  'closed',
  'reopened',
];

export function formatTicketDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTicketInitials(person?: TicketPerson | null) {
  const value = String(person?.name || person?.email || '').trim();
  if (!value) return 'TK';

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function formatTicketPipelineLabel(step: TicketPipelineStep) {
  switch (step) {
    case 'ticket_raised':
      return 'Ticket Raised';
    case 'in_progress':
      return 'In Progress';
    case 'waiting_on_requester':
      return 'Waiting on Requester';
    case 'reopened':
      return 'Reopened';
    default:
      return step
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

export function getTicketPipelineActiveIndex(status?: TicketStatus | string | null) {
  const normalized = String(status || '').trim().toLowerCase();

  switch (normalized) {
    case 'ticket_raised':
      return 0;
    case 'open':
      return 1;
    case 'in_progress':
      return 2;
    case 'waiting_on_requester':
      return 3;
    case 'resolved':
      return 4;
    case 'closed':
      return 5;
    default:
      return 0;
  }
}

export function formatRelativeTicketTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return formatTicketDateTime(value);
}

export function filterTicketCollection(
  tickets: TicketSummary[],
  search: string,
  status: string,
  category: string
) {
  const searchValue = search.trim().toLowerCase();
  return tickets.filter((ticket) => {
    const matchesSearch =
      !searchValue ||
      ticket.ticketNo.toLowerCase().includes(searchValue) ||
      ticket.subject.toLowerCase().includes(searchValue);
    const matchesStatus = !status || ticket.status === status;
    const matchesCategory = !category || ticket.category === category;
    return matchesSearch && matchesStatus && matchesCategory;
  });
}

export function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

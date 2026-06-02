import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { findDefaultSupportAccount, listActivePrivilegedAccounts } from '@/utils/privileged-accounts';

export const TICKET_STATUSES = ['ticket_raised', 'open', 'in_progress', 'waiting_on_requester', 'resolved', 'closed'];
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const HRM_TICKET_CATEGORIES = [
  'attendance',
  'leave',
  'payroll',
  'documents',
  'profile_update',
  'system_access',
  'other',
];
export const TASK_MANAGER_TICKET_CATEGORIES = [
  'task_not_completed',
  'deadline_risk',
  'dependency_blocked',
  'task_clarification',
  'reassignment_request',
  'access_issue',
  'bug_report',
  'work_update',
  'other',
];
export const TICKET_CATEGORIES = Array.from(new Set([...HRM_TICKET_CATEGORIES, ...TASK_MANAGER_TICKET_CATEGORIES]));
export const TICKET_FLOW_STEPS = ['ticket_raised', 'open', 'in_progress', 'waiting_on_requester', 'resolved', 'closed'];
export const TICKET_HISTORY_STEPS = [...TICKET_FLOW_STEPS, 'reopened'];
export const HRM_TICKET_FILES_BUCKET = 'hrm-ticket-files';
export const HRM_TICKET_FILE_SIZE_LIMIT = 10 * 1024 * 1024;
export const TICKETS_TABLE = 'tickets';
export const TICKET_PARTICIPANTS_TABLE = 'ticket_participants';
export const TICKET_COMMENTS_TABLE = 'ticket_comments';
export const TICKET_ATTACHMENTS_TABLE = 'ticket_attachments';
export const TICKET_STATUS_HISTORY_TABLE = 'ticket_status_history';
export const TICKET_ESCALATIONS_TABLE = 'ticket_escalations';
export const HRM_TICKET_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function normalizeTicketStatus(status) {
  return String(status || '').trim().toLowerCase();
}

export function normalizeTicketModuleKey(moduleKey) {
  return String(moduleKey || 'hrm').trim().toLowerCase() === 'task_manager' ? 'task_manager' : 'hrm';
}

export function getTicketCategories(moduleKey = null) {
  if (!moduleKey || moduleKey === 'all') {
    return TICKET_CATEGORIES;
  }

  return normalizeTicketModuleKey(moduleKey) === 'task_manager'
    ? TASK_MANAGER_TICKET_CATEGORIES
    : HRM_TICKET_CATEGORIES;
}

export function formatTicketCategoryLabel(category) {
  const normalized = String(category || '').trim().toLowerCase();
  if (!normalized) return 'Other';
  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatTicketModuleLabel(moduleKey) {
  return normalizeTicketModuleKey(moduleKey) === 'task_manager' ? 'Task Manager' : 'HRM';
}

export function isTicketClosedStatus(status) {
  return ['resolved', 'closed'].includes(normalizeTicketStatus(status));
}

export function buildTicketSlaFields(createdAt = new Date().toISOString()) {
  const createdTime = new Date(createdAt);
  const safeCreatedAt = Number.isNaN(createdTime.getTime()) ? new Date() : createdTime;
  return {
    late_at: new Date(safeCreatedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    due_at: new Date(safeCreatedAt.getTime() + 72 * 60 * 60 * 1000).toISOString(),
  };
}

export function deriveTicketSlaState(ticket, now = new Date()) {
  const lateAt = ticket?.late_at ? new Date(ticket.late_at) : null;
  const dueAt = ticket?.due_at ? new Date(ticket.due_at) : null;
  const isClosed = normalizeTicketStatus(ticket?.status) === 'closed';

  const fallbackLate = ticket?.created_at ? new Date(new Date(ticket.created_at).getTime() + 24 * 60 * 60 * 1000) : null;
  const fallbackDue = ticket?.created_at ? new Date(new Date(ticket.created_at).getTime() + 72 * 60 * 60 * 1000) : null;
  const resolvedLateAt = lateAt && !Number.isNaN(lateAt.getTime()) ? lateAt : fallbackLate;
  const resolvedDueAt = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : fallbackDue;

  const nowTime = now instanceof Date && !Number.isNaN(now.getTime()) ? now.getTime() : Date.now();
  const isLate = !isClosed && !!resolvedLateAt && resolvedLateAt.getTime() <= nowTime;
  const isSlaBreached = !isClosed && !!resolvedDueAt && resolvedDueAt.getTime() <= nowTime;

  return {
    lateAt: resolvedLateAt ? resolvedLateAt.toISOString() : null,
    dueAt: resolvedDueAt ? resolvedDueAt.toISOString() : null,
    isLate,
    isSlaBreached,
  };
}

export function withDerivedTicketSla(ticket) {
  if (!ticket) return ticket;
  const sla = deriveTicketSlaState(ticket);
  return {
    ...ticket,
    late_at: ticket.late_at || sla.lateAt,
    due_at: ticket.due_at || sla.dueAt,
    is_late: typeof ticket.is_late === 'boolean' ? ticket.is_late || sla.isLate : sla.isLate,
    is_sla_breached: typeof ticket.is_sla_breached === 'boolean' ? ticket.is_sla_breached || sla.isSlaBreached : sla.isSlaBreached,
  };
}

export function formatTicketStatusLabel(status) {
  const normalized = normalizeTicketStatus(status);
  switch (normalized) {
    case 'ticket_raised':
      return 'Ticket Raised';
    case 'in_progress':
      return 'In Progress';
    case 'waiting_on_requester':
      return 'Waiting on Requester';
    default:
      return normalized
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Ticket Raised';
  }
}

export function formatTicketPriorityLabel(priority) {
  const normalized = String(priority || '').trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatTicketStepLabel(step) {
  return formatTicketStatusLabel(step === 'reopened' ? 'reopened' : step);
}

export function getNextWorkflowStep(status) {
  switch (normalizeTicketStatus(status)) {
    case 'ticket_raised':
      return 'open';
    case 'open':
      return 'in_progress';
    case 'in_progress':
      return 'waiting_on_requester';
    case 'waiting_on_requester':
      return 'resolved';
    case 'resolved':
      return 'closed';
    default:
      return null;
  }
}

export function sanitizeStorageFileName(fileName = '') {
  return String(fileName)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120) || 'file';
}

export function isMissingTicketSchemaError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    (
      message.includes('hrm_ticket') ||
      message.includes('hrm_tickets') ||
      message.includes('ticket_escalation') ||
      message.includes('ticket_participants') ||
      message.includes('ticket_comments') ||
      message.includes('tickets')
    ) &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

export function isBucketNotFoundError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket') && message.includes('not found');
}

export async function ensureTicketFilesBucketAccessible() {
  const { error } = await adminClient.storage.from(HRM_TICKET_FILES_BUCKET).list('', { limit: 1 });
  if (error) {
    if (isBucketNotFoundError(error)) {
      throw new Error('Ticket files bucket is missing. Apply the ticket migration first.');
    }
    throw new Error(error.message || 'Ticket files bucket is not accessible.');
  }
}

export function validateTicketUpload(file) {
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error('A valid file is required.');
  }

  if (file.size > HRM_TICKET_FILE_SIZE_LIMIT) {
    throw new Error(`${file.name} exceeds the 10 MB file size limit.`);
  }

  if (file.type && !HRM_TICKET_ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`${file.name} is not a supported file type.`);
  }
}

export function groupByKey(rows = [], keyName) {
  return rows.reduce((map, row) => {
    const key = row?.[keyName];
    if (!key) return map;
    if (!map[key]) map[key] = [];
    map[key].push(row);
    return map;
  }, {});
}

export async function requireTicketActor() {
  const supabase = await createClient();
  const [
    {
      data: { user },
      error: userError,
    },
    {
      data: { session },
      error: sessionError,
    },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  const resolvedUser = user || session?.user || null;

  if ((!resolvedUser && userError) || (!resolvedUser && sessionError) || !resolvedUser) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, resolvedUser);
  if (!authContext?.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const actor = buildTicketActor(authContext);
  if (!actor) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { actor, authContext };
}

export function buildTicketActor(authContext) {
  if (!authContext?.userId) return null;

  if (authContext.accountType === 'super_admin') {
    return {
      authUserId: authContext.userId,
      employeeId: null,
      role: 'super_admin',
      name: authContext.superAdmin?.name || authContext.user?.name || authContext.user?.email || 'Super Admin',
      email: authContext.superAdmin?.email || authContext.user?.email || '',
      isAdmin: true,
    };
  }

  if (authContext.accountType === 'hr_admin') {
    return {
      authUserId: authContext.userId,
      employeeId: null,
      role: 'hr_admin',
      name: authContext.hrAdmin?.name || authContext.user?.name || authContext.user?.email || 'HR Admin',
      email: authContext.hrAdmin?.email || authContext.user?.email || '',
      isAdmin: true,
    };
  }

  if (authContext.accountType === 'support') {
    return {
      authUserId: authContext.userId,
      employeeId: null,
      role: 'support',
      name: authContext.support?.name || authContext.user?.name || authContext.user?.email || 'Support',
      email: authContext.support?.email || authContext.user?.email || '',
      isAdmin: true,
    };
  }

  if (authContext.accountType === 'employee' && authContext.employee?.id) {
    return {
      authUserId: authContext.userId,
      employeeId: authContext.employee.id,
      role: 'employee',
      name: authContext.employee.name || authContext.user?.name || authContext.user?.email || 'Employee',
      email: authContext.employee.email || authContext.user?.email || '',
      employeeCode: authContext.employee.employee_id || '',
      isAdmin: false,
    };
  }

  return null;
}

export async function listTicketPeople() {
  const [privilegedAccounts, employeesResult] = await Promise.all([
    listActivePrivilegedAccounts(),
    adminClient
      .from('hrm_employees')
      .select('id, auth_user_id, employee_id, name, email, role, profile_picture_url')
      .order('name', { ascending: true }),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message || 'Failed to load employees');

  const employees = employeesResult.data || [];
  const adminAuthIds = new Set(privilegedAccounts.map((row) => row.auth_user_id).filter(Boolean));

  const people = [
    ...privilegedAccounts
      .filter((row) => row.auth_user_id)
      .map((row) => ({
        authUserId: row.auth_user_id,
        employeeId: null,
        role: row.role,
        name:
          row.name ||
          (row.role === 'support'
            ? 'Support'
            : row.role === 'hr_admin'
              ? 'HR Admin'
              : 'Super Admin'),
        email: row.email || '',
        employeeCode: '',
        avatarUrl: row.profile_picture_url || '',
        label: row.name || row.email || row.role,
      })),
    ...employees
      .filter((row) => row.auth_user_id && !adminAuthIds.has(row.auth_user_id))
      .map((row) => ({
        authUserId: row.auth_user_id,
        employeeId: row.id,
        role: 'employee',
        name: row.name || row.email || 'Employee',
        email: row.email || '',
        employeeCode: row.employee_id || '',
        avatarUrl: row.profile_picture_url || '',
        label: row.name || row.email || row.employee_id || 'Employee',
      })),
  ];

  const byAuthUserId = new Map(people.map((person) => [person.authUserId, person]));
  return { people, byAuthUserId };
}

export function ensureActorInTicketDirectory(directory, actor) {
  if (!directory?.byAuthUserId || !actor?.authUserId) return directory;
  if (directory.byAuthUserId.has(actor.authUserId)) return directory;

  const actorPerson = {
    authUserId: actor.authUserId,
    employeeId: actor.employeeId || null,
    role: actor.role,
    name: actor.name || actor.email || 'User',
    email: actor.email || '',
    employeeCode: actor.employeeCode || '',
    avatarUrl: '',
    label: actor.name || actor.email || 'User',
  };

  return {
    people: [actorPerson, ...directory.people],
    byAuthUserId: new Map([[actor.authUserId, actorPerson], ...directory.byAuthUserId.entries()]),
  };
}

export function resolveTicketPerson(byAuthUserId, authUserId) {
  if (!authUserId) return null;
  return byAuthUserId.get(authUserId) || null;
}

export function getTicketActiveHandlerAuthUserId(ticket) {
  return ticket?.current_escalated_auth_user_id || ticket?.owner_auth_user_id || null;
}

export function canActorEscalateTicket(ticket, actor) {
  if (!ticket || !actor?.authUserId) return false;
  const activeHandlerAuthUserId = getTicketActiveHandlerAuthUserId(ticket);
  return Boolean(activeHandlerAuthUserId && activeHandlerAuthUserId === actor.authUserId);
}

export function canActorViewTicket(ticket, actor, participants = []) {
  if (!ticket || !actor?.authUserId) return false;
  if (actor.isAdmin) return true;
  if (ticket.requester_auth_user_id === actor.authUserId) return true;
  if (ticket.owner_auth_user_id === actor.authUserId) return true;
  if (ticket.current_escalated_auth_user_id === actor.authUserId) return true;
  if (ticket.raised_for_auth_user_id === actor.authUserId) return true;
  return participants.some((participant) => participant.participant_auth_user_id === actor.authUserId);
}

export function canActorCommentOnTicket(ticket, actor, participants = []) {
  return canActorViewTicket(ticket, actor, participants);
}

export function canActorReopenTicket(ticket, actor) {
  if (!ticket || !actor?.authUserId) return false;
  if (normalizeTicketStatus(ticket.status) !== 'resolved') return false;
  return ticket.requester_auth_user_id === actor.authUserId;
}

export function canActorCloseTicket(ticket, actor) {
  if (!ticket || !actor?.authUserId) return false;
  return (
    normalizeTicketStatus(ticket.status) === 'resolved' &&
    (ticket.requester_auth_user_id === actor.authUserId || Boolean(actor.isAdmin))
  );
}

export function canActorAdvanceTicket(ticket, actor) {
  if (!ticket || !actor?.authUserId) return false;
  const activeHandlerAuthUserId = getTicketActiveHandlerAuthUserId(ticket);
  return Boolean(actor.isAdmin || activeHandlerAuthUserId === actor.authUserId);
}

export function canActorUpdateTicket(ticket, actor, nextStatus = '') {
  const normalizedNextStatus = normalizeTicketStatus(nextStatus);
  if (normalizedNextStatus === 'closed') {
    return canActorCloseTicket(ticket, actor);
  }
  return canActorAdvanceTicket(ticket, actor);
}

export function getTicketCurrentStepNumber(historyRows = []) {
  return historyRows.reduce((max, row) => Math.max(max, Number(row?.step_no || 0)), 0);
}

export function getCurrentCycleNumber(historyRows = []) {
  return historyRows.reduce((max, row) => Math.max(max, Number(row?.cycle_no || 0)), 1);
}

export function getTicketNextAllowedStep(ticket, actor) {
  if (canActorCloseTicket(ticket, actor)) return 'closed';
  if (!canActorAdvanceTicket(ticket, actor)) return null;
  if (normalizeTicketStatus(ticket?.status) === 'resolved') return null;
  return getNextWorkflowStep(ticket?.status);
}

export function getTicketAvailableActions(ticket, actor, participants = []) {
  const canView = canActorViewTicket(ticket, actor, participants);
  const canComment = canActorCommentOnTicket(ticket, actor, participants);
  const nextAllowedStep = getTicketNextAllowedStep(ticket, actor);

  return {
    canView,
    canComment,
    canReopen: canActorReopenTicket(ticket, actor),
    canEditMeta: Boolean(actor?.isAdmin),
    canReassign: Boolean(actor?.isAdmin),
    canEscalate: canActorEscalateTicket(ticket, actor),
    canClose: canActorCloseTicket(ticket, actor),
    canAdvanceFlow: Boolean(nextAllowedStep),
  };
}

export function mapTicketSummary(ticket, participants, byAuthUserId, actor) {
  const enrichedTicket = withDerivedTicketSla(ticket);
  const requester = resolveTicketPerson(byAuthUserId, ticket.requester_auth_user_id);
  const owner = resolveTicketPerson(byAuthUserId, ticket.owner_auth_user_id);
  const raisedFor = resolveTicketPerson(byAuthUserId, ticket.raised_for_auth_user_id);
  const escalatedTo = resolveTicketPerson(byAuthUserId, ticket.current_escalated_auth_user_id);
  const ccPeople = participants
    .filter((participant) => participant.participant_type === 'cc')
    .map((participant) => resolveTicketPerson(byAuthUserId, participant.participant_auth_user_id))
    .filter(Boolean);

  return {
    id: ticket.id,
    ticketNo: ticket.ticket_no,
    moduleKey: normalizeTicketModuleKey(ticket.source_module),
    moduleLabel: formatTicketModuleLabel(ticket.source_module),
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    categoryLabel: formatTicketCategoryLabel(ticket.category),
    priority: ticket.priority,
    priorityLabel: formatTicketPriorityLabel(ticket.priority),
    status: ticket.status,
    statusLabel: formatTicketStatusLabel(ticket.status),
    requester,
    owner,
    escalatedTo,
    raisedFor,
    ccPeople,
    lastActivityAt: ticket.last_activity_at,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    resolvedAt: ticket.resolved_at || null,
    closedAt: ticket.closed_at || null,
    dueAt: enrichedTicket.due_at,
    lateAt: enrichedTicket.late_at,
    isLate: Boolean(enrichedTicket.is_late),
    isSlaBreached: Boolean(enrichedTicket.is_sla_breached),
    escalatedAt: ticket.escalated_at || null,
    permissions: getTicketAvailableActions(ticket, actor, participants),
  };
}

export async function loadVisibleTickets(actor, moduleKey = 'hrm') {
  const shouldFilterByModule = Boolean(moduleKey && moduleKey !== 'all');
  const normalizedModuleKey = shouldFilterByModule ? normalizeTicketModuleKey(moduleKey) : null;
  if (actor.isAdmin) {
    let query = adminClient
      .from(TICKETS_TABLE)
      .select('*')
      .order('last_activity_at', { ascending: false });
    if (normalizedModuleKey) {
      query = query.eq('source_module', normalizedModuleKey);
    }
    const result = await query;
    if (result.error) throw result.error;
    return (result.data || []).map(withDerivedTicketSla);
  }

  const scopedTicketQuery = (columnName) => {
    let query = adminClient.from(TICKETS_TABLE).select('*').eq(columnName, actor.authUserId);
    if (normalizedModuleKey) {
      query = query.eq('source_module', normalizedModuleKey);
    }
    return query;
  };

  const [requesterRows, ownerRows, escalatedRows, raisedForRows, participantRowsResult] = await Promise.all([
    scopedTicketQuery('requester_auth_user_id'),
    scopedTicketQuery('owner_auth_user_id'),
    scopedTicketQuery('current_escalated_auth_user_id'),
    scopedTicketQuery('raised_for_auth_user_id'),
    adminClient.from(TICKET_PARTICIPANTS_TABLE).select('ticket_id').eq('participant_auth_user_id', actor.authUserId),
  ]);

  const possibleError =
    requesterRows.error ||
    ownerRows.error ||
    escalatedRows.error ||
    raisedForRows.error ||
    participantRowsResult.error;
  if (possibleError) throw possibleError;

  const ticketMap = new Map();
  [requesterRows.data, ownerRows.data, escalatedRows.data, raisedForRows.data]
    .flat()
    .filter(Boolean)
    .forEach((ticket) => {
      ticketMap.set(ticket.id, withDerivedTicketSla(ticket));
    });

  const participantTicketIds = (participantRowsResult.data || []).map((row) => row.ticket_id).filter(Boolean);
  if (participantTicketIds.length > 0) {
    let participantQuery = adminClient.from(TICKETS_TABLE).select('*').in('id', participantTicketIds);
    if (normalizedModuleKey) {
      participantQuery = participantQuery.eq('source_module', normalizedModuleKey);
    }
    const participantTicketsResult = await participantQuery;
    if (participantTicketsResult.error) throw participantTicketsResult.error;
    (participantTicketsResult.data || []).forEach((ticket) => {
      ticketMap.set(ticket.id, withDerivedTicketSla(ticket));
    });
  }

  return Array.from(ticketMap.values()).sort((a, b) => {
    const aTime = new Date(a.last_activity_at || a.updated_at || a.created_at).getTime();
    const bTime = new Date(b.last_activity_at || b.updated_at || b.created_at).getTime();
    return bTime - aTime;
  });
}

export async function loadTicketParticipants(ticketIds = []) {
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) return {};

  const { data, error } = await adminClient.from(TICKET_PARTICIPANTS_TABLE).select('*').in('ticket_id', ticketIds);
  if (error) throw error;
  return groupByKey(data || [], 'ticket_id');
}

export async function loadTicketStatusHistory(ticketIds = []) {
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) return {};

  const { data, error } = await adminClient
    .from(TICKET_STATUS_HISTORY_TABLE)
    .select('*')
    .in('ticket_id', ticketIds)
    .order('step_no', { ascending: true });

  if (error) throw error;
  return groupByKey(data || [], 'ticket_id');
}

export async function loadTicketEscalations(ticketIds = []) {
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) return {};

  const { data, error } = await adminClient
    .from(TICKET_ESCALATIONS_TABLE)
    .select('*')
    .in('ticket_id', ticketIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return groupByKey(data || [], 'ticket_id');
}

export function mapTicketHistoryRows(historyRows = [], byAuthUserId) {
  return historyRows.map((row) => ({
    id: row.id,
    cycleNo: row.cycle_no,
    stepNo: row.step_no,
    stepKey: row.step_key,
    createdAt: row.created_at,
    actor: resolveTicketPerson(byAuthUserId, row.acted_by_auth_user_id),
  }));
}

export function mapTicketEscalationRows(escalationRows = [], byAuthUserId) {
  return escalationRows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    note: row.escalation_note || '',
    from: resolveTicketPerson(byAuthUserId, row.from_auth_user_id),
    to: resolveTicketPerson(byAuthUserId, row.to_auth_user_id),
    escalatedBy: resolveTicketPerson(byAuthUserId, row.escalated_by_auth_user_id),
  }));
}

export function buildTicketFlowCycles(historyRows = []) {
  const rows = [...historyRows].sort((a, b) => a.step_no - b.step_no);
  if (rows.length === 0) return [];

  const rowsByCycle = groupByKey(rows, 'cycle_no');
  return Object.keys(rowsByCycle)
    .map((value) => Number(value))
    .sort((a, b) => a - b)
    .map((cycleNo) => {
      const cycleRows = [...(rowsByCycle[cycleNo] || [])].sort((a, b) => a.step_no - b.step_no);
      const isFirstCycle = cycleNo === 1;
      const orderedKeys = [
        ...(isFirstCycle ? ['ticket_raised'] : []),
        'open',
        'in_progress',
        'waiting_on_requester',
        'resolved',
        'closed',
        ...(cycleRows.some((row) => row.step_key === 'reopened') ? ['reopened'] : []),
      ];

      let expectedStepNo = cycleRows[0]?.step_no || 1;
      const nodes = orderedKeys.map((key, index) => {
        const matchingRow = cycleRows.find((row) => row.step_key === key);
        if (matchingRow) {
          expectedStepNo = matchingRow.step_no;
        } else if (index > 0) {
          expectedStepNo += 1;
        }

        return {
          key,
          label: formatTicketStepLabel(key),
          stepNo: matchingRow ? matchingRow.step_no : expectedStepNo,
          createdAt: matchingRow?.created_at || null,
          completed: Boolean(matchingRow),
        };
      });

      return { cycleNo, nodes };
    });
}

export async function insertTicketHistoryEntry({
  ticketId,
  cycleNo,
  stepNo,
  stepKey,
  actor,
  createdAt,
}) {
  const payload = {
    ticket_id: ticketId,
    cycle_no: cycleNo,
    step_no: stepNo,
    step_key: stepKey,
    acted_by_auth_user_id: actor.authUserId,
    acted_by_employee_id: actor.employeeId || null,
    acted_by_role: actor.role,
    created_at: createdAt || new Date().toISOString(),
  };

  const { data, error } = await adminClient.from(TICKET_STATUS_HISTORY_TABLE).insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function insertTicketEscalationEntry({
  ticketId,
  fromPerson,
  toPerson,
  escalatedBy,
  note = '',
  createdAt,
}) {
  const payload = {
    ticket_id: ticketId,
    from_auth_user_id: fromPerson?.authUserId || null,
    from_employee_id: fromPerson?.employeeId || null,
    from_role: fromPerson?.role || null,
    to_auth_user_id: toPerson.authUserId,
    to_employee_id: toPerson.employeeId || null,
    to_role: toPerson.role,
    escalated_by_auth_user_id: escalatedBy.authUserId,
    escalated_by_employee_id: escalatedBy.employeeId || null,
    escalated_by_role: escalatedBy.role,
    escalation_note: note || null,
    created_at: createdAt || new Date().toISOString(),
  };

  const { data, error } = await adminClient.from(TICKET_ESCALATIONS_TABLE).insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function resolveInitialTicketOwner() {
  const supportAccount = await findDefaultSupportAccount();
  if (!supportAccount?.auth_user_id) {
    throw new Error('No active support account is configured. Add a support user first.');
  }

  return {
    authUserId: supportAccount.auth_user_id,
    employeeId: null,
    role: 'support',
    name: supportAccount.name || 'Support',
    email: supportAccount.email || '',
    employeeCode: '',
    avatarUrl: supportAccount.profile_picture_url || '',
    label: supportAccount.name || supportAccount.email || 'Support',
  };
}

export async function uploadTicketFiles({ ticketId, commentId = null, files = [], actor }) {
  if (!Array.isArray(files) || files.length === 0) return [];

  await ensureTicketFilesBucketAccessible();

  const uploadedPaths = [];
  const attachments = [];

  try {
    for (const file of files) {
      validateTicketUpload(file);
      const attachmentId = crypto.randomUUID();
      const safeName = sanitizeStorageFileName(file.name);
      const storagePath = `tickets/${ticketId}/${attachmentId}-${safeName}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await adminClient.storage.from(HRM_TICKET_FILES_BUCKET).upload(storagePath, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) throw new Error(uploadError.message || `Failed to upload ${file.name}`);

      uploadedPaths.push(storagePath);
      attachments.push({
        id: attachmentId,
        ticket_id: ticketId,
        comment_id: commentId,
        uploaded_by_auth_user_id: actor.authUserId,
        uploaded_by_employee_id: actor.employeeId || null,
        file_name: file.name,
        file_path: storagePath,
        mime_type: file.type || null,
        file_size: file.size || null,
      });
    }

    return attachments;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await adminClient.storage.from(HRM_TICKET_FILES_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export function withAttachmentUrls(attachments = []) {
  return attachments.map((attachment) => {
    const { data } = adminClient.storage.from(HRM_TICKET_FILES_BUCKET).getPublicUrl(attachment.file_path);
    return {
      id: attachment.id,
      ticketId: attachment.ticket_id,
      commentId: attachment.comment_id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      mimeType: attachment.mime_type,
      fileSize: attachment.file_size,
      createdAt: attachment.created_at,
      url: data?.publicUrl || '',
    };
  });
}

export function getVisibleTicketGroups(tickets, actor, participantsByTicketId, byAuthUserId) {
  const visibleSummaries = tickets.map((ticket) =>
    mapTicketSummary(ticket, participantsByTicketId[ticket.id] || [], byAuthUserId, actor)
  );

  const myTickets = visibleSummaries.filter(
    (ticket) => ticket.requester?.authUserId === actor.authUserId && !isTicketClosedStatus(ticket.status)
  );
  const assignedTickets = visibleSummaries.filter(
    (ticket) =>
      (ticket.escalatedTo?.authUserId === actor.authUserId || ticket.owner?.authUserId === actor.authUserId) &&
      !isTicketClosedStatus(ticket.status)
  );
  const closedTickets = visibleSummaries.filter((ticket) => isTicketClosedStatus(ticket.status));
  const adminOpenTickets = actor.isAdmin ? visibleSummaries.filter((ticket) => !isTicketClosedStatus(ticket.status)) : [];
  const allTickets = actor.isAdmin ? visibleSummaries : [];

  return {
    myTickets,
    assignedTickets,
    closedTickets,
    adminOpenTickets,
    allTickets,
  };
}

export function parseMultipartJson(formData, key = 'payload') {
  const rawValue = formData.get(key);
  if (typeof rawValue !== 'string' || !rawValue.trim()) return {};

  try {
    return JSON.parse(rawValue);
  } catch {
    throw new Error('Invalid request payload.');
  }
}

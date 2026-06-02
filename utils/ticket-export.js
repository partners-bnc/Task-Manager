import { adminClient } from '@/utils/supabase/admin';
import {
  TICKET_ATTACHMENTS_TABLE,
  TICKET_COMMENTS_TABLE,
  ensureActorInTicketDirectory,
  formatTicketCategoryLabel,
  formatTicketModuleLabel,
  formatTicketPriorityLabel,
  formatTicketStatusLabel,
  groupByKey,
  listTicketPeople,
  loadTicketEscalations,
  loadTicketParticipants,
  loadTicketStatusHistory,
  loadVisibleTickets,
  mapTicketSummary,
  normalizeTicketModuleKey,
  resolveTicketPerson,
  withDerivedTicketSla,
} from '@/utils/tickets';

function toCsvCell(value) {
  const normalized = String(value ?? '').replace(/"/g, '""');
  return `"${normalized}"`;
}

function formatExportDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

const UNRESOLVED_FILTER_VALUE = 'unresolved';
const CLOSED_TICKET_STATUSES = ['resolved', 'closed'];

function filterSummaries(tickets, search, status, category) {
  const searchValue = String(search || '').trim().toLowerCase();
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedCategory = String(category || '').trim().toLowerCase();

  return tickets.filter((ticket) => {
    const ticketStatus = String(ticket.status || '').trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      String(ticket.ticketNo || '').toLowerCase().includes(searchValue) ||
      String(ticket.subject || '').toLowerCase().includes(searchValue) ||
      String(ticket.description || '').toLowerCase().includes(searchValue);
    const matchesStatus =
      !normalizedStatus ||
      (normalizedStatus === UNRESOLVED_FILTER_VALUE
        ? !CLOSED_TICKET_STATUSES.includes(ticketStatus)
        : ticketStatus === normalizedStatus);
    const matchesCategory = !normalizedCategory || ticket.category === normalizedCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });
}

function personSummary(person) {
  if (!person) return '';
  return [person.name, person.employeeCode ? `(${person.employeeCode})` : '', person.email ? `<${person.email}>` : '']
    .filter(Boolean)
    .join(' ');
}

function buildCommentSummary(comments = [], attachmentsByCommentId = {}, byAuthUserId) {
  return comments
    .map((comment) => {
      const author = resolveTicketPerson(byAuthUserId, comment.author_auth_user_id);
      const attachmentLabel = (attachmentsByCommentId[comment.id] || [])
        .map((attachment) => attachment.file_name)
        .filter(Boolean)
        .join('; ');
      return [
        personSummary(author),
        formatExportDate(comment.created_at),
        comment.comment_body || '',
        attachmentLabel ? `Attachments: ${attachmentLabel}` : '',
      ]
        .filter(Boolean)
        .join(' | ');
    })
    .join(' || ');
}

function buildHeaderAttachmentSummary(attachments = []) {
  return attachments
    .filter((attachment) => !attachment.comment_id)
    .map((attachment) => attachment.file_name)
    .filter(Boolean)
    .join(' | ');
}

function buildHistorySummary(history = [], byAuthUserId) {
  return history
    .map((row) => {
      const actor = resolveTicketPerson(byAuthUserId, row.acted_by_auth_user_id);
      return [
        formatTicketStatusLabel(row.step_key),
        `Step ${row.step_no}`,
        `Cycle ${row.cycle_no}`,
        personSummary(actor),
        formatExportDate(row.created_at),
      ]
        .filter(Boolean)
        .join(' | ');
    })
    .join(' || ');
}

function buildEscalationSummary(escalations = [], byAuthUserId) {
  return escalations
    .map((row) => {
      const from = resolveTicketPerson(byAuthUserId, row.from_auth_user_id);
      const to = resolveTicketPerson(byAuthUserId, row.to_auth_user_id);
      const by = resolveTicketPerson(byAuthUserId, row.escalated_by_auth_user_id);
      return [
        personSummary(from) || 'Initial Owner',
        `to ${personSummary(to)}`,
        `by ${personSummary(by)}`,
        formatExportDate(row.created_at),
        row.escalation_note || '',
      ]
        .filter(Boolean)
        .join(' | ');
    })
    .join(' || ');
}

export async function buildTicketExportCsv({
  actor,
  moduleKey = 'all',
  search = '',
  status = '',
  category = '',
}) {
  const normalizedModuleKey = moduleKey === 'all' ? 'all' : normalizeTicketModuleKey(moduleKey);
  const directory = ensureActorInTicketDirectory(await listTicketPeople(), actor);
  const visibleTickets = await loadVisibleTickets(actor, normalizedModuleKey);
  const participantsByTicketId = await loadTicketParticipants(visibleTickets.map((ticket) => ticket.id));

  const summaries = visibleTickets.map((ticket) =>
    mapTicketSummary(withDerivedTicketSla(ticket), participantsByTicketId[ticket.id] || [], directory.byAuthUserId, actor)
  );
  const filteredSummaries = filterSummaries(summaries, search, status, category);
  const filteredIds = filteredSummaries.map((ticket) => ticket.id);

  const [commentsResult, attachmentsResult, historyByTicketId, escalationsByTicketId] = await Promise.all([
    filteredIds.length > 0
      ? adminClient.from(TICKET_COMMENTS_TABLE).select('*').in('ticket_id', filteredIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    filteredIds.length > 0
      ? adminClient.from(TICKET_ATTACHMENTS_TABLE).select('*').in('ticket_id', filteredIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    loadTicketStatusHistory(filteredIds),
    loadTicketEscalations(filteredIds),
  ]);

  if (commentsResult.error) throw commentsResult.error;
  if (attachmentsResult.error) throw attachmentsResult.error;

  const commentsByTicketId = groupByKey(commentsResult.data || [], 'ticket_id');
  const attachmentsByTicketId = groupByKey(attachmentsResult.data || [], 'ticket_id');
  const attachmentsByCommentId = groupByKey((attachmentsResult.data || []).filter((item) => item.comment_id), 'comment_id');

  const header = [
    'Ticket ID',
    'Ticket No',
    'Module',
    'Subject',
    'Description',
    'Category',
    'Priority',
    'Status',
    'Requester',
    'Owner',
    'Escalated To',
    'Raised For',
    'CC People',
    'Is Late',
    'Is SLA Breached',
    'Created At',
    'Updated At',
    'Last Activity At',
    'Late At',
    'Due At',
    'Resolved At',
    'Closed At',
    'Escalated At',
    'Header Attachments',
    'Comments',
    'Status History',
    'Escalation History',
  ];

  const rows = filteredSummaries.map((ticket) => {
    const sourceTicket = visibleTickets.find((item) => item.id === ticket.id) || {};
    return [
      ticket.id,
      ticket.ticketNo,
      formatTicketModuleLabel(ticket.moduleKey),
      ticket.subject,
      ticket.description,
      ticket.categoryLabel || formatTicketCategoryLabel(ticket.category),
      ticket.priorityLabel || formatTicketPriorityLabel(ticket.priority),
      ticket.statusLabel || formatTicketStatusLabel(ticket.status),
      personSummary(ticket.requester),
      personSummary(ticket.owner),
      personSummary(ticket.escalatedTo),
      personSummary(ticket.raisedFor),
      (ticket.ccPeople || []).map(personSummary).filter(Boolean).join(' | '),
      ticket.isLate ? 'Yes' : 'No',
      ticket.isSlaBreached ? 'Yes' : 'No',
      formatExportDate(ticket.createdAt),
      formatExportDate(ticket.updatedAt),
      formatExportDate(ticket.lastActivityAt),
      formatExportDate(ticket.lateAt),
      formatExportDate(ticket.dueAt),
      formatExportDate(ticket.resolvedAt || sourceTicket.resolved_at),
      formatExportDate(ticket.closedAt || sourceTicket.closed_at),
      formatExportDate(ticket.escalatedAt || sourceTicket.escalated_at),
      buildHeaderAttachmentSummary(attachmentsByTicketId[ticket.id] || []),
      buildCommentSummary(commentsByTicketId[ticket.id] || [], attachmentsByCommentId, directory.byAuthUserId),
      buildHistorySummary(historyByTicketId[ticket.id] || [], directory.byAuthUserId),
      buildEscalationSummary(escalationsByTicketId[ticket.id] || [], directory.byAuthUserId),
    ];
  });

  return `\uFEFF${[header, ...rows].map((row) => row.map((cell) => toCsvCell(cell)).join(',')).join('\n')}`;
}

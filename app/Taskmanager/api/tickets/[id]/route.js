import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { enqueueTicketEmail } from '@/utils/email-outbox';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  buildTicketFlowCycles,
  canActorUpdateTicket,
  canActorViewTicket,
  ensureActorInTicketDirectory,
  formatTicketCategoryLabel,
  formatTicketModuleLabel,
  formatTicketPriorityLabel,
  formatTicketStatusLabel,
  getTicketCategories,
  getCurrentCycleNumber,
  getTicketAvailableActions,
  getTicketCurrentStepNumber,
  getTicketNextAllowedStep,
  groupByKey,
  insertTicketEscalationEntry,
  insertTicketHistoryEntry,
  isMissingTicketSchemaError,
  listTicketPeople,
  loadTicketEscalations,
  loadTicketParticipants,
  loadTicketStatusHistory,
  mapTicketEscalationRows,
  mapTicketHistoryRows,
  normalizeTicketModuleKey,
  normalizeTicketStatus,
  requireTicketActor,
  resolveTicketPerson,
  TICKET_ATTACHMENTS_TABLE,
  TICKET_COMMENTS_TABLE,
  TICKET_PARTICIPANTS_TABLE,
  TICKETS_TABLE,
  withAttachmentUrls,
  withDerivedTicketSla,
} from '@/utils/tickets';

async function loadTicketBundle(ticketId) {
  const [ticketResult, participantsByTicketId, commentsResult, attachmentsResult, historyByTicketId, escalationsByTicketId] = await Promise.all([
    adminClient.from(TICKETS_TABLE).select('*').eq('id', ticketId).maybeSingle(),
    loadTicketParticipants([ticketId]),
    adminClient.from(TICKET_COMMENTS_TABLE).select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    adminClient.from(TICKET_ATTACHMENTS_TABLE).select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    loadTicketStatusHistory([ticketId]),
    loadTicketEscalations([ticketId]),
  ]);

  if (ticketResult.error) throw ticketResult.error;
  if (commentsResult.error) throw commentsResult.error;
  if (attachmentsResult.error) throw attachmentsResult.error;

  return {
    ticket: ticketResult.data || null,
    participants: participantsByTicketId[ticketId] || [],
    comments: commentsResult.data || [],
    attachments: attachmentsResult.data || [],
    history: historyByTicketId[ticketId] || [],
    escalations: escalationsByTicketId[ticketId] || [],
  };
}

function buildTicketDetail(ticket, participants, comments, attachments, history, escalations, actor, byAuthUserId) {
  const enrichedTicket = withDerivedTicketSla(ticket);
  const requester = resolveTicketPerson(byAuthUserId, ticket.requester_auth_user_id);
  const owner = resolveTicketPerson(byAuthUserId, ticket.owner_auth_user_id);
  const raisedFor = resolveTicketPerson(byAuthUserId, ticket.raised_for_auth_user_id);
  const escalatedTo = resolveTicketPerson(byAuthUserId, ticket.current_escalated_auth_user_id);
  const ccPeople = participants
    .filter((participant) => participant.participant_type === 'cc')
    .map((participant) => resolveTicketPerson(byAuthUserId, participant.participant_auth_user_id))
    .filter(Boolean);
  const mappedAttachments = withAttachmentUrls(attachments);
  const attachmentsByCommentId = groupByKey(mappedAttachments.filter((item) => item.commentId), 'commentId');
  const mappedHistory = mapTicketHistoryRows(history, byAuthUserId);
  const mappedEscalations = mapTicketEscalationRows(escalations, byAuthUserId);

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
    resolvedAt: ticket.resolved_at,
    closedAt: ticket.closed_at,
    dueAt: enrichedTicket.due_at,
    lateAt: enrichedTicket.late_at,
    isLate: Boolean(enrichedTicket.is_late),
    isSlaBreached: Boolean(enrichedTicket.is_sla_breached),
    escalatedAt: ticket.escalated_at,
    permissions: getTicketAvailableActions(ticket, actor, participants),
    attachments: mappedAttachments.filter((item) => !item.commentId),
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.comment_body,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author: resolveTicketPerson(byAuthUserId, comment.author_auth_user_id),
      attachments: attachmentsByCommentId[comment.id] || [],
    })),
    statusHistory: mappedHistory,
    escalations: mappedEscalations,
    flowCycles: buildTicketFlowCycles(history),
    nextAllowedStep: getTicketNextAllowedStep(ticket, actor),
    currentStepNumber: getTicketCurrentStepNumber(history),
  };
}

function buildUpdatePayload(ticket, body, actor, reassignedOwner, escalatedTo, history) {
  const nextPayload = {};
  const nextStatus = typeof body.status === 'string' ? normalizeTicketStatus(body.status) : '';
  const nextPriority = typeof body.priority === 'string' ? String(body.priority).trim().toLowerCase() : '';
  const nextCategory = typeof body.category === 'string' ? String(body.category).trim().toLowerCase() : '';
  const escalationNote = typeof body.escalationNote === 'string' ? body.escalationNote.trim() : '';

  const nextCcAuthIds = Array.isArray(body.ccAuthUserIds) ? body.ccAuthUserIds : null;
  if (nextCcAuthIds !== null) {
    if (!actor.isAdmin) {
      throw new Error('Only admins can edit the CC list.');
    }
    nextPayload.last_activity_at = new Date().toISOString();
  }

  if (nextStatus) {
    if (!TICKET_STATUSES.includes(nextStatus)) {
      throw new Error('Ticket status is invalid.');
    }
    if (!canActorUpdateTicket(ticket, actor, nextStatus)) {
      throw new Error('You are not allowed to change the ticket status.');
    }

    const expectedNextStep = getTicketNextAllowedStep(ticket, actor);
    if (!expectedNextStep || nextStatus !== expectedNextStep) {
      throw new Error(`Next allowed status is ${formatTicketStatusLabel(expectedNextStep || ticket.status)}.`);
    }

    const now = new Date().toISOString();
    nextPayload.status = nextStatus;
    nextPayload.last_activity_at = now;

    if (nextStatus === 'resolved') {
      nextPayload.resolved_at = now;
    }
    if (nextStatus === 'closed') {
      nextPayload.closed_at = now;
      if (!ticket.resolved_at) {
        nextPayload.resolved_at = now;
      }
      nextPayload.current_escalated_auth_user_id = null;
      nextPayload.current_escalated_employee_id = null;
      nextPayload.current_escalated_role = null;
      nextPayload.escalated_at = null;
    }
    if (!['resolved', 'closed'].includes(nextStatus)) {
      nextPayload.closed_at = null;
    }

    return {
      ticketUpdate: nextPayload,
      historyEntry: {
        cycleNo: getCurrentCycleNumber(history),
        stepNo: getTicketCurrentStepNumber(history) + 1,
        stepKey: nextStatus,
        createdAt: now,
      },
      escalationEntry: null,
    };
  }

  if (nextPriority) {
    if (!actor.isAdmin) {
      throw new Error('Only admins can change ticket priority.');
    }
    if (!TICKET_PRIORITIES.includes(nextPriority)) {
      throw new Error('Ticket priority is invalid.');
    }
    nextPayload.priority = nextPriority;
  }

  if (nextCategory) {
    if (!actor.isAdmin) {
      throw new Error('Only admins can change ticket category.');
    }
    if (!getTicketCategories('all').includes(nextCategory)) {
      throw new Error('Ticket category is invalid.');
    }
    nextPayload.category = nextCategory;
  }

  if (reassignedOwner) {
    if (!actor.isAdmin) {
      throw new Error('Only admins can reassign tickets.');
    }
    nextPayload.owner_auth_user_id = reassignedOwner.authUserId;
    nextPayload.owner_employee_id = reassignedOwner.employeeId || null;
    nextPayload.owner_role = reassignedOwner.role;
  }

  if (body.escalateToAuthUserId) {
    const canEscalate =
      ticket.current_escalated_auth_user_id === actor.authUserId ||
      (!ticket.current_escalated_auth_user_id && ticket.owner_auth_user_id === actor.authUserId);
    if (!canEscalate) {
      throw new Error('Only the current raised-to handler can escalate tickets.');
    }
    if (!escalatedTo) {
      throw new Error('Selected escalation target is invalid.');
    }
    nextPayload.current_escalated_auth_user_id = escalatedTo.authUserId;
    nextPayload.current_escalated_employee_id = escalatedTo.employeeId || null;
    nextPayload.current_escalated_role = escalatedTo.role;
    nextPayload.escalated_at = new Date().toISOString();
    return {
      ticketUpdate: {
        ...nextPayload,
        last_activity_at: nextPayload.escalated_at,
      },
      historyEntry: null,
      escalationEntry: {
        note: escalationNote,
        createdAt: nextPayload.escalated_at,
      },
    };
  }

  if (Object.keys(nextPayload).length === 0) {
    throw new Error('No valid ticket changes were provided.');
  }

  nextPayload.last_activity_at = new Date().toISOString();
  return { ticketUpdate: nextPayload, historyEntry: null, escalationEntry: null };
}

export async function GET(_request, context) {
  try {
    const auth = await requireTicketActor();
    if (auth.error) return auth.error;

    const { actor } = auth;
    const resolvedParams = await context?.params;
    const ticketId = typeof resolvedParams?.id === 'string' ? resolvedParams.id.trim() : '';
    if (!ticketId) {
      return NextResponse.json({ error: 'Invalid ticket id.' }, { status: 400 });
    }

    const directory = ensureActorInTicketDirectory(await listTicketPeople(), actor);
    const { ticket, participants, comments, attachments, history, escalations } = await loadTicketBundle(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    if (!canActorViewTicket(ticket, actor, participants)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(
      {
        ticket: buildTicketDetail(ticket, participants, comments, attachments, history, escalations, actor, directory.byAuthUserId),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading task manager ticket detail:', error);
    if (isMissingTicketSchemaError(error)) {
      return NextResponse.json({ error: 'Ticket database setup is pending. Apply the latest migration first.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Failed to load ticket detail' }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const auth = await requireTicketActor();
    if (auth.error) return auth.error;

    const { actor } = auth;
    const resolvedParams = await context?.params;
    const ticketId = typeof resolvedParams?.id === 'string' ? resolvedParams.id.trim() : '';
    if (!ticketId) {
      return NextResponse.json({ error: 'Invalid ticket id.' }, { status: 400 });
    }

    const body = await request.json();
    const directory = ensureActorInTicketDirectory(await listTicketPeople(), actor);
    const { ticket, participants, history } = await loadTicketBundle(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    if (!canActorViewTicket(ticket, actor, participants)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ownerAuthUserId = typeof body.ownerAuthUserId === 'string' ? body.ownerAuthUserId.trim() : '';
    const escalateToAuthUserId = typeof body.escalateToAuthUserId === 'string' ? body.escalateToAuthUserId.trim() : '';
    const reassignedOwner = ownerAuthUserId ? directory.byAuthUserId.get(ownerAuthUserId) : null;
    const escalatedTo = escalateToAuthUserId ? directory.byAuthUserId.get(escalateToAuthUserId) : null;
    if ((ownerAuthUserId && !reassignedOwner) || (escalateToAuthUserId && !escalatedTo)) {
      return NextResponse.json({ error: 'Selected owner is invalid.' }, { status: 400 });
    }

    let updatePlan;
    try {
      updatePlan = buildUpdatePayload(ticket, body, actor, reassignedOwner, escalatedTo, history);
    } catch (error) {
      return NextResponse.json({ error: error.message || 'Invalid ticket update.' }, { status: 400 });
    }

    const { data: updatedTicket, error: updateError } = await adminClient
      .from(TICKETS_TABLE)
      .update(updatePlan.ticketUpdate)
      .eq('id', ticketId)
      .select('*')
      .single();

    if (updateError || !updatedTicket) {
      return NextResponse.json({ error: updateError?.message || 'Failed to update ticket.' }, { status: 500 });
    }

    if (updatePlan.historyEntry) {
      await insertTicketHistoryEntry({
        ticketId,
        actor,
        ...updatePlan.historyEntry,
      });
    }

    if (updatePlan.escalationEntry && escalatedTo) {
      const fromPerson =
        directory.byAuthUserId.get(ticket.current_escalated_auth_user_id) ||
        directory.byAuthUserId.get(ticket.owner_auth_user_id) ||
        null;
      await insertTicketEscalationEntry({
        ticketId,
        fromPerson,
        toPerson: escalatedTo,
        escalatedBy: actor,
        note: updatePlan.escalationEntry.note,
        createdAt: updatePlan.escalationEntry.createdAt,
      });
    }

    if (reassignedOwner) {
      await adminClient.from(TICKET_PARTICIPANTS_TABLE).delete().eq('ticket_id', ticketId).eq('participant_type', 'owner');
      const { error: participantError } = await adminClient.from(TICKET_PARTICIPANTS_TABLE).insert({
        ticket_id: ticketId,
        participant_type: 'owner',
        participant_auth_user_id: reassignedOwner.authUserId,
        participant_employee_id: reassignedOwner.employeeId || null,
        participant_role: reassignedOwner.role,
      });
      if (participantError) {
        return NextResponse.json({ error: participantError.message || 'Ticket owner changed, but participant sync failed.' }, { status: 500 });
      }
    }

    let newCcAuthIds = [];
    if (body.ccAuthUserIds !== undefined && Array.isArray(body.ccAuthUserIds)) {
      const oldCcAuthIds = participants
        .filter((p) => p.participant_type === 'cc')
        .map((p) => p.participant_auth_user_id);
      
      const uniqueCcAuthIds = Array.from(new Set(body.ccAuthUserIds.map((v) => String(v || '').trim()).filter(Boolean)));
      newCcAuthIds = uniqueCcAuthIds.filter((id) => !oldCcAuthIds.includes(id));

      await adminClient.from(TICKET_PARTICIPANTS_TABLE).delete().eq('ticket_id', ticketId).eq('participant_type', 'cc');
      if (uniqueCcAuthIds.length > 0) {
        const participantRows = uniqueCcAuthIds.map((authUserId) => {
          const person = directory.byAuthUserId.get(authUserId);
          return {
            ticket_id: ticketId,
            participant_type: 'cc',
            participant_auth_user_id: person.authUserId,
            participant_employee_id: person.employeeId || null,
            participant_role: person.role,
          };
        });
        const { error: participantError } = await adminClient.from(TICKET_PARTICIPANTS_TABLE).insert(participantRows);
        if (participantError) {
          return NextResponse.json({ error: participantError.message || 'Failed to update CC participants.' }, { status: 500 });
        }
      }
    }

    try {
      const latestTicket = updatedTicket || ticket;

      // A. If owner reassigned
      if (reassignedOwner) {
        await enqueueTicketEmail({
          recipientEmail: reassignedOwner.email,
          ticket: latestTicket,
          recipientName: reassignedOwner.name,
          role: 'handler',
          action: 'reassigned',
          actorName: actor.name,
        });

        const { data: latestParticipants } = await adminClient
          .from(TICKET_PARTICIPANTS_TABLE)
          .select('*')
          .eq('ticket_id', ticketId);
        const currentCcPeople = (latestParticipants || [])
          .filter((p) => p.participant_type === 'cc')
          .map((p) => directory.byAuthUserId.get(p.participant_auth_user_id))
          .filter(Boolean);

        for (const ccPerson of currentCcPeople) {
          await enqueueTicketEmail({
            recipientEmail: ccPerson.email,
            ticket: latestTicket,
            recipientName: ccPerson.name,
            role: 'cc',
            action: 'reassigned',
            actorName: actor.name,
          });
        }
      }

      // B. If escalated
      if (escalatedTo) {
        await enqueueTicketEmail({
          recipientEmail: escalatedTo.email,
          ticket: latestTicket,
          recipientName: escalatedTo.name,
          role: 'handler',
          action: 'reassigned',
          actorName: actor.name,
        });

        const { data: latestParticipants } = await adminClient
          .from(TICKET_PARTICIPANTS_TABLE)
          .select('*')
          .eq('ticket_id', ticketId);
        const currentCcPeople = (latestParticipants || [])
          .filter((p) => p.participant_type === 'cc')
          .map((p) => directory.byAuthUserId.get(p.participant_auth_user_id))
          .filter(Boolean);

        for (const ccPerson of currentCcPeople) {
          await enqueueTicketEmail({
            recipientEmail: ccPerson.email,
            ticket: latestTicket,
            recipientName: ccPerson.name,
            role: 'cc',
            action: 'reassigned',
            actorName: actor.name,
          });
        }
      }

      // C. If new CC people added (and not already covered by owner reassignment / escalation emails)
      if (!reassignedOwner && !escalatedTo && newCcAuthIds.length > 0) {
        for (const ccAuthId of newCcAuthIds) {
          const ccPerson = directory.byAuthUserId.get(ccAuthId);
          if (ccPerson) {
            await enqueueTicketEmail({
              recipientEmail: ccPerson.email,
              ticket: latestTicket,
              recipientName: ccPerson.name,
              role: 'cc',
              action: 'reassigned',
              actorName: actor.name,
            });
          }
        }
      }
    } catch (emailErr) {
      console.error('Failed to process ticket notifications:', emailErr);
    }

    return NextResponse.json({ ticket: updatedTicket }, { status: 200 });
  } catch (error) {
    console.error('Error updating task manager ticket:', error);
    if (isMissingTicketSchemaError(error)) {
      return NextResponse.json({ error: 'Ticket database setup is pending. Apply the latest migration first.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update ticket' }, { status: 500 });
  }
}
